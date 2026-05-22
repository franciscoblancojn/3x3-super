import { useState } from "react"
import { GameProvider } from "./game/GameContext"
import { GameSetup } from "./game/GameSetup"
import { GameBoard } from "./game/GameBoard"
import { GameOver } from "./game/GameOver"
import { useGame } from "./game/GameContext"
import { MainMenu } from "./online/MainMenu"
import { OnlineProvider } from "./online/OnlineContext"
import { OnlineLobby } from "./online/OnlineLobby"
import { OnlineHostGame, OnlineClientGame } from "./online/OnlineGame"
import type { IUsers } from "./interface/users"
import "./game/game.css"

type AppScreen =
  | { type: "menu" }
  | { type: "local" }
  | { type: "online"; playerName: string; isHost?: boolean; configs?: { name: string; user: IUsers }[]; playerIndex?: number }

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

function App() {
  const [screen, setScreen] = useState<AppScreen>({ type: "menu" })

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
