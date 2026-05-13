import { IUsers } from "../interface/users"
import { IPowers } from "../interface/powers"
import { FICHAS_MANO, FICHAS_ACTIVACION, FICHAS_DESTRUCCION, FICHAS_INSTANTANEA, FICHAS_TURNO, FICHAS_SIN_EFECTO } from "../data/fichas"
import type { GameState, GameAction, PlayerState, BoardGrid, HandPiece, Position, PendingEffect } from "./types"

const BOARD_SIZE = 7

function createEmptyBoard(): BoardGrid {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  )
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateHand(): HandPiece[] {
  const hand: HandPiece[] = []
  for (const f of FICHAS_MANO) {
    for (let q = 0; q < (f.quantity ?? 1); q++) {
      for (let v = 0; v < f.variations.length; v++) {
        hand.push({ piece: f, variationIndex: v })
      }
    }
  }
  for (const f of FICHAS_ACTIVACION) {
    for (let q = 0; q < (f.quantity ?? 1); q++) {
      for (let v = 0; v < f.variations.length; v++) {
        hand.push({ piece: f, variationIndex: v })
      }
    }
  }
  for (const f of FICHAS_DESTRUCCION) {
    for (let q = 0; q < (f.quantity ?? 1); q++) {
      for (let v = 0; v < f.variations.length; v++) {
        hand.push({ piece: f, variationIndex: v })
      }
    }
  }
  for (const f of FICHAS_INSTANTANEA) {
    for (let q = 0; q < (f.quantity ?? 1); q++) {
      for (let v = 0; v < f.variations.length; v++) {
        hand.push({ piece: f, variationIndex: v })
      }
    }
  }
  for (const f of FICHAS_TURNO) {
    for (let q = 0; q < (f.quantity ?? 1); q++) {
      for (let v = 0; v < f.variations.length; v++) {
        hand.push({ piece: f, variationIndex: v })
      }
    }
  }
  for (const f of FICHAS_SIN_EFECTO) {
    for (let q = 0; q < (f.quantity ?? 1); q++) {
      for (let v = 0; v < f.variations.length; v++) {
        hand.push({ piece: f, variationIndex: v })
      }
    }
  }
  return shuffleArray(hand)
}

function createPlayers(configs: { name: string; user: IUsers }[]): PlayerState[] {
  return configs.map((c) => ({
    name: c.name,
    user: c.user,
    score: 0,
    hand: generateHand(),
  }))
}

export function createInitialState(): GameState {
  return {
    phase: "setup",
    board: createEmptyBoard(),
    players: [],
    currentPlayerIndex: 0,
    turnNumber: 0,
    winner: null,
    selectedHandPieceIndex: null,
    pendingEffects: [],
    logs: [],
    scoreToWin: 5,
    highlightCells: [],
    scoredThisTurn: false,
  }
}

function isValidPlacement(board: BoardGrid, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false
  return !board[row][col]
}

function getArrowDirections(variation: number[][], power: IPowers): { dr: number; dc: number }[] {
  const dirs: { dr: number; dc: number }[] = []
  const dirMap: [number, number][] = [
    [0, 0], [0, 1], [0, 2],
    [1, 0],          [1, 2],
    [2, 0], [2, 1], [2, 2],
  ]
  const coordMap: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],            [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ]
  const skipDiagonal = [
    IPowers.Eliminacion_Linea,
    IPowers.Trampa_Lineal,
    IPowers.Corredor,
    IPowers.Destructor,
    IPowers.Germen,
  ]
  for (let idx = 0; idx < 8; idx++) {
    const [ri, ci] = dirMap[idx]
    if (variation[ri]?.[ci] === 1) {
      const [dr, dc] = coordMap[idx]
      if (skipDiagonal.includes(power)) {
        if (dr !== 0 && dc !== 0) continue
      }
      dirs.push({ dr, dc })
    }
  }
  return dirs
}

function getLineFromStart(
  _board: BoardGrid, row: number, col: number, dr: number, dc: number
): Position[] {
  const cells: Position[] = []
  let r = row
  let c = col
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    cells.push({ row: r, col: c })
    r += dr
    c += dc
  }
  return cells
}

