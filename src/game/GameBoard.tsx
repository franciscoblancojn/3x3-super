import { useState } from "react"
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

export function GameBoard({ playerIndex: myPlayerIndex }: { playerIndex?: number }) {
  const { state, dispatch } = useGame()

  const currentPlayer = state.players[state.currentPlayerIndex]
  const canPlace = state.phase === "placing" && state.selectedHandPieceIndex !== null && state.selectedVariationIndex !== null
  const isMyTurn = myPlayerIndex === undefined || myPlayerIndex === state.currentPlayerIndex

  function handleCellClick(row: number, col: number) {
    if (!isMyTurn) return
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
    if (!isMyTurn) return
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

  const [showPlayers, setShowPlayers] = useState(false)
  const [showLog, setShowLog] = useState(false)

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

        {/* Direction/rotation chooser overlay */}
        {state.phase === "choosingDirection" && selectedHandPiece && isMyTurn && (
          <div className="variation-chooser">
            <h3>Selecciona rotación:</h3>
            <div className="direction-cross">
              <div className="direction-cross-row">
                <div className="direction-cross-spacer" />
                <div
                  className="variation-option"
                  onClick={() => dispatch({ type: "CHOOSE_DIRECTION", direction: 0 })}
                >
                  <div style={{ transform: `rotate(0deg)` }}>
                    <Ficha
                      {...selectedHandPiece.piece}
                      variation={selectedHandPiece.piece.variations[state.selectedVariationIndex!]}
                      user={currentPlayer.user}
                    />
                  </div>
                </div>
                <div className="direction-cross-spacer" />
              </div>
              <div className="direction-cross-row">
                <div
                  className="variation-option"
                  onClick={() => dispatch({ type: "CHOOSE_DIRECTION", direction: 3 })}
                >
                  <div style={{ transform: `rotate(270deg)` }}>
                    <Ficha
                      {...selectedHandPiece.piece}
                      variation={selectedHandPiece.piece.variations[state.selectedVariationIndex!]}
                      user={currentPlayer.user}
                    />
                  </div>
                </div>
                <div className="direction-cross-center">
                  <Ficha
                    {...selectedHandPiece.piece}
                    variation={selectedHandPiece.piece.variations[state.selectedVariationIndex!]}
                    user={currentPlayer.user}
                  />
                </div>
                <div
                  className="variation-option"
                  onClick={() => dispatch({ type: "CHOOSE_DIRECTION", direction: 1 })}
                >
                  <div style={{ transform: `rotate(90deg)` }}>
                    <Ficha
                      {...selectedHandPiece.piece}
                      variation={selectedHandPiece.piece.variations[state.selectedVariationIndex!]}
                      user={currentPlayer.user}
                    />
                  </div>
                </div>
              </div>
              <div className="direction-cross-row">
                <div className="direction-cross-spacer" />
                <div
                  className="variation-option"
                  onClick={() => dispatch({ type: "CHOOSE_DIRECTION", direction: 2 })}
                >
                  <div style={{ transform: `rotate(180deg)` }}>
                    <Ficha
                      {...selectedHandPiece.piece}
                      variation={selectedHandPiece.piece.variations[state.selectedVariationIndex!]}
                      user={currentPlayer.user}
                    />
                  </div>
                </div>
                <div className="direction-cross-spacer" />
              </div>
            </div>
          </div>
        )}

        {/* Line chooser overlay */}
        {state.phase === "choosingLine" && isMyTurn && (
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
                  const isEmpty = canPlace && !cell && isMyTurn

                  return (
                    <div
                      key={c}
                      className={`board-cell ${hl ? "highlighted" : ""} ${target ? "targetable" : ""} ${inLine ? "in-line" : ""} ${isEmpty ? "empty-slot" : ""} ${cell?.isWall ? "wall" : ""}`}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {cell && !cell.isWall && (
                        <div style={{ transform: `rotate(${cell.direction * 90}deg)` }}>
                          <Ficha
                            {...cell.piece}
                            variation={cell.piece.variations[cell.variationIndex]}
                            user={cell.user}
                          />
                        </div>
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

        <div className="mobile-toggles">
          <button className="action-btn mobile-toggle-btn" onClick={() => setShowPlayers(true)}>
            👥 Jugadores
          </button>
          <button className="action-btn mobile-toggle-btn" onClick={() => setShowLog(true)}>
            📋 Bitácora
          </button>
        </div>

        <div className="hand-section">
          <h3>Mano de {currentPlayer.name}</h3>
          <div className="hand-grid">
            {currentPlayer.hand.length === 0 ? (
              <div className="empty-hand">Sin fichas</div>
            ) : (
              currentPlayer.hand.map((hp, i) => (
                <div
                  key={i}
                  className={`hand-piece ${i === state.selectedHandPieceIndex ? "selected" : ""} ${state.phase === "placing" && isMyTurn ? "selectable" : ""}`}
                  onClick={() => handleHandClick(i)}
                >
                  <Ficha
                    {...hp.piece}
                    variation={hp.piece.variations[0]}
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

        <div className="game-actions">
          {(state.phase === "resolvingEffects" || state.phase === "resolvingActivations") && canResolve() && isMyTurn && (
            <button className="action-btn" onClick={() => dispatch({ type: "RESOLVED_EFFECT" })}>
              Resolver efecto {hasEffectsQueue() ? `(+${state.turnEffectQueue.length} restantes)` : ""}
            </button>
          )}
          {canSkip() && isMyTurn && (
            <button className="action-btn secondary" onClick={() => dispatch({ type: "SKIP_EFFECT" })}>
              Saltar efecto
            </button>
          )}
          {(state.phase === "endOfTurn") && isMyTurn && (
            <button className="action-btn primary" onClick={() => dispatch({ type: "NEXT_TURN" })}>
              Siguiente turno
            </button>
          )}
          {state.phase === "checkingLine" && isMyTurn && (
            <button className="action-btn primary" onClick={() => dispatch({ type: "RESOLVE_LINE" })}>
              Resolver 3 en línea
            </button>
          )}
        </div>
      </div>

      <div className="game-sidebar right-sidebar">
        <div className="log-section">
          <h3>Bitácora</h3>
          <div className="log-list">
            {state.logs.slice(-20).map((log, i) => (
              <div key={i} className="log-entry">{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Players modal (mobile) */}
      {showPlayers && (
        <div className="mobile-modal-overlay" onClick={() => setShowPlayers(false)}>
          <div className="mobile-modal-content" onClick={e => e.stopPropagation()}>
            <h2>Jugadores</h2>
            <div className="mobile-modal-players">
              {state.players.map((p, i) => (
                <div key={i} className={`player-score ${i === state.currentPlayerIndex ? "active" : ""}`}>
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
            <button className="action-btn mobile-modal-close" onClick={() => setShowPlayers(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Log modal (mobile) */}
      {showLog && (
        <div className="mobile-modal-overlay" onClick={() => setShowLog(false)}>
          <div className="mobile-modal-content" onClick={e => e.stopPropagation()}>
            <h2>Bitácora</h2>
            <div className="mobile-modal-log">
              {state.logs.slice(-50).map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))}
            </div>
            <button className="action-btn mobile-modal-close" onClick={() => setShowLog(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
