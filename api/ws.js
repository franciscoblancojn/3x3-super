export const config = {
  runtime: 'edge',
}

const USERS = ["Alianza", "Espias", "Imperio", "Legion", "Luna", "Nasa", "Sol", "Iglecia"]

const rooms = new Map()
const disconnectTimeouts = new Map()

const DISCONNECT_TIMEOUT = 120_000

function generateId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function getAvailableUser(players) {
  const taken = players.map(p => p.user)
  return USERS.find(u => !taken.includes(u)) || USERS[0]
}

function broadcast(room, msg, excludeSessionId = null) {
  for (const p of room.players) {
    if (!p.ws || p.disconnected) continue
    if (excludeSessionId && p.sessionId === excludeSessionId) continue
    if (p.ws.readyState === 1) {
      p.ws.send(JSON.stringify(msg))
    }
  }
}

function clearDisconnectTimeout(sessionId) {
  const t = disconnectTimeouts.get(sessionId)
  if (t) {
    clearTimeout(t)
    disconnectTimeouts.delete(sessionId)
  }
}

function removePlayerFromRoom(room, sessionId, notifyHost = true) {
  const idx = room.players.findIndex(p => p.sessionId === sessionId)
  if (idx === -1) return null
  const removed = room.players[idx]
  room.players.splice(idx, 1)

  if (notifyHost && room.lastGameState) {
    broadcast(room, {
      type: "player_left",
      sessionId,
      playerIndex: idx,
      players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
    })
  }

  if (room.players.length === 0) {
    rooms.delete(room.id)
    return removed
  }

  if (sessionId === room.hostSessionId) {
    room.hostSessionId = room.players[0].sessionId
    broadcast(room, { type: "new_host", hostSessionId: room.hostSessionId })
  }

  return removed
}