function findThreeInLine(board: BoardGrid): { positions: Position[]; user: IUsers } | null {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c]
      if (!cell || cell.isWall) continue
      for (const [dr, dc] of dirs) {
        const line: Position[] = [{ row: r, col: c }]
        let nr = r + dr, nc = c + dc
        while (
          nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE &&
          board[nr][nc] && !board[nr][nc]!.isWall &&
          board[nr][nc]!.user === cell.user
        ) {
          line.push({ row: nr, col: nc })
          nr += dr
          nc += dc
        }
        if (line.length >= 3) {
          return { positions: line.slice(0, 3), user: cell.user }
        }
      }
    }
  }
  return null
}

function pushPiecesInDirection(
  board: BoardGrid, row: number, col: number, dr: number, dc: number
): { moved: Position[] } {
  const cells: { r: number; c: number }[] = []
  let r = row + dr
  let c = col + dc
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    cells.push({ r, c })
    r += dr
    c += dc
  }
  const moved: Position[] = []
  if (dr > 0) cells.reverse()
  else if (dr === 0 && dc > 0) cells.reverse()
  for (const cell of cells) {
    const piece = board[cell.r][cell.c]
    if (!piece || piece.isWall) continue
    let nr = cell.r + dr
    let nc = cell.c + dc
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && !board[nr][nc]) {
      moved.push({ row: nr, col: nc })
    }
  }
  return { moved }
}

function getAllNonEmptyCells(board: BoardGrid): Position[] {
  const cells: Position[] = []
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c]) cells.push({ row: r, col: c })
    }
  }
  return cells
}

function buildInstantEffects(
  board: BoardGrid, row: number, col: number, hp: HandPiece, playerName: string, playerUser: IUsers
): PendingEffect[] {
  const effects: PendingEffect[] = []
  const variation = hp.piece.variations[hp.variationIndex]
  const dirs = getArrowDirections(variation, hp.piece.power)
  switch (hp.piece.power) {
    case IPowers.Eliminacion_Simple: {
      const targets = dirs.map(d => ({ row: row + d.dr, col: col + d.dc }))
        .filter(t => t.row >= 0 && t.row < 7 && t.col >= 0 && t.col < 7 && board[t.row][t.col] && !board[t.row][t.col]!.isWall)
      if (targets.length > 0) {
        effects.push({
          id: `elim-simple-${row}-${col}`,
          description: `${playerName} usó Eliminación Simple → destruye ${targets.length} ficha(s)`,
          sourcePos: { row, col },
          sourceUser: playerUser,
          targets,
          needsTargetSelection: false,
          availableTargets: [],
        })
      }
      break
    }
    case IPowers.Eliminacion_Linea: {
      for (const d of dirs) {
        const line = getLineFromStart(board, row + d.dr, col + d.dc, d.dr, d.dc)
          .filter(t => board[t.row][t.col] && !board[t.row][t.col]!.isWall)
        if (line.length > 0) {
          effects.push({
            id: `elim-linea-${row}-${col}-${d.dr}-${d.dc}`,
            description: `${playerName} usó Eliminación de Línea → arrasa toda la línea`,
            sourcePos: { row, col },
            sourceUser: playerUser,
            targets: line,
            needsTargetSelection: false,
            availableTargets: [],
          })
        }
      }
      break
    }
    case IPowers.Francotirador: {
      const allTargets = getAllNonEmptyCells(board).filter(t => !(t.row === row && t.col === col))
      if (allTargets.length > 0) {
        effects.push({
          id: `franco-${row}-${col}`,
          description: `${playerName} usó Francotirador → selecciona objetivo`,
          sourcePos: { row, col },
          sourceUser: playerUser,
          targets: [],
          needsTargetSelection: true,
          availableTargets: allTargets,
        })
      }
      break
    }
    case IPowers.Peso: {
      for (const d of dirs) {
        const { moved } = pushPiecesInDirection(board, row, col, d.dr, d.dc)
        if (moved.length > 0) {
          const piecesToMove: { from: Position; to: Position }[] = []
          for (const m of moved) {
            piecesToMove.push({
              from: { row: m.row - d.dr, col: m.col - d.dc },
              to: m,
            })
          }
          effects.push({
            id: `peso-${row}-${col}`,
            description: `${playerName} usó Peso → empujó ${moved.length} ficha(s)`,
            sourcePos: { row, col },
            sourceUser: playerUser,
            targets: [],
            piecesToMove,
            needsTargetSelection: false,
            availableTargets: [],
          })
        }
      }
      break
    }
  }
  return effects
}

