import { useGame } from "./GameContext"
import { Ficha } from "../components/Ficha"
import { FICHAS_SIN_EFECTO } from "../data/fichas"

export function GameOver() {
  const { state, dispatch } = useGame()

  if (state.winner === null || state.winner === undefined) return null

  const winner = state.players[state.winner]

  function handleRestart() {
    dispatch({ type: "START_GAME", playerConfigs: state.players.map(p => ({ name: p.name, user: p.user })) })
  }

  function handleNewGame() {
    window.location.reload()
  }

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <div className="game-over-trophy">🏆</div>
        <h1>¡{winner.name} ganó!</h1>
        <div className="game-over-piece">
          <Ficha
            {...FICHAS_SIN_EFECTO[0]}
            variation={FICHAS_SIN_EFECTO[0].variations[0]}
            user={winner.user}
          />
        </div>
        <p className="game-over-score">
          {winner.score} puntos
        </p>

        <div className="game-over-players">
          {state.players.map((p, i) => (
            <div key={i} className={`game-over-player ${i === state.winner ? "is-winner" : ""}`}>
              <span>{p.name}</span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>

        <div className="game-over-buttons">
          <button className="action-btn primary" onClick={handleRestart}>
            Otra partida (mismos jugadores)
          </button>
          <button className="action-btn" onClick={handleNewGame}>
            Nueva configuración
          </button>
        </div>
      </div>
    </div>
  )
}
