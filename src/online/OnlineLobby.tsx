import { useEffect, useState, useRef } from "react"
import { useOnline } from "./OnlineContext"
import { Ficha } from "../components/Ficha"
import { FICHAS_SIN_EFECTO } from "../data/fichas"
import { IUsers } from "../interface/users"
import "./online.css"

type LobbyScreen =
  | { type: "menu" }
  | { type: "join_list" }
  | { type: "in_room"; players: { sessionId: string; name: string; user: string }[]; roomId: string; isHost: boolean }

const ALL_USERS = Object.values(IUsers)
const LS_KEY = "game_preferred_user"

function getSavedUser(): string | null {
  try {
    const v = localStorage.getItem(LS_KEY)
    return v && ALL_USERS.includes(v as IUsers) ? v : null
  } catch {
    return null
  }
}

function saveUser(user: string) {
  try {
    localStorage.setItem(LS_KEY, user)
  } catch {
    // ignore
  }
}

function normalizePlayers(players: { sessionId: string; name: string; user?: string }[]): { sessionId: string; name: string; user: string }[] {
  return players.map((p, i) => ({
    ...p,
    user: (p.user && ALL_USERS.includes(p.user as IUsers)) ? p.user : ALL_USERS[i % ALL_USERS.length],
  }))
}

