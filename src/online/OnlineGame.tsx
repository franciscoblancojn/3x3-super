import { useEffect, useRef, useState, useCallback } from "react"
import { useOnline, loadReconnectInfo } from "./OnlineContext"
import { GameProvider } from "../game/GameContext"
import { GameBoard } from "../game/GameBoard"
import { GameOver } from "../game/GameOver"
import { useGame } from "../game/GameContext"
import type { GameAction } from "../game/types"

function HostSync({ configs }: { configs: { name: string; user: import("../interface/users").IUsers }[] }) {
  const { state, dispatch } = useGame()
  const { send, subscribe, sessionId, saveReconnect, roomId } = useOnline()
  const started = useRef(false)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state })

  useEffect(() => {
    if (!started.current) {
      started.current = true
      // Don't dispatch START_GAME if game already has state (reconnection)
      if (state.phase === "setup") {
        dispatch({ type: "START_GAME", playerConfigs: configs })
      }
      // Save reconnect info for host (OnlineLobby may unmount before game_started arrives)
      const rid = roomId || loadReconnectInfo()?.roomId || "unknown"
      saveReconnect({
        roomId: rid,
        sessionId,
        playerName: configs[0]?.name || "",
        isHost: true,
        playerIndex: 0,
        configs: configs.map(c => ({ name: c.name, user: c.user })),
      })
    }
  }, [dispatch, configs, sessionId, saveReconnect, roomId, state.phase])

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "game_action") {
        if (msg.playerIndex === stateRef.current.currentPlayerIndex) {
          dispatch((msg.action as GameAction))
        }
      }
      if (msg.type === "player_left") {
        const idx = msg.playerIndex as number
        // Only remove if player is still within bounds
        if (idx >= 0 && idx < stateRef.current.players.length) {
          dispatch({ type: "REMOVE_PLAYER", playerIndex: idx })
        }
      }
    })
  }, [dispatch, subscribe])

  const prevState = useRef(state)
  useEffect(() => {
    if (state !== prevState.current && state.phase !== "setup") {
      send({ type: "game_state_update", state })
      prevState.current = state
    }
  })

  return null
}

function ClientReceiver({ playerIndex, children }: { playerIndex: number; children: React.ReactNode }) {
  const { send, lastGameState, clearReconnect } = useOnline()
  const lastGameStateRef = useRef(lastGameState)
  useEffect(() => { lastGameStateRef.current = lastGameState }, [lastGameState])

  const dispatch = useCallback(
    (action: GameAction) => {
      const currentState = lastGameStateRef.current
      if (currentState && currentState.currentPlayerIndex !== playerIndex) return
      send({ type: "game_action", action })
    },
    [send, playerIndex],
  )

  if (!lastGameState) {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Esperando inicio de partida...</h2>
          <p className="online-hint">El anfitrión está preparando el juego</p>
          <button className="action-btn" onClick={() => { clearReconnect(); window.location.reload() }} style={{ marginTop: 16 }}>Volver al menú</button>
        </div>
      </div>
    )
  }

  return (
    <GameProvider externalState={lastGameState} externalDispatch={dispatch}>
      {children}
    </GameProvider>
  )
}

function OnlineGameInner({ playerIndex, children }: { playerIndex: number; children: React.ReactNode }) {
  const { state } = useGame()
  const { send, subscribe, clearReconnect } = useOnline()
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<string[]>([])
  const [roomClosed, setRoomClosed] = useState<string | null>(null)

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "player_disconnected") {
        const name = msg.name as string
        setDisconnectedPlayers(prev => prev.includes(name) ? prev : [...prev, name])
      }
      if (msg.type === "player_reconnected") {
        const name = msg.name as string
        setDisconnectedPlayers(prev => prev.filter(n => n !== name))
      }
      if (msg.type === "room_closed") {
        setRoomClosed((msg.reason as string) || "La sala fue cerrada")
      }
    })
  }, [subscribe])

  function handleLeaveRoom() {
    send({ type: "leave_room" })
    clearReconnect()
    window.location.reload()
  }

  if (roomClosed) {
    return (
      <div className="online-menu" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
        <div className="online-menu-box">
          <h2>Sala cerrada</h2>
          <p>{roomClosed}</p>
          <button className="action-btn" onClick={() => { clearReconnect(); window.location.reload() }} style={{ marginTop: 16 }}>
            Volver al menú
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === "setup") {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Preparando partida...</h2>
          <button className="action-btn" onClick={() => { clearReconnect(); window.location.reload() }} style={{ marginTop: 16 }}>Volver al menú</button>
        </div>
      </div>
    )
  }

  const isMyTurn = playerIndex === state.currentPlayerIndex
  const currentPlayerName = state.players[state.currentPlayerIndex]?.name

  return (
    <>
      <div className="online-game-top-bar">
        <button className="action-btn leave-room-btn" onClick={handleLeaveRoom}>
          ✕ Salir
        </button>
      </div>

      {disconnectedPlayers.map(name => (
        <div key={name} className="disconnected-banner">
          {name} se desconectó — esperando reconexión...
        </div>
      ))}

      {!isMyTurn && state.phase !== "gameOver" && (
        <div className="spectator-banner">
          Turno de <strong>{currentPlayerName}</strong> — Solo puedes observar
        </div>
      )}
      {children}
    </>
  )
}

export function OnlineHostGame({ configs, playerIndex, initialState }: { configs: { name: string; user: import("../interface/users").IUsers }[]; playerIndex: number; initialState?: import("../game/types").GameState }) {
  return (
    <GameProvider initialState={initialState}>
      <HostSync configs={configs} />
      <OnlineGameInner playerIndex={playerIndex}>
        <GameBoard playerIndex={playerIndex} />
        <GameOverWrapper />
      </OnlineGameInner>
    </GameProvider>
  )
}

function GameOverWrapper() {
  const { state } = useGame()
  if (state.phase !== "gameOver") return null
  return <GameOver />
}

export function OnlineClientGame({ playerIndex }: { playerIndex: number }) {
  return (
    <ClientReceiver playerIndex={playerIndex}>
      <OnlineGameInner playerIndex={playerIndex}>
        <GameBoard playerIndex={playerIndex} />
        <GameOverWrapper />
      </OnlineGameInner>
    </ClientReceiver>
  )
}