function resolveEffectWithTarget(state: GameState, row: number, col: number): GameState {
  const [current] = state.pendingEffects
  if (!current || !current.needsTargetSelection) return state
  const target = current.availableTargets.find(t => t.row === row && t.col === col)
  if (!target) return state
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  newBoard[target.row][target.col] = null
  const logs = [...state.logs, `Francotirador eliminó ficha en [${target.row + 1}, ${target.col + 1}]`]
  const lineResult = findThreeInLine(newBoard)
  if (lineResult) {
    return {
      ...state, board: newBoard, pendingEffects: [],
      phase: "checkingLine", highlightCells: lineResult.positions,
      logs: [...logs, `¡3 en línea de ${state.players[state.currentPlayerIndex].name}!`],
    }
  }
  return {
    ...state, board: newBoard, pendingEffects: [],
    phase: "endOfTurn" as GameState["phase"], highlightCells: [], logs,
  }
}

function processTurnEffects(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  const logs: string[] = [...state.logs]
  const turnOrder = [IPowers.Destructor, IPowers.Germen, IPowers.Corredor, IPowers.Incendio]
  let hasEffects = false
  for (const power of turnOrder) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = newBoard[r][c]
        if (!cell || cell.user !== player.user || cell.isWall) continue
        if (cell.piece.power !== power) continue
        if (cell.turnPlaced === state.turnNumber) continue
        const variation = cell.piece.variations[cell.variationIndex]
        const dirs = getArrowDirections(variation, power)
        switch (power) {
          case IPowers.Destructor: {
            for (const d of dirs) {
              const nr = r + d.dr, nc = c + d.dc
              if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
              const target = newBoard[nr][nc]
              if (!target) {
                newBoard[nr][nc] = {
                  piece: FICHAS_SIN_EFECTO[0], user: player.user,
                  variationIndex: 0, turnPlaced: state.turnNumber, isWall: false, direction: 0,
                }
                logs.push(`Destructor colocó ficha sin efecto en [${nr + 1}, ${nc + 1}]`)
                hasEffects = true
              } else if (!target.isWall) {
                newBoard[nr][nc] = null
                logs.push(`Destructor destruyó ficha en [${nr + 1}, ${nc + 1}]`)
                hasEffects = true
              }
              newBoard[r][c]!.direction = (cell.direction + 1) % 4
            }
            break
          }
          case IPowers.Germen: {
            for (const d of dirs) {
              const nr = r + d.dr, nc = c + d.dc
              if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
              const target = newBoard[nr][nc]
              if (target && !target.isWall) {
                newBoard[nr][nc] = {
                  piece: FICHAS_SIN_EFECTO[0], user: player.user,
                  variationIndex: 0, turnPlaced: state.turnNumber, isWall: false, direction: 0,
                }
                logs.push(`Germen infectó ficha en [${nr + 1}, ${nc + 1}]`)
                hasEffects = true
              }
            }
            break
          }
          case IPowers.Corredor: {
            for (const d of dirs) {
              let nr = r + d.dr, nc = c + d.dc
              while (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) {
                const target = newBoard[nr][nc]
                if (target) {
                  if (!target.isWall) {
                    newBoard[nr][nc] = null
                    logs.push(`Corredor impactó y destruyó ficha en [${nr + 1}, ${nc + 1}]`)
                    hasEffects = true
                  }
                  break
                }
                nr += d.dr; nc += d.dc
              }
            }
            break
          }
          case IPowers.Incendio: {
            const targets: Position[] = []
            for (const d of dirs) {
              const nr = r + d.dr, nc = c + d.dc
              if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
              const target = newBoard[nr][nc]
              if (target && !target.isWall) targets.push({ row: nr, col: nc })
            }
            if (targets.length === 0) {
              newBoard[r][c] = null
              logs.push(`Incendio no encontró objetivo y se autodestruyó en [${r + 1}, ${c + 1}]`)
              hasEffects = true
            } else {
              for (const t of targets) {
                newBoard[t.row][t.col] = null
              }
              logs.push(`Incendio quemó ${targets.length} ficha(s)`)
              hasEffects = true
            }
            break
          }
        }
      }
    }
  }
  if (hasEffects) {
    logs.unshift(`⚡ Efectos de turno de ${player.name}...`)
  }
  logs.push(`🎯 ${player.name}, coloca una ficha`)
  return {
    ...state,
    board: newBoard,
    phase: "placing",
    scoredThisTurn: false,
    selectedHandPieceIndex: null,
    pendingEffects: [],
    highlightCells: [],
    logs,
  }
}

