import { GameProvider } from "./game/GameContext"
import { GameSetup } from "./game/GameSetup"
import { GameBoard } from "./game/GameBoard"
import { GameOver } from "./game/GameOver"
import { useGame } from "./game/GameContext"
import "./game/game.css"

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

function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  )
}

export default App
