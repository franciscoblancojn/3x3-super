import { useEffect, useRef, useCallback } from "react"
import { useOnline } from "./OnlineContext"
import { GameProvider } from "../game/GameContext"
import { GameBoard } from "../game/GameBoard"
import { GameOver } from "../game/GameOver"
import { useGame } from "../game/GameContext"
import type { GameAction } from "../game/types"

function HostSync({ configs }: { configs: { name: string; user: import("../interface/users").IUsers }[] }) {
  const { state, dispatch } = useGame()
  const { send, subscribe } = useOnline()
  const started = useRef(false)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state })

  useEffect(() => {
    if (!started.current) {
      started.current = true
      dispatch({ type: "START_GAME", playerConfigs: configs })
    }
  }, [dispatch, configs])

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "game_action") {
        if (msg.playerIndex === stateRef.current.currentPlayerIndex) {
          dispatch((msg.action as GameAction))
        }
      }
      if (msg.type === "player_disconnected") {
        dispatch({ type: "REMOVE_PLAYER", playerIndex: msg.playerIndex as number })
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
  const { send, lastGameState } = useOnline()
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
          <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>Volver al menú</button>
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
  if (state.phase === "setup") {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Preparando partida...</h2>
          <button className="action-btn" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>Volver al menú</button>
        </div>
      </div>
    )
  }

  const isMyTurn = playerIndex === state.currentPlayerIndex
  const currentPlayerName = state.players[state.currentPlayerIndex]?.name

  return (
    <>
      <BackButton />
      {!isMyTurn && state.phase !== "gameOver" && (
        <div className="spectator-banner">
          Turno de <strong>{currentPlayerName}</strong> — Solo puedes observar
        </div>
      )}
      {children}
    </>
  )
}

function BackButton() {
  return (
    <button
      className="action-btn"
      onClick={() => window.location.reload()}
      style={{ position: "fixed", top: 8, left: 8, zIndex: 1000, fontSize: 12, padding: "4px 8px" }}
    >
      Volver al menú
    </button>
  )
}

export function OnlineHostGame({ configs, playerIndex }: { configs: { name: string; user: import("../interface/users").IUsers }[]; playerIndex: number }) {
  return (
    <GameProvider>
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
