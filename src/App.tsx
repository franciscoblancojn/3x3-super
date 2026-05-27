import { useState, useEffect } from "react"
import { GameProvider } from "./game/GameContext"
import { GameSetup } from "./game/GameSetup"
import { GameBoard } from "./game/GameBoard"
import { GameOver } from "./game/GameOver"
import { useGame } from "./game/GameContext"
import { MainMenu } from "./online/MainMenu"
import { OnlineProvider, useOnline, loadReconnectInfo } from "./online/OnlineContext"
import { OnlineLobby } from "./online/OnlineLobby"
import { OnlineHostGame, OnlineClientGame } from "./online/OnlineGame"
import type { IUsers } from "./interface/users"
import "./game/game.css"

type AppScreen =
  | { type: "menu" }
  | { type: "local" }
  | { type: "online"; playerName: string; isHost?: boolean; configs?: { name: string; user: IUsers }[]; playerIndex?: number }
  | { type: "reconnect_prompt"; playerName: string; roomId: string }
  | { type: "reconnect_game"; playerName: string }
  | { type: "leave_game"; playerName: string }

function GameRouter() {
  const { state } = useGame()

  if (state.phase === "setup") {
    return <GameSetup />
  }

  return (
    <>
      <GameBoard />
      {state.phase === "gameOver" && <GameOver />}
    </>
  )
}

export function OnlineRouter({ playerName, onBack }: { playerName: string; onBack: () => void }) {
  const [screen, setScreen] = useState<AppScreen>({ type: "online", playerName })

  if (screen.type === "online" && screen.isHost !== undefined) {
    if (screen.isHost && screen.configs) {
      return <OnlineHostGame configs={screen.configs as { name: string; user: IUsers }[]} playerIndex={screen.playerIndex!} />
    }
    if (!screen.isHost) {
      return <OnlineClientGame playerIndex={screen.playerIndex!} />
    }
  }

  return (
    <OnlineLobby
      playerName={playerName}
      onBack={onBack}
      onGameStarted={(isHost, configs, playerIndex) => {
        setScreen({
          type: "online",
          playerName,
          isHost,
          configs: configs as { name: string; user: IUsers }[] | undefined,
          playerIndex,
        })
      }}
    />
  )
}

