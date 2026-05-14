import { useGame } from "./GameContext"
import { Ficha } from "../components/Ficha"
import { IAction } from "../interface/action"
import { IPowers } from "../interface/powers"
import type { IFichaAction } from "../interface/ficha"

const BOARD_SIZE = 7
const EMPTY_VARIATION: [[IFichaAction, IFichaAction, IFichaAction], [IFichaAction, 0, IFichaAction], [IFichaAction, IFichaAction, IFichaAction]] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
const SIN_EFECTO_FICHA = {
  power: IPowers.Sin_Efecto,
  action: IAction.SIN_EFECTO,
  variations: [EMPTY_VARIATION],
  decription: "",
}

export function GameBoard() {
  const { state, dispatch } = useGame()

  const currentPlayer = state.players[state.currentPlayerIndex]
  const canPlace = state.phase === "placing" && state.selectedHandPieceIndex !== null && state.selectedVariationIndex !== null

  function handleCellClick(row: number, col: number) {
    if (state.phase === "waitingForTarget") {
      const pe = state.pendingEffects[0]
      if (pe && pe.needsTargetSelection) {
        if (pe.availableTargets.some(t => t.row === row && t.col === col)) {
          dispatch({ type: "SELECT_TARGET", row, col })
        }
      }
      return
    }
    if (state.phase === "resolvingEffects") {
      const pe = state.pendingEffects[0]
      if (pe && pe.needsTargetSelection) {
        if (pe.availableTargets.some(t => t.row === row && t.col === col)) {
          dispatch({ type: "SELECT_TARGET", row, col })
        }
      }
      return
    }
    if (state.phase === "resolvingActivations") {
      const pe = state.pendingEffects[0]
      if (pe && pe.needsTargetSelection) {
        if (pe.availableTargets.some(t => t.row === row && t.col === col)) {
          dispatch({ type: "SELECT_TARGET", row, col })
        }
      }
      return
    }
    if (canPlace && !state.board[row][col]) {
      dispatch({ type: "PLACE_PIECE", row, col })
    }
  }

  function isInAvailableLine(row: number, col: number): boolean {
    if (state.phase === "choosingLine") {
      return state.availableLines.some(line =>
        line.positions.some(p => p.row === row && p.col === col)
      )
    }
    return false
  }

  function isHighlighted(row: number, col: number): boolean {
    return state.highlightCells.some(p => p.row === row && p.col === col)
  }

  function isAvailableTarget(row: number, col: number): boolean {
    if (state.phase === "waitingForTarget" || state.phase === "resolvingEffects" || state.phase === "resolvingActivations") {
      const pe = state.pendingEffects[0]
      if (pe && pe.needsTargetSelection) {
        return pe.availableTargets.some(t => t.row === row && t.col === col)
      }
    }
    return false
  }

  function handleHandClick(index: number) {
    if (state.phase === "placing") {
      dispatch({ type: "SELECT_HAND_PIECE", index })
    }
  }

  function getPhaseMessage(): string {
    switch (state.phase) {
      case "startOfTurn":
        return `⏳ Procesando efectos de turno de ${currentPlayer.name}...`
      case "choosingVariation": {
        const hp = state.selectedHandPieceIndex !== null ? currentPlayer.hand[state.selectedHandPieceIndex] : null
        return `🎯 ${currentPlayer.name}, selecciona la forma de ${hp?.piece.power.replaceAll("_", " ") || "la ficha"}`
      }
      case "choosingDirection": {
        const hp = state.selectedHandPieceIndex !== null ? currentPlayer.hand[state.selectedHandPieceIndex] : null
        return `🎯 ${currentPlayer.name}, selecciona la rotación de ${hp?.piece.power.replaceAll("_", " ") || "la ficha"}`
      }
      case "placing":
        if (state.selectedHandPieceIndex === null) {
          return `🎯 ${currentPlayer.name}, selecciona una ficha de tu mano`
        }
        return `📍 ${currentPlayer.name}, coloca la ficha en el tablero`
      case "resolvingEffects":
        return state.pendingEffects[0]?.description || "⚡ Resolviendo efectos..."
      case "resolvingActivations":
        return state.pendingEffects[0]?.description || "⚡ Resolviendo efectos de activación..."
      case "waitingForTarget":
        return state.pendingEffects[0]?.description || "🎯 Selecciona un objetivo"
      case "checkingLine":
        return `🔍 ¡3 en línea! Presiona "Resolver" para procesar`
      case "choosingLine":
        return `🔍 ¡Múltiples 3 en línea! Selecciona cuál activar`
      case "endOfTurn":
        return `${currentPlayer.name}, presiona "Siguiente turno" para continuar`
      default:
        return ""
    }
  }

  function canResolve(): boolean {
    if ((state.phase === "resolvingEffects" || state.phase === "resolvingActivations") && state.pendingEffects.length > 0) {
      return !state.pendingEffects[0].needsTargetSelection
    }
    return false
  }

  function canSkip(): boolean {
    if (state.phase === "resolvingEffects" && state.pendingEffects.length > 0) {
      return state.pendingEffects[0].optional === true
    }
    return false
  }

  function hasEffectsQueue(): boolean {
    return state.turnEffectQueue.length > 0
  }

  const selectedHandPiece = state.selectedHandPieceIndex !== null ? currentPlayer.hand[state.selectedHandPieceIndex] : null

  return (
    <div className="game-layout">
      <div className="game-sidebar left-sidebar">
        {state.players.map((p, i) => (
          <div
            key={i}
            className={`player-score ${i === state.currentPlayerIndex ? "active" : ""}`}
          >
            <div className="mini-piece">
              <Ficha {...SIN_EFECTO_FICHA} variation={EMPTY_VARIATION} user={p.user} />
            </div>
            <div className="player-score-info">
              <div className="player-score-name">{p.name}</div>
              <div className="player-score-value">
                {p.score} / {state.scoreToWin}
                {i === state.currentPlayerIndex && state.phase !== "gameOver" &&
                  state.phase !== "setup" && <span className="turn-indicator">◀ TURNO</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="game-main">
        <div className="game-header">
          <div className="phase-message">{getPhaseMessage()}</div>
          <div className="turn-info">Turno {state.turnNumber}</div>
        </div>

        {/* Variation chooser overlay */}
        {state.phase === "choosingVariation" && selectedHandPiece && selectedHandPiece.piece.variations.length > 1 && (
          <div className="variation-chooser">
            <h3>Selecciona forma base:</h3>
            <div className="variation-grid">
              {selectedHandPiece.piece.variations.map((v, vi) => (
                <div
                  key={vi}
                  className="variation-option"
                  onClick={() => dispatch({ type: "CHOOSE_VARIATION", index: vi })}
                >
                  <Ficha
                    {...selectedHandPiece.piece}
                    variation={v}
                    user={currentPlayer.user}
                  />
                  <span>Forma {vi + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direction/rotation chooser overlay */}
        {state.phase === "choosingDirection" && selectedHandPiece && (
          <div className="variation-chooser">
            <h3>Selecciona rotación:</h3>
            <div className="variation-grid">
              {[0, 90, 180, 270].map((deg) => (
                <div
                  key={deg}
                  className="variation-option"
                  onClick={() => dispatch({ type: "CHOOSE_DIRECTION", direction: deg / 90 })}
                >
                  <div style={{ transform: `rotate(${deg}deg)` }}>
                    <Ficha
                      {...selectedHandPiece.piece}
                      variation={selectedHandPiece.piece.variations[0]}
                      user={currentPlayer.user}
                    />
                  </div>
                  <span>{deg}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Line chooser overlay */}
        {state.phase === "choosingLine" && (
          <div className="line-chooser">
            <h3>Selecciona qué 3 en línea activar:</h3>
            <div className="line-options">
              {state.availableLines.map((line, li) => (
                <button
                  key={li}
                  className="action-btn primary"
                  onClick={() => dispatch({ type: "SELECT_LINE", lineIndex: li })}
                >
                  Línea de {state.players.find(p => p.user === line.user)?.name || "alguien"}:
                  [{line.positions.map(p => `${p.row + 1},${p.col + 1}`).join(" → ")}]
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="board-container">
          <div className="board-grid">
            {Array.from({ length: BOARD_SIZE }, (_, r) => (
              <div key={r} className="board-row">
                {Array.from({ length: BOARD_SIZE }, (_, c) => {
                  const cell = state.board[r][c]
                  const hl = isHighlighted(r, c)
                  const target = isAvailableTarget(r, c)
                  const inLine = isInAvailableLine(r, c)
                  const isEmpty = canPlace && !cell

                  return (
                    <div
                      key={c}
                      className={`board-cell ${hl ? "highlighted" : ""} ${target ? "targetable" : ""} ${inLine ? "in-line" : ""} ${isEmpty ? "empty-slot" : ""} ${cell?.isWall ? "wall" : ""}`}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {cell && !cell.isWall && (
                        <Ficha
                          {...cell.piece}
                          variation={cell.piece.variations[cell.variationIndex]}
                          user={cell.user}
                        />
                      )}
                      {cell?.isWall && (
                        <div className="wall-piece">🧱</div>
                      )}
                      {isEmpty && (
                        <div className="placement-hint">+</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="game-actions">
          {(state.phase === "resolvingEffects" || state.phase === "resolvingActivations") && canResolve() && (
            <button className="action-btn" onClick={() => dispatch({ type: "RESOLVED_EFFECT" })}>
              Resolver efecto {hasEffectsQueue() ? `(+${state.turnEffectQueue.length} restantes)` : ""}
            </button>
          )}
          {canSkip() && (
            <button className="action-btn secondary" onClick={() => dispatch({ type: "SKIP_EFFECT" })}>
              Saltar efecto
            </button>
          )}
          {(state.phase === "endOfTurn") && (
            <button className="action-btn primary" onClick={() => dispatch({ type: "NEXT_TURN" })}>
              Siguiente turno
            </button>
          )}
          {state.phase === "checkingLine" && (
            <button className="action-btn primary" onClick={() => dispatch({ type: "RESOLVE_LINE" })}>
              Resolver 3 en línea
            </button>
          )}
        </div>
      </div>

      <div className="game-sidebar right-sidebar">
        <div className="hand-section">
          <h3>Mano de {currentPlayer.name}</h3>
          <div className="hand-grid">
            {currentPlayer.hand.length === 0 ? (
              <div className="empty-hand">Sin fichas</div>
            ) : (
              currentPlayer.hand.map((hp, i) => (
                <div
                  key={i}
                  className={`hand-piece ${i === state.selectedHandPieceIndex ? "selected" : ""} ${state.phase === "placing" ? "selectable" : ""}`}
                  onClick={() => handleHandClick(i)}
                >
                  <Ficha
                    {...hp.piece}
                    variation={hp.piece.variations[hp.piece.variations.length > 1 ? 0 : 0]}
                    user={currentPlayer.user}
                  />
                  <div className="hand-piece-name">
                    {hp.piece.power.replaceAll("_", " ")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="log-section">
          <h3>Bitácora</h3>
          <div className="log-list">
            {state.logs.slice(-20).map((log, i) => (
              <div key={i} className="log-entry">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
