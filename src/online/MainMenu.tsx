import { useState, useEffect } from "react"
import { Ficha } from "../components/Ficha"
import { FICHAS_SIN_EFECTO } from "../data/fichas"
import { IUsers } from "../interface/users"
import "./online.css"

export function MainMenu({
  onLocal,
  onOnline,
}: {
  onLocal: () => void
  onOnline: (playerName: string) => void
}) {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("playerName") || "")

  useEffect(() => {
    localStorage.setItem("playerName", playerName)
  }, [playerName])

  const canContinue = playerName.trim().length > 0

  return (
    <div className="online-menu">
      <div className="game-logo">
        <div className="game-title-icon">
          <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={IUsers.Alianza} />
          <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={IUsers.Sol} />
          <Ficha {...FICHAS_SIN_EFECTO[0]} variation={FICHAS_SIN_EFECTO[0].variations[0]} user={IUsers.Legion} />
        </div>
        <h1>3x3-Super</h1>
        <p>Multijugador por turnos</p>
      </div>

      <div className="online-menu-box">
        <div className="online-name-input">
          <label>Tu nombre de jugador</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Jugador"
            className="setup-name-input"
            maxLength={20}
          />
          {!canContinue && <span className="field-error">Escribe un nombre para continuar</span>}
        </div>

        <div className="online-buttons">
          <button
            className={`action-btn primary online-btn ${!canContinue ? "disabled" : ""}`}
            onClick={() => canContinue && onOnline(playerName.trim())}
            disabled={!canContinue}
          >
            🎮 Jugar Online (LAN)
          </button>
          <button className="action-btn online-btn" onClick={onLocal}>
            🏠 Partida Local
          </button>
        </div>
      </div>
    </div>
  )
}