function ReconnectGame({ playerName }: { playerName: string }) {
  const { connected, send, subscribe, lastGameState, saveReconnect, clearReconnect, setReconnecting } = useOnline()
  const [status, setStatus] = useState<"connecting" | "reconnecting" | "reconnected" | "error">("connecting")
  const [errorMsg, setErrorMsg] = useState("")
  const [reconnectData, setReconnectData] = useState<{
    hostSessionId: string
    playerIndex: number
    isHost: boolean
    gameStarted: boolean
    configs: { name: string; user: string }[]
  } | null>(null)

  useEffect(() => {
    if (!connected) return

    const info = loadReconnectInfo()
    if (!info) {
      setStatus("error")
      setErrorMsg("No se encontró información de reconexión")
      return
    }

    if (!info.roomId || info.roomId === "unknown") {
      setStatus("error")
      setErrorMsg("ID de sala inválido. La partida no se guardó correctamente.")
      return
    }

    setReconnecting(true)
    setStatus("reconnecting")
    send({ type: "reconnect", roomId: info.roomId, sessionId: info.sessionId, playerName: info.playerName })
  }, [connected, send, setReconnecting])

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "reconnected") {
        const data = {
          hostSessionId: msg.hostSessionId as string,
          playerIndex: msg.playerIndex as number,
          isHost: msg.isHost as boolean,
          gameStarted: msg.gameStarted as boolean,
          configs: [] as { name: string; user: string }[],
        }

        if (msg.players) {
          data.configs = (msg.players as { sessionId: string; name: string; user: string }[]).map(p => ({
            name: p.name,
            user: p.user,
          }))
        }

        setReconnectData(data)
        setStatus("reconnected")

        const info = loadReconnectInfo()
        if (info) {
          saveReconnect({ ...info, isHost: data.isHost, playerIndex: data.playerIndex })
        }
      }
      if (msg.type === "error") {
        const errMsg = msg.message as string
        // If room not found, saved session is stale — clear it
        if (errMsg.includes("Sala no encontrada")) {
          clearReconnect()
        }
        setStatus("error")
        setErrorMsg(errMsg)
      }
    })
  }, [subscribe, saveReconnect, clearReconnect])

  if (status === "connecting") {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Conectando al servidor...</h2>
        </div>
      </div>
    )
  }

  if (status === "error") {
    const info = loadReconnectInfo()
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Error de reconexión</h2>
          <p>{errorMsg}</p>
          {info?.roomId && <p style={{ fontSize: "0.8rem", color: "var(--text)" }}>Sala: {info.roomId}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button className="action-btn primary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
            <button className="action-btn" onClick={() => { clearReconnect(); window.location.reload() }}>
              Volver al menú
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === "reconnecting") {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Reconectando a la partida...</h2>
          <p className="online-hint">Esperando respuesta del servidor</p>
        </div>
      </div>
    )
  }

  if (reconnectData && !reconnectData.gameStarted && reconnectData.isHost) {
    return <OnlineLobby playerName={playerName} onBack={() => window.location.reload()} onGameStarted={() => {}} />
  }

  if (reconnectData && status === "reconnected" && lastGameState) {
    if (reconnectData.isHost) {
      return <OnlineHostGame configs={reconnectData.configs as { name: string; user: IUsers }[]} playerIndex={reconnectData.playerIndex} initialState={lastGameState} />
    } else {
      return <OnlineClientGame playerIndex={reconnectData.playerIndex} />
    }
  }

  if (reconnectData && status === "reconnected" && !lastGameState) {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <h2>Esperando estado de la partida...</h2>
          <p className="online-hint">El anfitrión enviará el estado actual</p>
        </div>
      </div>
    )
  }

  return (
    <div className="online-menu">
      <div className="online-menu-box">
        <h2>Reconectando...</h2>
        <button className="action-btn" onClick={() => { clearReconnect(); window.location.reload() }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function LeaveGame({ playerName: _playerName, onDone }: { playerName: string; onDone: () => void }) {
  const { connected, send, subscribe, clearReconnect } = useOnline()

  useEffect(() => {
    if (!connected) return

    const info = loadReconnectInfo()
    if (!info) {
      clearReconnect()
      onDone()
      return
    }

    send({ type: "reconnect", roomId: info.roomId, sessionId: info.sessionId, playerName: info.playerName })
  }, [connected, send, clearReconnect, onDone])

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === "reconnected" || msg.type === "error") {
        // Now send leave_room
        send({ type: "leave_room" })
        clearReconnect()
        onDone()
      }
    })
  }, [subscribe, send, clearReconnect, onDone])

  return (
    <div className="online-menu">
      <div className="online-menu-box">
        <h2>Saliendo de la sala...</h2>
      </div>
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState<AppScreen>(() => {
    const info = loadReconnectInfo()
    if (info) {
      return { type: "reconnect_prompt", playerName: info.playerName, roomId: info.roomId }
    }
    return { type: "menu" }
  })

  if (screen.type === "reconnect_prompt") {
    return (
      <div className="online-menu">
        <div className="online-menu-box">
          <div className="game-logo" style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Partida en curso</h1>
            <p style={{ color: "var(--text)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
              Sala: <strong>{screen.roomId}</strong>
            </p>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
              Bienvenido de nuevo, <strong>{screen.playerName}</strong>
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              className="action-btn primary"
              onClick={() => setScreen({ type: "reconnect_game", playerName: screen.playerName })}
            >
              Continuar partida
            </button>
            <button
              className="action-btn"
              style={{ background: "#dc3545", color: "white", border: "none" }}
              onClick={() => setScreen({ type: "leave_game", playerName: screen.playerName })}
            >
              Salir de la sala
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (screen.type === "reconnect_game") {
    return (
      <OnlineProvider>
        <ReconnectGame playerName={screen.playerName} />
      </OnlineProvider>
    )
  }

  if (screen.type === "leave_game") {
    return (
      <OnlineProvider>
        <LeaveGame playerName={screen.playerName} onDone={() => { window.location.reload() }} />
      </OnlineProvider>
    )
  }

  switch (screen.type) {
    case "menu":
      return (
        <MainMenu
          onLocal={() => setScreen({ type: "local" })}
          onOnline={(name) => setScreen({ type: "online", playerName: name })}
        />
      )

    case "local":
      return (
        <GameProvider>
          <GameRouter />
        </GameProvider>
      )

    case "online":
      return (
        <OnlineProvider>
          <OnlineRouter playerName={screen.playerName} onBack={() => setScreen({ type: "menu" })} />
        </OnlineProvider>
      )

    default:
      return <MainMenu onLocal={() => setScreen({ type: "local" })} onOnline={(name) => setScreen({ type: "online", playerName: name })} />
  }
}

export default App
