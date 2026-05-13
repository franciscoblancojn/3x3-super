import type { IFicha } from "../interface/ficha"
import type { IUsers } from "../interface/users"

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
  direction: number // rotation for turn effects (0-3)
}

export type BoardGrid = (BoardCell | null)[][]

export interface HandPiece {
  piece: IFicha
  variationIndex: number
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
  | "resolvingEffects"
  | "waitingForTarget"
  | "checkingLine"
  | "resolvingLine"
  | "endOfTurn"
  | "gameOver"

export interface PendingEffect {
  id: string
  description: string
  sourcePos: Position
  sourceUser: IUsers
  targets: Position[] // pieces to destroy
  piecesToPlace?: { position: Position; piece: IFicha; user: IUsers; variationIndex: number }[]
  piecesToMove?: { from: Position; to: Position }[]
  needsTargetSelection: boolean
  availableTargets: Position[]
}

export interface GameState {
  phase: GamePhase
  board: BoardGrid
  players: PlayerState[]
  currentPlayerIndex: number
  turnNumber: number
  winner: number | null
  selectedHandPieceIndex: number | null
  pendingEffects: PendingEffect[]
  logs: string[]
  scoreToWin: number
  highlightCells: Position[]
}

export type GameAction =
  | { type: "START_GAME"; playerConfigs: { name: string; user: IUsers }[] }
  | { type: "SELECT_HAND_PIECE"; index: number }
  | { type: "PLACE_PIECE"; row: number; col: number }
  | { type: "SELECT_TARGET"; row: number; col: number }
  | { type: "NEXT_TURN" }
  | { type: "ADD_LOG"; message: string }
  | { type: "RESOLVED_EFFECT" }
  | { type: "CLEAR_HIGHLIGHTS" }