function resolveLine(state: GameState): GameState {
  const line = state.highlightCells
  if (line.length === 0) return { ...state, phase: "endOfTurn" as GameState["phase"] }
  const playerIdx = state.currentPlayerIndex
  const player = state.players[playerIdx]
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  const activationLogs: string[] = []
  const destructionEffects: PendingEffect[] = []
  for (const pos of line) {
    const cell = newBoard[pos.row][pos.col]
    if (!cell) continue
    if (cell.piece.power === IPowers.Protector) {
      activationLogs.push(`Protector salvó una ficha en [${pos.row + 1}, ${pos.col + 1}]`)
      continue
    }
    if (cell.piece.power === IPowers.Duplicador) {
      const variation = cell.piece.variations[cell.variationIndex]
      const dirs = getArrowDirections(variation, IPowers.Duplicador)
      for (const d of dirs) {
        const nr = pos.row + d.dr, nc = pos.col + d.dc
        if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && !newBoard[nr][nc]) {
          newBoard[nr][nc] = { ...cell }
          activationLogs.push(`Duplicador creó copia en [${nr + 1}, ${nc + 1}]`)
        }
      }
      continue
    }
  }
  const toDestroy = line.filter(pos => {
    const cell = newBoard[pos.row][pos.col]
    if (!cell) return false
    if (cell.piece.power === IPowers.Duplicador) return false
    return true
  })
  for (const pos of toDestroy) {
    const cell = newBoard[pos.row][pos.col]
    if (!cell || cell.piece.power === IPowers.Protector) continue
    const variation = cell.piece.variations[cell.variationIndex]
    const dirs = getArrowDirections(variation, cell.piece.power)
    switch (cell.piece.power) {
      case IPowers.Trampa_Simple: {
        const targets = dirs.map(d => ({ row: pos.row + d.dr, col: pos.col + d.dc }))
          .filter(t => t.row >= 0 && t.row < 7 && t.col >= 0 && t.col < 7 && newBoard[t.row][t.col] && !newBoard[t.row][t.col]!.isWall)
        if (targets.length > 0) {
          destructionEffects.push({
            id: `trampa-simple-${pos.row}-${pos.col}`,
            description: `💥 Trampa Simple destruyó ${targets.length} ficha(s)`,
            sourcePos: pos, sourceUser: cell.user, targets,
            needsTargetSelection: false, availableTargets: [],
          })
        }
        break
      }
      case IPowers.Trampa_Lineal: {
        for (const d of dirs) {
          const line2 = getLineFromStart(newBoard, pos.row + d.dr, pos.col + d.dc, d.dr, d.dc)
            .filter(t => newBoard[t.row][t.col] && !newBoard[t.row][t.col]!.isWall)
          if (line2.length > 0) {
            destructionEffects.push({
              id: `trampa-lineal-${pos.row}-${pos.col}`,
              description: `💥 Trampa Lineal arrasó una línea`,
              sourcePos: pos, sourceUser: cell.user, targets: line2,
              needsTargetSelection: false, availableTargets: [],
            })
          }
        }
        break
      }
      case IPowers.Muro: {
        newBoard[pos.row][pos.col] = { ...cell, isWall: true, turnPlaced: state.turnNumber }
        break
      }
    }
  }
  for (const pos of toDestroy) {
    const cell = newBoard[pos.row][pos.col]
    if (cell && cell.piece.power !== IPowers.Muro && cell.piece.power !== IPowers.Protector) {
      newBoard[pos.row][pos.col] = null
    }
  }
  const newPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, score: p.score + 1 } : p
  )
  const logs = [
    ...state.logs,
    `🏆 ${player.name} ganó 1 punto (total: ${newPlayers[playerIdx].score})`,
    ...activationLogs,
  ]
  const winnerIdx = newPlayers.findIndex(p => p.score >= state.scoreToWin)
  if (winnerIdx >= 0) {
    return {
      ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
      phase: "gameOver", winner: winnerIdx,
      selectedHandPieceIndex: null, pendingEffects: [], highlightCells: [],
      logs: [...logs, `🎉 ¡${newPlayers[winnerIdx].name} ganó la partida!`],
    }
  }
  if (destructionEffects.length > 0) {
    return {
      ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
      phase: "resolvingEffects", pendingEffects: destructionEffects,
      highlightCells: [], logs,
    }
  }
  return {
    ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
    phase: "endOfTurn" as GameState["phase"], highlightCells: [], logs,
  }
}

