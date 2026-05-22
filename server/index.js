import { WebSocketServer } from "ws"

const PORT = Number(process.env.WS_PORT) || 3001
const wss = new WebSocketServer({ port: PORT })

const USERS = ["Alianza", "Espias", "Imperio", "Legion", "Luna", "Nasa", "Sol", "Iglecia"]

const rooms = new Map()

function generateId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function getAvailableUser(players) {
  const taken = players.map(p => p.user)
  return USERS.find(u => !taken.includes(u)) || USERS[0]
}

wss.on("connection", (ws) => {
  const clientId = generateId()
  let playerName = "Desconocido"
  let roomId = null

  ws.send(JSON.stringify({ type: "connected", clientId }))

  ws.on("message", (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    switch (msg.type) {
      case "create_room": {
        const id = generateId()
        roomId = id
        playerName = msg.playerName || "Anfitrión"

        const preferredUser = (msg.preferredUser && USERS.includes(msg.preferredUser)) ? msg.preferredUser : USERS[0]
        const room = {
          id,
          hostId: clientId,
          players: [{ id: clientId, name: playerName, user: preferredUser }],
        }
        rooms.set(id, room)

        ws.send(JSON.stringify({
          type: "room_created",
          roomId: id,
          players: room.players,
        }))
        break
      }

      case "join_room": {
        const room = rooms.get(msg.roomId)
        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "Sala no encontrada" }))
          return
        }
        if (room.players.length >= 8) {
          ws.send(JSON.stringify({ type: "error", message: "Sala llena" }))
          return
        }

        roomId = msg.roomId
        playerName = msg.playerName || "Jugador"

        const preferred = msg.preferredUser
        const isFree = preferred && USERS.includes(preferred) && !room.players.some(p => p.user === preferred)
        const newUser = isFree ? preferred : getAvailableUser(room.players)
        room.players.push({ id: clientId, name: playerName, user: newUser })

        ws.send(JSON.stringify({
          type: "room_joined",
          roomId: msg.roomId,
          players: room.players,
          hostId: room.hostId,
        }))

        for (const p of room.players) {
          if (p.id === clientId) continue
          const clientWs = [...wss.clients].find((c) => c._clientId === p.id)
          if (clientWs?.readyState === 1) {
            clientWs.send(JSON.stringify({
              type: "player_joined",
              player: { id: clientId, name: playerName },
              players: room.players,
            }))
          }
        }
        break
      }

      case "list_rooms": {
        const list = [...rooms.values()]
          .filter((r) => r.players.length < 8)
          .map((r) => ({
            roomId: r.id,
            hostName: r.players.find((p) => p.id === r.hostId)?.name || "Anfitrión",
            playerCount: r.players.length,
          }))
        ws.send(JSON.stringify({ type: "room_list", rooms: list }))
        break
      }

      case "start_game": {
        const room = rooms.get(roomId)
        if (!room || room.hostId !== clientId) return

        for (const p of room.players) {
          const playerIndex = room.players.indexOf(p)
          const clientWs = [...wss.clients].find((c) => c._clientId === p.id)
          if (clientWs?.readyState === 1) {
            clientWs.send(JSON.stringify({
              type: "game_started",
              playerConfigs: msg.playerConfigs,
              hostId: room.hostId,
              yourPlayerId: p.id,
              playerIndex,
            }))
          }
        }
        break
      }

      case "game_action": {
        const room = rooms.get(roomId)
        if (!room) return

        const hostWs = [...wss.clients].find((c) => c._clientId === room.hostId)
        if (hostWs?.readyState === 1) {
          const senderIndex = room.players.findIndex(p => p.id === clientId)
          hostWs.send(JSON.stringify({
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

        for (const p of room.players) {
          if (p.id === room.hostId) continue
          const clientWs = [...wss.clients].find((c) => c._clientId === p.id)
          if (clientWs?.readyState === 1) {
            clientWs.send(JSON.stringify({
              type: "game_state_update",
              state: msg.state,
            }))
          }
        }
        break
      }

      case "leave_room": {
        const room = rooms.get(roomId)
        if (!room) return

        room.players = room.players.filter((p) => p.id !== clientId)

        if (room.players.length === 0) {
          rooms.delete(roomId)
          roomId = null
          return
        }

        for (const p of room.players) {
          const clientWs = [...wss.clients].find((c) => c._clientId === p.id)
          if (clientWs?.readyState === 1) {
            clientWs.send(JSON.stringify({
              type: "player_left",
              playerId: clientId,
              players: room.players,
            }))
          }
        }

        if (clientId === room.hostId) {
          room.hostId = room.players[0].id
          const newHostWs = [...wss.clients].find((c) => c._clientId === room.hostId)
          if (newHostWs?.readyState === 1) {
            newHostWs.send(JSON.stringify({ type: "new_host" }))
          }
        }
        break
      }

      case "update_player_user": {
        const room = rooms.get(roomId)
        if (!room) return
        const targetPlayer = room.players.find(p => p.id === msg.playerId)
        if (!targetPlayer) return
        if (clientId !== room.hostId && clientId !== msg.playerId) return
        if (!USERS.includes(msg.user)) return
        const alreadyTaken = room.players.some(p => p.id !== msg.playerId && p.user === msg.user)
        if (alreadyTaken) return
        targetPlayer.user = msg.user
        for (const p of room.players) {
          const clientWs = [...wss.clients].find((c) => c._clientId === p.id)
          if (clientWs?.readyState === 1) {
            clientWs.send(JSON.stringify({
              type: "players_updated",
              players: room.players,
            }))
          }
        }
        break
      }
    }
  })

  ws.on("close", () => {
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    const disconnectedIndex = room.players.findIndex(p => p.id === clientId)
    room.players = room.players.filter((p) => p.id !== clientId)

    if (room.players.length === 0) {
      rooms.delete(roomId)
      return
    }

    for (const p of room.players) {
      const clientWs = [...wss.clients].find((c) => c._clientId === p.id)
      if (clientWs?.readyState === 1) {
        clientWs.send(JSON.stringify({
          type: "player_disconnected",
          playerIndex: disconnectedIndex,
          players: room.players,
        }))
      }
    }

    if (clientId === room.hostId) {
      room.hostId = room.players[0].id
      const newHostWs = [...wss.clients].find((c) => c._clientId === room.hostId)
      if (newHostWs?.readyState === 1) {
        newHostWs.send(JSON.stringify({ type: "new_host" }))
      }
    }
  })

  ws._clientId = clientId
})

console.log(`🌐 Servidor WebSocket corriendo en puerto ${PORT}`)
