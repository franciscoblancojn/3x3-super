import { useState } from "react"
import { IUsers } from "../interface/users"
import { useGame } from "./GameContext"
import { Ficha } from "../components/Ficha"
import { FICHAS_SIN_EFECTO } from "../data/fichas"

const COLOR_NAMES: Record<IUsers, string> = {
  [IUsers.Alianza]: "Alianza (azul)",
  [IUsers.Espias]: "Espías (negro)",
  [IUsers.Imperio]: "Imperio (naranja)",
  [IUsers.Legion]: "Legión (rojo)",
  [IUsers.Luna]: "Luna (celeste)",
  [IUsers.Nasa]: "NASA (gris)",
  [IUsers.Sol]: "Sol (verde)",
  [IUsers.Iglecia]: "Iglesia (púrpura)",
}

const ALL_USERS = Object.values(IUsers)

export function GameSetup() {
  const { dispatch } = useGame()
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState(
    ALL_USERS.slice(0, 2).map((user, i) => ({
      name: `Jugador ${i + 1}`,
      user,
    }))
  )

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count)
    setPlayers(
      ALL_USERS.slice(0, count).map((user, i) => ({
        name: players[i]?.name || `Jugador ${i + 1}`,
        user,
      }))
    )
  }

  function handleNameChange(index: number, name: string) {
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, name } : p))
  }

  function handleStart() {
    const configs = players.slice(0, playerCount).map((p, i) => ({
      name: p.name || `Jugador ${i + 1}`,
      user: p.user,
    }))
    dispatch({ type: "START_GAME", playerConfigs: configs })
  }

  return (
    <div className="game-setup">
      <div className="game-logo">
        <div className="game-title-icon">
          <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={IUsers.Alianza} />
          <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={IUsers.Sol} />
          <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={IUsers.Legion} />
        </div>
        <h1>3x3-Super</h1>
        <p>Multijugador por turnos</p>
      </div>

      <div className="setup-form">
        <div className="setup-field">
          <label>Número de jugadores (2-8)</label>
          <div className="player-count-buttons">
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <button
                key={n}
                className={`count-btn ${n === playerCount ? "active" : ""}`}
                onClick={() => handlePlayerCountChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-players">
          <h3>Jugadores</h3>
          {players.slice(0, playerCount).map((p, i) => (
            <div key={i} className="setup-player-row">
              <div className="setup-player-color" style={{ background: p.user === IUsers.Espias ? "#555" : undefined }}>
                <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={p.user} />
              </div>
              <div className="setup-player-info">
                <span className="setup-player-label">{COLOR_NAMES[p.user]}</span>
                <input
                  type="text"
                  value={p.name}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`Jugador ${i + 1}`}
                  className="setup-name-input"
                />
              </div>
            </div>
          ))}
        </div>

        <button className="start-btn" onClick={handleStart}>
          Comenzar partida
        </button>
      </div>
    </div>
  )
}
