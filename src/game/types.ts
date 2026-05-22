import type { IFicha } from "../interface/ficha"
import type { IUsers } from "../interface/users"
import type { IPowers } from "../interface/powers"

export interface Position {
  row: number
  col: number
}

export interface BoardCell {
  piece: IFicha
  user: IUsers
  variationIndex: number
  turnPlaced: number
  isWall: boolean
  direction: number
}

export type BoardGrid = (BoardCell | null)[][]

export interface HandPiece {
  piece: IFicha
}

export interface PlayerState {
  name: string
  user: IUsers
  score: number
  hand: HandPiece[]
}

export type GamePhase =
  | "setup"
  | "startOfTurn"
  | "placing"
  | "choosingVariation"
  | "choosingDirection"
  | "resolvingEffects"
  | "waitingForTarget"
  | "checkingLine"
  | "resolvingLine"
  | "choosingLine"
  | "endOfTurn"
  | "gameOver"
  | "resolvingActivations"

export interface PendingEffect {
  id: string
  description: string
  sourcePos: Position
  sourceUser: IUsers
  targets: Position[]
  piecesToPlace?: { position: Position; piece: IFicha; user: IUsers; variationIndex: number }[]
  piecesToMove?: { from: Position; to: Position }[]
  needsTargetSelection: boolean
  availableTargets: Position[]
  sourceUpdates?: { direction?: number; isWall?: boolean }
  effectPower?: IPowers
  consumeSinEfecto?: boolean
  optional?: boolean
}

export interface TurnEffectSource {
  row: number
  col: number
  power: IPowers
}

export interface GameState {
  phase: GamePhase
  board: BoardGrid
  players: PlayerState[]
  currentPlayerIndex: number
  turnNumber: number
  winner: number | null
  selectedHandPieceIndex: number | null
  selectedVariationIndex: number | null
  selectedDirection: number
  pendingEffects: PendingEffect[]
  logs: string[]
  scoreToWin: number
  highlightCells: Position[]
  scoredThisTurn: boolean
  sharedDeck: HandPiece[]
  pendingLine: Position[] | null
  turnEffectQueue: TurnEffectSource[]
  afterEffectsPhase: GamePhase | null
  availableLines: { positions: Position[]; user: IUsers }[]
  germenUsedThisTurn: boolean
  destructorUsedThisTurn: boolean
}

export type GameAction =
  | { type: "START_GAME"; playerConfigs: { name: string; user: IUsers }[] }
  | { type: "SELECT_HAND_PIECE"; index: number }
  | { type: "CHOOSE_VARIATION"; index: number }
  | { type: "CHOOSE_DIRECTION"; direction: number }
  | { type: "PLACE_PIECE"; row: number; col: number }
  | { type: "SELECT_TARGET"; row: number; col: number }
  | { type: "NEXT_TURN" }
  | { type: "ADD_LOG"; message: string }
  | { type: "RESOLVED_EFFECT" }
  | { type: "CLEAR_HIGHLIGHTS" }
  | { type: "RESOLVE_LINE" }
  | { type: "SELECT_LINE"; lineIndex: number }
  | { type: "SKIP_EFFECT" }
  | { type: "REMOVE_PLAYER"; playerIndex: number }