export function OnlineLobby({
  playerName,
  onBack,
  onGameStarted,
}: {
  playerName: string
  onBack: () => void
  onGameStarted: (isHost: boolean, configs?: { name: string; user: string }[], playerIndex?: number) => void
}) {
  const { connected, send, subscribe, sessionId, saveReconnect, clearReconnect } = useOnline()
  const [screen, setScreen] = useState<LobbyScreen>({ type: "menu" })
  const [rooms, setRooms] = useState<{ roomId: string; hostName: string; playerCount: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const roomIdRef = useRef("")

  const onGameStartedRef = useRef(onGameStarted)
  useEffect(() => {
    onGameStartedRef.current = onGameStarted
  })

  // Keep roomIdRef updated whenever screen changes
  useEffect(() => {
    if (screen.type === "in_room") {
      roomIdRef.current = screen.roomId
    }
  }, [screen])

  useEffect(() => {
    return subscribe((msg) => {
      switch (msg.type) {
        case "room_created": {
          setScreen({
            type: "in_room",
            players: normalizePlayers(msg.players as { sessionId: string; name: string; user?: string }[]),
            roomId: msg.roomId as string,
            isHost: true,
          })
          break
        }
        case "room_joined": {
          setScreen({
            type: "in_room",
            players: normalizePlayers(msg.players as { sessionId: string; name: string; user?: string }[]),
            roomId: msg.roomId as string,
            isHost: false,
          })
          break
        }
        case "room_list": {
          setRooms((msg.rooms || []) as { roomId: string; hostName: string; playerCount: number }[])
          break
        }
        case "player_joined": {
          setScreen((prev) => {
            if (prev.type !== "in_room") return prev
            const incoming = (msg.players as { sessionId: string; name: string; user?: string }[])
            const merged = incoming.map((p, i) => {
              const existing = prev.players.find(ep => ep.sessionId === p.sessionId)
              return {
                ...p,
                user: existing?.user ?? ((p.user && ALL_USERS.includes(p.user as IUsers)) ? p.user : ALL_USERS[i % ALL_USERS.length]),
              }
            })
            return { ...prev, players: merged }
          })
          break
        }
        case "player_left": {
          setScreen((prev) => {
            if (prev.type !== "in_room") return prev
            return { ...prev, players: normalizePlayers(msg.players as { sessionId: string; name: string; user?: string }[]) }
          })
          break
        }
        case "new_host": {
          setScreen((prev) => {
            if (prev.type !== "in_room") return prev
            return { ...prev, isHost: true }
          })
          break
        }
        case "players_updated": {
          setScreen((prev) => {
            if (prev.type !== "in_room") return prev
            return { ...prev, players: normalizePlayers(msg.players as { sessionId: string; name: string; user?: string }[]) }
          })
          break
        }
        case "game_started": {
          const isHost = msg.hostSessionId === msg.yourSessionId
          const configs = msg.playerConfigs as { name: string; user: string }[] | undefined
          const playerIndex = msg.playerIndex as number
          saveReconnect({
            roomId: roomIdRef.current,
            sessionId,
            playerName,
            isHost,
            playerIndex,
            configs: configs || [],
          })
          onGameStartedRef.current(isHost, configs, playerIndex)
          break
        }
        case "room_closed": {
          clearReconnect()
          setScreen({ type: "menu" })
          break
        }
        case "error": {
          setError(msg.message as string)
          setTimeout(() => setError(null), 3000)
          break
        }
      }
    })
  }, [subscribe, sessionId, saveReconnect, clearReconnect, playerName])

  function handleCreateRoom() {
    const preferredUser = getSavedUser()
    send({ type: "create_room", playerName, sessionId, ...(preferredUser ? { preferredUser } : {}) })
  }

  function handleJoinRoom(roomId: string) {
    const preferredUser = getSavedUser()
    send({ type: "join_room", roomId, playerName, sessionId, ...(preferredUser ? { preferredUser } : {}) })
  }

  function handleLeaveRoom() {
    send({ type: "leave_room" })
    clearReconnect()
    setScreen({ type: "menu" })
  }

  function handleUserChange(playerSessionId: string, newUser: string) {
    if (playerSessionId === sessionId) {
      saveUser(newUser)
    }
    setScreen((prev) => {
      if (prev.type !== "in_room") return prev
      return { ...prev, players: prev.players.map(p => p.sessionId === playerSessionId ? { ...p, user: newUser } : p) }
    })
    send({ type: "update_player_user", playerId: playerSessionId, user: newUser })
  }

  function handleBack() {
    if (screen.type === "in_room") {
      handleLeaveRoom()
    } else {
      onBack()
    }
  }

  if (!connected) {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Conectando al servidor...</h2>
          <p className="online-hint">Asegúrate de que el servidor WebSocket esté corriendo en el puerto 3001</p>
          <button className="action-btn" onClick={onBack}>Volver</button>
        </div>
      </div>
    )
  }

  if (screen.type === "in_room") {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <div className="room-header">
            <h2>Sala: {screen.roomId}</h2>
            <span className="room-badge">{screen.isHost ? "Anfitrión" : "Invitado"}</span>
          </div>

          <div className="room-players-section">
            <h3>Jugadores conectados ({screen.players.length})</h3>
            <div className="room-players-list">
              {screen.players.map((p, i) => {
                const canEdit = screen.isHost || sessionId === p.sessionId
                return (
                  <div key={p.sessionId} className="room-player-row">
                    <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={p.user as IUsers} />
                    <span>{p.name}</span>
                    {canEdit ? (
                      <select value={p.user} onChange={e => handleUserChange(p.sessionId, e.target.value)} className="room-user-select">
                        {Object.values(IUsers).map(u => {
                          const taken = u !== p.user && screen.players.some(op => op.sessionId !== p.sessionId && op.user === u)
                          return (
                            <option key={u} value={u} disabled={taken}>
                              {u} {taken ? "(ocupado)" : ""}
                            </option>
                          )
                        })}
                      </select>
                    ) : (
                      <span className="room-user-label">{p.user}</span>
                    )}
                    {i === 0 && <span className="host-tag">Anfitrión</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {screen.isHost ? (
            <button
              className="action-btn primary start-game-btn"
              onClick={() => {
                const configs = screen.players.map(p => ({
                  name: p.name,
                  user: p.user,
                }))
                send({ type: "start_game", playerConfigs: configs })
                onGameStarted(true, configs, 0)
              }}
              disabled={screen.players.length < 2}
            >
              Iniciar partida
            </button>
          ) : (
            <p className="waiting-msg">Esperando a que el anfitrión inicie la partida...</p>
          )}

          <button className="action-btn" onClick={handleLeaveRoom}>Salir de la sala</button>
        </div>
      </div>
    )
  }

  return (
    <div className="online-menu">
      <div className="online-menu-box">
        {error && <div className="online-error">{error}</div>}

        <div className="lobby-buttons">
          <button className="action-btn primary online-btn" onClick={handleCreateRoom}>
            Crear Partida
          </button>
          <button
            className="action-btn online-btn"
            onClick={() => {
              send({ type: "list_rooms" })
              setScreen({ type: "join_list" })
            }}
          >
            Conectar a Partida
          </button>
        </div>

        {screen.type === "join_list" && (
          <div className="rooms-section">
            <h3>Salas disponibles</h3>
            {rooms.length === 0 ? (
              <p className="online-hint">No hay salas disponibles. Crea una nueva partida.</p>
            ) : (
              <div className="rooms-list">
                {rooms.map((r) => (
                  <div key={r.roomId} className="room-entry">
                    <div className="room-entry-info">
                      <span className="room-entry-host">{r.hostName}</span>
                      <span className="room-entry-count">{r.playerCount}/8 jugadores</span>
                    </div>
                    <button className="action-btn primary small" onClick={() => handleJoinRoom(r.roomId)}>
                      Unirse
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="action-btn" onClick={() => setScreen({ type: "menu" })}>
              Volver
            </button>
          </div>
        )}

        <button className="action-btn online-back" onClick={handleBack}>Volver al menú</button>
      </div>
    </div>
  )
}