function advanceFromEmptyEffects(state: GameState): GameState {
  if (state.pendingEffects.length > 0) return state
  if (state.phase !== "resolvingEffects") return state
  const lineResult = state.scoredThisTurn ? null : findThreeInLine(state.board)
  if (lineResult) {
    const findName = (u: IUsers) => state.players.find(p => p.user === u)?.name || "alguien"
    return {
      ...state, pendingEffects: [],
      phase: "checkingLine", highlightCells: lineResult.positions,
      logs: [...state.logs, `¡3 en línea de ${findName(lineResult.user)}!`],
    }
  }
  return {
    ...state, pendingEffects: [],
    phase: "endOfTurn" as GameState["phase"],
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const players = createPlayers(action.playerConfigs)
      const newState: GameState = {
        ...createInitialState(),
        phase: "startOfTurn",
        players,
        turnNumber: 1,
        logs: ["¡Comienza el juego!"],
      }
      return processTurnEffects(newState)
    }
    case "SELECT_HAND_PIECE": {
      const player = state.players[state.currentPlayerIndex]
      if (action.index < 0 || action.index >= player.hand.length) return state
      if (state.phase !== "placing") return state
      const hp = player.hand[action.index]
      if (hp.piece.power === IPowers.Negador) {
        return {
          ...state,
          selectedHandPieceIndex: action.index,
          phase: "waitingForTarget",
          highlightCells: [],
          pendingEffects: [{
            id: "negador",
            description: "Selecciona una ficha en el tablero para anular su efecto",
            sourcePos: { row: -1, col: -1 },
            sourceUser: player.user,
            targets: [],
            needsTargetSelection: true,
            availableTargets: getAllNonEmptyCells(state.board),
          }],
        }
      }
      return { ...state, selectedHandPieceIndex: action.index }
    }
    case "PLACE_PIECE": {
      const { row, col } = action
      if (state.phase !== "placing") return state
      if (state.selectedHandPieceIndex === null) return state
      if (!isValidPlacement(state.board, row, col)) return state
      const player = state.players[state.currentPlayerIndex]
      const hp = player.hand[state.selectedHandPieceIndex]
      const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
      newBoard[row][col] = {
        piece: hp.piece,
        user: player.user,
        variationIndex: hp.variationIndex,
        turnPlaced: state.turnNumber,
        isWall: false,
        direction: 0,
      }
      const newHand = player.hand.filter((_, i) => i !== state.selectedHandPieceIndex)
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )
      const log = `${player.name} colocó ${hp.piece.power.replaceAll("_", " ")} en [${row + 1}, ${col + 1}]`
      if (hp.piece.action === "INSTANTANEA") {
        const effects = buildInstantEffects(newBoard, row, col, hp, player.name, player.user)
        if (effects.length > 0) {
          return {
            ...state, board: newBoard, players: newPlayers, scoredThisTurn: false,
            selectedHandPieceIndex: null,
            phase: "resolvingEffects", pendingEffects: effects,
            logs: [...state.logs, log],
          }
        }
      }
      const lineResult = findThreeInLine(newBoard)
      if (lineResult) {
        return {
          ...state, board: newBoard, players: newPlayers, scoredThisTurn: false,
          selectedHandPieceIndex: null,
          phase: "checkingLine", highlightCells: lineResult.positions,
          logs: [...state.logs, log, `¡3 en línea de ${player.name}!`],
        }
      }
      return {
        ...state, board: newBoard, players: newPlayers, scoredThisTurn: false,
        selectedHandPieceIndex: null,
        phase: "endOfTurn" as GameState["phase"],
        logs: [...state.logs, log],
      }
    }
    case "SELECT_TARGET": {
      if (state.phase === "waitingForTarget") {
        const pe = state.pendingEffects[0]
        if (!pe) return state
        const target = pe.availableTargets.find(t => t.row === action.row && t.col === action.col)
        if (!target) return state
        const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
        const targetCell = newBoard[target.row][target.col]
        if (targetCell) {
          targetCell.piece = { ...targetCell.piece, power: IPowers.Sin_Efecto as IPowers }
        }
        const player = state.players[state.currentPlayerIndex]
        const newHand = player.hand.filter((_, i) => i !== state.selectedHandPieceIndex)
        const newPlayers = state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
        )
        return {
          ...state, board: newBoard, players: newPlayers,
          selectedHandPieceIndex: null,
          phase: "endOfTurn" as GameState["phase"],
          pendingEffects: [], highlightCells: [],
          logs: [...state.logs, `Negador anuló efecto en [${target.row + 1}, ${target.col + 1}]`],
        }
      }
      if (state.phase === "resolvingEffects") {
        return resolveEffectWithTarget(state, action.row, action.col)
      }
      return state
    }
    case "RESOLVED_EFFECT": {
      if (state.pendingEffects.length === 0) return advanceFromEmptyEffects(state)
      const [current, ...rest] = state.pendingEffects
      if (current.needsTargetSelection) return state
      const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
      for (const t of current.targets) {
        const c = newBoard[t.row][t.col]
        if (c && !c.isWall) newBoard[t.row][t.col] = null
      }
      for (const p of current.piecesToPlace || []) {
        newBoard[p.position.row][p.position.col] = {
          piece: p.piece, user: p.user,
          variationIndex: p.variationIndex,
          turnPlaced: 0, isWall: false, direction: 0,
        }
      }
      for (const m of current.piecesToMove || []) {
        const piece = newBoard[m.from.row][m.from.col]
        if (piece && !piece.isWall) {
          newBoard[m.to.row][m.to.col] = piece
          newBoard[m.from.row][m.from.col] = null
        }
      }
      const logs = [...state.logs, current.description]
      if (rest.length > 0) {
        return { ...state, board: newBoard, pendingEffects: rest, logs }
      }
      const lineResult = state.scoredThisTurn ? null : findThreeInLine(newBoard)
      if (lineResult) {
        const findName = (u: IUsers) => state.players.find(p => p.user === u)?.name || "alguien"
        return {
          ...state, board: newBoard, pendingEffects: [],
          phase: "checkingLine", highlightCells: lineResult.positions,
          logs: [...logs, `¡3 en línea de ${findName(lineResult.user)}!`],
        }
      }
      return {
        ...state, board: newBoard, pendingEffects: [],
        phase: "endOfTurn" as GameState["phase"], logs,
      }
    }
    case "NEXT_TURN": {
      if (state.phase === "startOfTurn") return processTurnEffects(state)
      if (state.phase !== "endOfTurn" && state.phase !== "checkingLine") return state
      if (state.phase === "checkingLine") {
        return resolveLine(state)
      }
      const nextPlayer = (state.currentPlayerIndex + 1) % state.players.length
      const nextTurn = state.turnNumber + 1
      const newState: GameState = {
        ...state,
        phase: "startOfTurn",
        currentPlayerIndex: nextPlayer,
        turnNumber: nextTurn,
        scoredThisTurn: false,
        selectedHandPieceIndex: null,
        pendingEffects: [],
        highlightCells: [],
        logs: [...state.logs, `--- Turno ${nextTurn}: ${state.players[nextPlayer].name} ---`],
      }
      return processTurnEffects(newState)
    }
    case "ADD_LOG": {
      return { ...state, logs: [...state.logs, action.message] }
    }
    case "CLEAR_HIGHLIGHTS": {
      return { ...state, highlightCells: [] }
    }
    default:
      return state
  }
}