export default async (request) => {
  const upgradeHeader = request.headers.get('upgrade')
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  const pair = new WebSocketPair()
  const [client, server] = Object.values(pair)

  server.accept()

  const clientId = generateId()
  let playerName = "Desconocido"
  let roomId = null
  let sessionId = null

  server.send(JSON.stringify({ type: "connected", clientId }))

  server.addEventListener("message", (event) => {
    let msg
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }

    switch (msg.type) {
      case "create_room": {
        sessionId = msg.sessionId || generateId()
        const id = generateId()
        roomId = id
        playerName = msg.playerName || "Anfitrión"

        const preferredUser = (msg.preferredUser && USERS.includes(msg.preferredUser)) ? msg.preferredUser : USERS[0]
        const room = {
          id,
          hostSessionId: sessionId,
          gameStarted: false,
          lastGameState: null,
          players: [{ sessionId, id: clientId, ws: server, name: playerName, user: preferredUser, disconnected: false }],
        }
        rooms.set(id, room)

        server.send(JSON.stringify({
          type: "room_created",
          roomId: id,
          players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
        }))
        break
      }

      case "join_room": {
        const room = rooms.get(msg.roomId)
        if (!room) {
          server.send(JSON.stringify({ type: "error", message: "Sala no encontrada" }))
          return
        }
        if (room.players.length >= 8) {
          server.send(JSON.stringify({ type: "error", message: "Sala llena" }))
          return
        }

        sessionId = msg.sessionId || generateId()
        roomId = msg.roomId
        playerName = msg.playerName || "Jugador"

        const preferred = msg.preferredUser
        const isFree = preferred && USERS.includes(preferred) && !room.players.some(p => p.user === preferred)
        const newUser = isFree ? preferred : getAvailableUser(room.players)
        room.players.push({ sessionId, id: clientId, ws: server, name: playerName, user: newUser, disconnected: false })

        server.send(JSON.stringify({
          type: "room_joined",
          roomId: msg.roomId,
          players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
          hostSessionId: room.hostSessionId,
        }))

        broadcast(room, {
          type: "player_joined",
          player: { sessionId, name: playerName },
          players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
        }, sessionId)
        break
      }

      case "reconnect": {
        const room = rooms.get(msg.roomId)
        if (!room) {
          server.send(JSON.stringify({ type: "error", message: "Sala no encontrada" }))
          return
        }

        const player = room.players.find(p => p.sessionId === msg.sessionId)
        if (!player) {
          server.send(JSON.stringify({ type: "error", message: "Jugador no encontrado en la sala" }))
          return
        }

        sessionId = player.sessionId
        roomId = room.id
        playerName = player.name

        clearDisconnectTimeout(sessionId)

        player.ws = server
        player.id = clientId
        player.disconnected = false

        const playerIndex = room.players.indexOf(player)

        server.send(JSON.stringify({
          type: "reconnected",
          roomId: room.id,
          hostSessionId: room.hostSessionId,
          playerIndex,
          isHost: room.hostSessionId === sessionId,
          gameStarted: room.gameStarted,
          players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
        }))

        if (room.lastGameState) {
          server.send(JSON.stringify({ type: "game_state_update", state: room.lastGameState }))
        }

        broadcast(room, {
          type: "player_reconnected",
          sessionId,
          name: playerName,
        }, sessionId)
        break
      }

      case "list_rooms": {
        const list = [...rooms.values()]
          .filter((r) => r.players.length < 8 && !r.gameStarted)
          .map((r) => ({
            roomId: r.id,
            hostName: r.players.find((p) => p.sessionId === r.hostSessionId)?.name || "Anfitrión",
            playerCount: r.players.filter(p => !p.disconnected).length,
          }))
        server.send(JSON.stringify({ type: "room_list", rooms: list }))
        break
      }

      case "start_game": {
        const room = rooms.get(roomId)
        if (!room || room.hostSessionId !== sessionId) return

        room.gameStarted = true

        for (let i = 0; i < room.players.length; i++) {
          const p = room.players[i]
          if (p.ws?.readyState === 1) {
            p.ws.send(JSON.stringify({
              type: "game_started",
              playerConfigs: msg.playerConfigs,
              hostSessionId: room.hostSessionId,
              yourSessionId: p.sessionId,
              playerIndex: i,
            }))
          }
        }
        break
      }

      case "game_action": {
        const room = rooms.get(roomId)
        if (!room) return

        const hostPlayer = room.players.find(p => p.sessionId === room.hostSessionId)
        if (hostPlayer && hostPlayer.ws?.readyState === 1) {
          const senderIndex = room.players.findIndex(p => p.sessionId === sessionId)
          hostPlayer.ws.send(JSON.stringify({
            type: "game_action",
            action: msg.action,
            playerIndex: senderIndex,
          }))
        }
        break
      }

      case "game_state_update": {
        const room = rooms.get(roomId)
        if (!room) return

        room.lastGameState = msg.state

        for (const p of room.players) {
          if (p.sessionId === room.hostSessionId) continue
          if (!p.ws || p.disconnected) continue
          if (p.ws.readyState === 1) {
            p.ws.send(JSON.stringify({
              type: "game_state_update",
              state: msg.state,
            }))
          }
        }
        break
      }

      case "update_player_user": {
        const room = rooms.get(roomId)
        if (!room) return
        const targetPlayer = room.players.find(p => p.sessionId === msg.playerId)
        if (!targetPlayer) return
        if (sessionId !== room.hostSessionId && sessionId !== msg.playerId) return
        if (!USERS.includes(msg.user)) return
        const alreadyTaken = room.players.some(p => p.sessionId !== msg.playerId && p.user === msg.user)
        if (alreadyTaken) return
        targetPlayer.user = msg.user
        broadcast(room, {
          type: "players_updated",
          players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
        })
        break
      }

      case "leave_room": {
        const room = rooms.get(roomId)
        if (!room) return

        if (sessionId === room.hostSessionId && room.gameStarted) {
          broadcast(room, { type: "room_closed" })
          for (const p of room.players) {
            try { p.ws?.close?.() } catch {}
          }
          rooms.delete(roomId)
          roomId = null
          return
        }

        const removed = removePlayerFromRoom(room, sessionId, room.gameStarted)
        if (removed && !room.gameStarted) {
          broadcast(room, {
            type: "player_left",
            sessionId,
            players: room.players.map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
          }, sessionId)
        }

        roomId = null
        break
      }
    }
  })

  server.addEventListener("close", () => {
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    const player = room.players.find(p => p.id === clientId)
    if (!player) return

    player.disconnected = true
    player.ws = null
    player.id = null

    const playerIndex = room.players.indexOf(player)

    if (room.gameStarted) {
      broadcast(room, {
        type: "player_disconnected",
        sessionId: player.sessionId,
        playerIndex,
        name: player.name,
      })
    } else {
      broadcast(room, {
        type: "player_left",
        sessionId: player.sessionId,
        players: room.players.filter(p => !p.disconnected).map(p => ({ sessionId: p.sessionId, name: p.name, user: p.user })),
      })
    }

    const timeout = setTimeout(() => {
      const r = rooms.get(roomId)
      if (!r) return
      const p = r.players.find(p => p.sessionId === player.sessionId)
      if (!p || !p.disconnected) return

      if (player.sessionId === room.hostSessionId) {
        broadcast(r, { type: "room_closed", reason: "El anfitrión no se reconectó" })
        for (const pl of r.players) {
          try { pl.ws?.close?.() } catch {}
        }
        rooms.delete(roomId)
      } else {
        removePlayerFromRoom(r, player.sessionId, r.gameStarted)
      }
      disconnectTimeouts.delete(player.sessionId)
    }, DISCONNECT_TIMEOUT)

    disconnectTimeouts.set(player.sessionId, timeout)
  })

  return new Response(null, { status: 101, webSocket: client })
}
