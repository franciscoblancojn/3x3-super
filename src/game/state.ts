import { IUsers } from "../interface/users"
import { IPowers } from "../interface/powers"
import { FICHAS_MANO, FICHAS_ACTIVACION, FICHAS_DESTRUCCION, FICHAS_INSTANTANEA, FICHAS_TURNO, FICHAS_SIN_EFECTO } from "../data/fichas"
import type { GameState, GameAction, PlayerState, BoardGrid, HandPiece, Position, PendingEffect, TurnEffectSource } from "./types"

const BOARD_SIZE = 7
const MAX_HAND_SIZE = 3

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

function findSinEfectoInHand(hand: HandPiece[]): number {
  return hand.findIndex(h => h.piece.power === IPowers.Sin_Efecto)
}

function removeSinEfectoFromHand(hand: HandPiece[]): HandPiece[] {
  const idx = findSinEfectoInHand(hand)
  if (idx === -1) return hand
  return hand.filter((_, i) => i !== idx)
}

function refillHand(hand: HandPiece[], deck: HandPiece[]): { hand: HandPiece[]; deck: HandPiece[] } {
  const needed = MAX_HAND_SIZE - hand.length
  if (needed <= 0) return { hand, deck }
  const { drawn, remaining } = drawFromDeck(deck, needed)
  return { hand: [...hand, ...drawn], deck: remaining }
}

function generateSharedDeck(): HandPiece[] {
  const deck: HandPiece[] = []
  const allGroups = [
    FICHAS_MANO, FICHAS_ACTIVACION, FICHAS_DESTRUCCION,
    FICHAS_INSTANTANEA, FICHAS_TURNO, FICHAS_SIN_EFECTO,
  ]
  for (const group of allGroups) {
    for (const f of group) {
      for (let q = 0; q < (f.quantity ?? 1); q++) {
        deck.push({ piece: f })
      }
    }
  }
  return shuffleArray(deck)
}

function drawFromDeck(deck: HandPiece[], count: number): { drawn: HandPiece[]; remaining: HandPiece[] } {
  const drawn = deck.slice(0, count)
  const remaining = deck.slice(count)
  return { drawn, remaining }
}

function drawOneFromDeck(deck: HandPiece[]): { drawn: HandPiece | null; remaining: HandPiece[] } {
  if (deck.length === 0) return { drawn: null, remaining: [] }
  return { drawn: deck[0], remaining: deck.slice(1) }
}

function regenerateDeckIfNeeded(deck: HandPiece[], players: PlayerState[]): { deck: HandPiece[]; players: PlayerState[] } {
  if (deck.length > MAX_HAND_SIZE) return { deck, players }
  const totalCardsInHands = players.reduce((sum, p) => sum + p.hand.length, 0)
  if (totalCardsInHands === 0) return { deck: generateSharedDeck(), players }
  const newDeck = shuffleArray([...deck, ...generateSharedDeck()])
  return { deck: newDeck, players }
}

function createPlayers(configs: { name: string; user: IUsers }[], sharedDeck: HandPiece[]): { players: PlayerState[]; remainingDeck: HandPiece[] } {
  let deck = [...sharedDeck]
  const players: PlayerState[] = configs.map((c) => {
    const { drawn, remaining } = drawFromDeck(deck, MAX_HAND_SIZE)
    deck = remaining
    return {
      name: c.name,
      user: c.user,
      score: 0,
      hand: drawn,
    }
  })
  return { players, remainingDeck: deck }
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
    selectedVariationIndex: null,
    selectedDirection: 0,
    pendingEffects: [],
    logs: [],
    scoreToWin: 5,
    highlightCells: [],
    scoredThisTurn: false,
    sharedDeck: [],
    pendingLine: null,
    turnEffectQueue: [],
    afterEffectsPhase: null,
    availableLines: [],
    germenUsedThisTurn: false,
    destructorUsedThisTurn: false,
  }
}

function isValidPlacement(board: BoardGrid, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false
  return !board[row][col]
}

function getRotatedVariation(base: number[][], direction: number): number[][] {
  const dir = ((direction % 4) + 4) % 4
  if (dir === 0) return base
  const size = 3
  const result: number[][] = Array.from({ length: size }, () => Array(size).fill(0))
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let sr: number, sc: number
      switch (dir) {
        case 1: sr = size - 1 - c; sc = r; break
        case 2: sr = size - 1 - r; sc = size - 1 - c; break
        case 3: sr = c; sc = size - 1 - r; break
        default: sr = r; sc = c
      }
      result[r][c] = base[sr][sc]
    }
  }
  return result
}

function getArrowDirections(baseVariation: number[][], direction: number, power: IPowers): { dr: number; dc: number }[] {
  const variation = getRotatedVariation(baseVariation, direction)
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

function findAllThreeInLine(board: BoardGrid): { positions: Position[]; user: IUsers }[] {
  const result: { positions: Position[]; user: IUsers }[] = []
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  const seen = new Set<string>()
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
          const key = line.slice(0, 3).map(p => `${p.row},${p.col}`).sort().join("|")
          if (!seen.has(key)) {
            seen.add(key)
            result.push({ positions: line.slice(0, 3), user: cell.user })
          }
        }
      }
    }
  }
  return result
}

function findThreeInLine(board: BoardGrid): { positions: Position[]; user: IUsers } | null {
  const all = findAllThreeInLine(board)
  return all.length > 0 ? all[0] : null
}

function pushAllPiecesInDirection(
  board: BoardGrid, dr: number, dc: number
): { piecesToMove: { from: Position; to: Position }[] } {
  const allPieces: { r: number; c: number }[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c]
      if (cell && !cell.isWall && cell.piece.power !== IPowers.Muro) {
        allPieces.push({ r, c })
      }
    }
  }
  if (dr > 0) allPieces.sort((a, b) => b.r - a.r)
  else if (dr < 0) allPieces.sort((a, b) => a.r - b.r)
  else if (dc > 0) allPieces.sort((a, b) => b.c - a.c)
  else allPieces.sort((a, b) => a.c - b.c)
  const originSet = new Set(allPieces.map(p => `${p.r},${p.c}`))
  const piecesToMove: { from: Position; to: Position }[] = []
  const occupied = new Set<string>()
  for (const piece of allPieces) {
    let nr = piece.r + dr
    let nc = piece.c + dc
    while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      const target = board[nr][nc]
      if (target?.isWall) break
      if ((!board[nr][nc] || originSet.has(`${nr},${nc}`)) && !occupied.has(`${nr},${nc}`)) {
        nr += dr
        nc += dc
      } else {
        break
      }
    }
    nr -= dr
    nc -= dc
    if (nr !== piece.r || nc !== piece.c) {
      piecesToMove.push({ from: { row: piece.r, col: piece.c }, to: { row: nr, col: nc } })
      occupied.add(`${nr},${nc}`)
    }
  }
  return { piecesToMove }
}

interface ClearedCell { pos: Position; cell: BoardCell }

function buildDestructionEffects(
  clearedCells: ClearedCell[], board: BoardGrid
): PendingEffect[] {
  const effects: PendingEffect[] = []
  for (const { pos, cell } of clearedCells) {
    if (cell.isWall) continue
    if (cell.piece.action !== "DESTRUCCION") continue
    if (cell.piece.power === IPowers.Muro) continue
    const baseVariation = cell.piece.variations[cell.variationIndex]
    const dirs = getArrowDirections(baseVariation, cell.direction, cell.piece.power)
    if (cell.piece.power === IPowers.Trampa_Simple) {
      const targets = dirs.map(d => ({ row: pos.row + d.dr, col: pos.col + d.dc }))
        .filter(t => t.row >= 0 && t.row < 7 && t.col >= 0 && t.col < 7 && board[t.row][t.col] && !board[t.row][t.col]!.isWall)
      if (targets.length > 0) {
        effects.push({
          id: `chain-trampa-simple-${pos.row}-${pos.col}`,
          description: `💥 Trampa Simple (en cadena) destruyó ${targets.length} ficha(s)`,
          sourcePos: pos, sourceUser: cell.user, targets,
          needsTargetSelection: false, availableTargets: [],
        })
      }
    }
    if (cell.piece.power === IPowers.Trampa_Lineal) {
      for (const d of dirs) {
        const line = getLineFromStart(board, pos.row + d.dr, pos.col + d.dc, d.dr, d.dc)
          .filter(t => board[t.row][t.col] && !board[t.row][t.col]!.isWall)
        if (line.length > 0) {
          effects.push({
            id: `chain-trampa-lineal-${pos.row}-${pos.col}`,
            description: `💥 Trampa Lineal (en cadena) arrasó una línea`,
            sourcePos: pos, sourceUser: cell.user, targets: line,
            needsTargetSelection: false, availableTargets: [],
          })
        }
      }
    }
  }
  return effects
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

function getAdjacentEnemyCells(board: BoardGrid, row: number, col: number, myUser: IUsers, dirs: { dr: number; dc: number }[]): Position[] {
  const result: Position[] = []
  for (const d of dirs) {
    const nr = row + d.dr, nc = col + d.dc
    if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
    const cell = board[nr][nc]
    if (cell && !cell.isWall && cell.user !== myUser) {
      result.push({ row: nr, col: nc })
    }
  }
  return result
}

function buildInstantEffects(
  board: BoardGrid, row: number, col: number, hp: HandPiece, variationIndex: number, playerName: string, playerUser: IUsers
): PendingEffect[] {
  const effects: PendingEffect[] = []
  const cell = board[row][col]
  const baseVariation = hp.piece.variations[variationIndex]
  const dirs = getArrowDirections(baseVariation, cell ? cell.direction : 0, hp.piece.power)
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
        const { piecesToMove } = pushAllPiecesInDirection(board, d.dr, d.dc)
        if (piecesToMove.length > 0) {
          effects.push({
            id: `peso-${row}-${col}`,
            description: `${playerName} usó Peso → empujó ${piecesToMove.length} ficha(s)`,
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
  const targetCell = newBoard[target.row][target.col]
  const cleared: ClearedCell[] = []
  if (targetCell && !targetCell.isWall) {
    cleared.push({ pos: target, cell: targetCell })
    newBoard[target.row][target.col] = null
  }
  const chainEffects = buildDestructionEffects(cleared, newBoard)
  const logs = [...state.logs, `Francotirador eliminó ficha en [${target.row + 1}, ${target.col + 1}]`]

  if (chainEffects.length > 0) {
    return {
      ...state, board: newBoard, pendingEffects: chainEffects,
      phase: "resolvingEffects",
      logs: [...logs, `💥 Efecto en cadena por destrucción...`],
    }
  }

  const allLines = findAllThreeInLine(newBoard)
  if (allLines.length > 0) {
    if (allLines.length === 1) {
      return {
        ...state, board: newBoard, pendingEffects: [],
        phase: "checkingLine", highlightCells: allLines[0].positions,
        logs: [...logs, `¡3 en línea de ${state.players[state.currentPlayerIndex].name}!`],
      }
    }
    return {
      ...state, board: newBoard, pendingEffects: [],
      phase: "choosingLine", availableLines: allLines, highlightCells: [],
      logs: [...logs, `¡Múltiples 3 en línea! Selecciona una.`],
    }
  }
  return {
    ...state, board: newBoard, pendingEffects: [],
    phase: "endOfTurn" as GameState["phase"], highlightCells: [], logs,
  }
}

function collectTurnEffectSources(state: GameState): TurnEffectSource[] {
  const player = state.players[state.currentPlayerIndex]
  const board = state.board
  const turnOrder = [IPowers.Destructor, IPowers.Germen, IPowers.Corredor, IPowers.Incendio]
  const sources: TurnEffectSource[] = []
  for (const power of turnOrder) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = board[r][c]
        if (!cell || cell.user !== player.user || cell.isWall) continue
        if (cell.piece.power !== power) continue
        if (cell.turnPlaced === state.turnNumber) continue
        sources.push({ row: r, col: c, power })
      }
    }
  }
  return sources
}

function buildEffectFromSource(state: GameState, source: TurnEffectSource): PendingEffect | null {
  const { row, col, power } = source
  const cell = state.board[row]?.[col]
  if (!cell || cell.isWall) return null
  if (cell.piece.power !== power) return null
  const player = state.players[state.currentPlayerIndex]
  const board = state.board
  const baseVariation = cell.piece.variations[cell.variationIndex]
  const dirs = getArrowDirections(baseVariation, cell.direction, power)

  if (power === IPowers.Destructor) {
    if (state.destructorUsedThisTurn) return null
    for (const d of dirs) {
      const nr = row + d.dr, nc = col + d.dc
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
      const target = board[nr][nc]
      if (target && !target.isWall) {
        return {
          id: `destructor-destroy-${row}-${col}`,
          description: `Destructor destruyó ficha en [${nr + 1}, ${nc + 1}]`,
          sourcePos: { row, col },
          sourceUser: player.user,
          targets: [{ row: nr, col: nc }],
          needsTargetSelection: false,
          availableTargets: [],
          sourceUpdates: { direction: (cell.direction + 1) % 4 },
          effectPower: IPowers.Destructor,
        }
      } else if (!target) {
        const sinIdx = findSinEfectoInHand(player.hand)
        if (sinIdx !== -1) {
          return {
            id: `destructor-place-${row}-${col}`,
            description: `Destructor → colocar ficha sin efecto en [${nr + 1}, ${nc + 1}]?`,
            sourcePos: { row, col },
            sourceUser: player.user,
            targets: [],
            piecesToPlace: [{
              position: { row: nr, col: nc },
              piece: FICHAS_SIN_EFECTO[0],
              user: player.user,
              variationIndex: 0,
            }],
            needsTargetSelection: false,
            availableTargets: [],
            sourceUpdates: { direction: (cell.direction + 1) % 4 },
            effectPower: IPowers.Destructor,
            consumeSinEfecto: true,
            optional: true,
          }
        }
        return {
          id: `destructor-rotate-${row}-${col}`,
          description: `Destructor giró en [${row + 1}, ${col + 1}]`,
          sourcePos: { row, col },
          sourceUser: player.user,
          targets: [],
          needsTargetSelection: false,
          availableTargets: [],
          sourceUpdates: { direction: (cell.direction + 1) % 4 },
          effectPower: IPowers.Destructor,
        }
      }
    }
    return null
  }

  if (power === IPowers.Germen) {
    if (state.germenUsedThisTurn) return null
    for (const d of dirs) {
      const nr = row + d.dr, nc = col + d.dc
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
      const target = board[nr][nc]
      if (target && !target.isWall && target.user !== player.user) {
        const sinIdx = findSinEfectoInHand(player.hand)
        if (sinIdx !== -1) {
          return {
            id: `germen-${row}-${col}`,
            description: `Germen → infectar ficha en [${nr + 1}, ${nc + 1}]?`,
            sourcePos: { row, col },
            sourceUser: player.user,
            targets: [],
            needsTargetSelection: true,
            availableTargets: [{ row: nr, col: nc }],
            effectPower: IPowers.Germen,
            consumeSinEfecto: true,
            optional: true,
          }
        }
        return null
      }
    }
    return null
  }

  if (power === IPowers.Corredor) {
    // Collect valid 1-cell destinations in each arrow direction
    const validDests: Position[] = []
    for (const d of dirs) {
      const nr = row + d.dr, nc = col + d.dc
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
      const cell = board[nr][nc]
      if (cell?.isWall) continue  // walls block movement
      validDests.push({ row: nr, col: nc })
    }
    if (validDests.length === 0) return null

    const destLabel = (p: Position) => {
      const destCell = board[p.row][p.col]
      return destCell && !destCell.isWall
        ? `[${p.row + 1}, ${p.col + 1}] (destruye)`
        : `[${p.row + 1}, ${p.col + 1}]`
    }

    if (validDests.length === 1) {
      const dest = validDests[0]
      const destCell = board[dest.row][dest.col]
      const hasPiece = !!destCell && !destCell.isWall
      return {
        id: `corredor-move-${row}-${col}`,
        description: `Corredor avanza a ${destLabel(dest)}`,
        sourcePos: { row, col },
        sourceUser: player.user,
        targets: hasPiece ? [dest] : [],
        piecesToMove: [{ from: { row, col }, to: dest }],
        needsTargetSelection: false,
        availableTargets: [],
        effectPower: IPowers.Corredor,
      }
    }

    // Multiple valid destinations: player chooses
    return {
      id: `corredor-choose-${row}-${col}`,
      description: `Corredor → selecciona a donde moverse`,
      sourcePos: { row, col },
      sourceUser: player.user,
      targets: [],
      needsTargetSelection: true,
      availableTargets: validDests,
      effectPower: IPowers.Corredor,
    }
  }

  if (power === IPowers.Incendio) {
    const targets: Position[] = []
    for (const d of dirs) {
      const nr = row + d.dr, nc = col + d.dc
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) continue
      const target = board[nr][nc]
      if (target && !target.isWall) targets.push({ row: nr, col: nc })
    }
    if (targets.length === 0) {
      return {
        id: `incendio-self-${row}-${col}`,
        description: `Incendio no encontró objetivo y se autodestruyó en [${row + 1}, ${col + 1}]`,
        sourcePos: { row, col },
        sourceUser: player.user,
        targets: [{ row, col }],
        needsTargetSelection: false,
        availableTargets: [],
        effectPower: IPowers.Incendio,
      }
    } else if (targets.length === 1) {
      return {
        id: `incendio-${row}-${col}`,
        description: `Incendio quemó ficha en [${targets[0].row + 1}, ${targets[0].col + 1}]`,
        sourcePos: { row, col },
        sourceUser: player.user,
        targets,
        needsTargetSelection: false,
        availableTargets: [],
        effectPower: IPowers.Incendio,
      }
    } else {
      return {
        id: `incendio-choose-${row}-${col}`,
        description: `Incendio → selecciona qué ficha quemar`,
        sourcePos: { row, col },
        sourceUser: player.user,
        targets: [],
        needsTargetSelection: true,
        availableTargets: targets,
        effectPower: IPowers.Incendio,
      }
    }
  }

  return null
}

function resolveLine(state: GameState): GameState {
  const line = state.highlightCells
  if (line.length === 0) return { ...state, phase: "endOfTurn" as GameState["phase"] }
  const playerIdx = state.currentPlayerIndex
  const player = state.players[playerIdx]
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  const activationLogs: string[] = []
  const activationEffects: PendingEffect[] = []

  for (const pos of line) {
    const cell = newBoard[pos.row][pos.col]
    if (!cell) continue
    if (cell.piece.power === IPowers.Protector) {
      const baseVariation = cell.piece.variations[cell.variationIndex]
      const dirs = getArrowDirections(baseVariation, cell.direction, IPowers.Protector)
      const protectedPieces: Position[] = []
      for (const d of dirs) {
        const nr = pos.row + d.dr, nc = pos.col + d.dc
        if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) {
          const target = newBoard[nr][nc]
          if (target && target.piece.power !== IPowers.Protector && line.some(l => l.row === nr && l.col === nc)) {
            protectedPieces.push({ row: nr, col: nc })
          }
        }
      }
      for (const p of protectedPieces) {
        activationLogs.push(`Protector salvó ficha en [${p.row + 1}, ${p.col + 1}]`)
      }
      continue
    }
    if (cell.piece.power === IPowers.Duplicador) {
      const baseVariation = cell.piece.variations[cell.variationIndex]
      const dirs = getArrowDirections(baseVariation, cell.direction, IPowers.Duplicador)
      const available: Position[] = []
      for (const d of dirs) {
        const nr = pos.row + d.dr, nc = pos.col + d.dc
        if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && !newBoard[nr][nc]) {
          available.push({ row: nr, col: nc })
        }
      }
      if (available.length === 1) {
        const d = available[0]
        newBoard[d.row][d.col] = { ...cell }
        activationLogs.push(`Duplicador creó copia en [${d.row + 1}, ${d.col + 1}]`)
      } else if (available.length > 1) {
        activationEffects.push({
          id: `duplicador-${pos.row}-${pos.col}`,
          description: `Duplicador → selecciona dónde duplicar`,
          sourcePos: pos,
          sourceUser: cell.user,
          targets: [],
          piecesToPlace: [],
          needsTargetSelection: true,
          availableTargets: available,
          effectPower: IPowers.Duplicador,
        })
      }
    }
  }

  if (activationEffects.length > 0) {
    return {
      ...state,
      board: newBoard,
      phase: "resolvingActivations",
      pendingEffects: activationEffects,
      pendingLine: line,
      logs: [...state.logs, ...activationLogs],
    }
  }

  return finishLineResolution(state, newBoard, line, activationLogs, playerIdx, player)
}

function finishLineResolution(
  state: GameState,
  newBoard: BoardGrid,
  line: Position[],
  activationLogs: string[],
  playerIdx: number,
  player: PlayerState,
): GameState {
  const destructionEffects: PendingEffect[] = []

  const protectedPositions = new Set<string>()
  for (const pos of line) {
    const cell = newBoard[pos.row][pos.col]
    if (!cell || cell.piece.power !== IPowers.Protector) continue
    const baseVariation = cell.piece.variations[cell.variationIndex]
    const dirs = getArrowDirections(baseVariation, cell.direction, IPowers.Protector)
    for (const d of dirs) {
      const nr = pos.row + d.dr, nc = pos.col + d.dc
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) {
        const target = newBoard[nr][nc]
        if (target && target.piece.power !== IPowers.Protector && line.some(l => l.row === nr && l.col === nc)) {
          protectedPositions.add(`${nr},${nc}`)
        }
      }
    }
  }

  const toDestroy = line.filter(pos => {
    const cell = newBoard[pos.row][pos.col]
    if (!cell) return false
    if (protectedPositions.has(`${pos.row},${pos.col}`)) return false
    return true
  })

  for (const pos of toDestroy) {
    const cell = newBoard[pos.row][pos.col]
    if (!cell) continue
    const baseVariation = cell.piece.variations[cell.variationIndex]
    const dirs = getArrowDirections(baseVariation, cell.direction, cell.piece.power)
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
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            const wc = newBoard[r][c]
            if (wc && wc.isWall && !(r === pos.row && c === pos.col)) {
              newBoard[r][c] = null
            }
          }
        }
        newBoard[pos.row][pos.col] = { ...cell, isWall: true, turnPlaced: state.turnNumber }
        break
      }
    }
  }

  for (const pos of toDestroy) {
    const cell = newBoard[pos.row][pos.col]
    if (cell && cell.piece.power === IPowers.Muro) continue
    newBoard[pos.row][pos.col] = null
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
      pendingLine: null,
      logs: [...logs, `🎉 ¡${newPlayers[winnerIdx].name} ganó la partida!`],
    }
  }

  if (destructionEffects.length > 0) {
    return {
      ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
      phase: "resolvingEffects", pendingEffects: destructionEffects,
      highlightCells: [], pendingLine: null, logs,
    }
  }

  const remainingLines = findAllThreeInLine(newBoard)
  if (remainingLines.length > 0) {
    if (remainingLines.length === 1) {
      return {
        ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
        phase: "checkingLine", highlightCells: remainingLines[0].positions,
        pendingLine: null, logs: [...logs, `¡3 en línea de ${state.players.find(p => p.user === remainingLines[0].user)?.name || "alguien"}!`],
      }
    }
    return {
      ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
      phase: "choosingLine", availableLines: remainingLines, highlightCells: [],
      pendingLine: null,
      logs: [...logs, `¡Múltiples 3 en línea! Selecciona una.`],
    }
  }

  return {
    ...state, board: newBoard, players: newPlayers, scoredThisTurn: true,
    phase: "endOfTurn" as GameState["phase"], highlightCells: [], pendingLine: null, logs,
  }
}

function advanceFromEmptyEffects(state: GameState): GameState {
  if (state.pendingEffects.length > 0) return state
  if (state.phase !== "resolvingEffects") return state
  const allLines = findAllThreeInLine(state.board)
  if (allLines.length > 0) {
    if (allLines.length === 1) {
      return {
        ...state, pendingEffects: [], afterEffectsPhase: null,
        phase: "checkingLine", highlightCells: allLines[0].positions,
        logs: [...state.logs, `¡3 en línea de ${state.players.find(p => p.user === allLines[0].user)?.name || "alguien"}!`],
      }
    }
    return {
      ...state, pendingEffects: [], afterEffectsPhase: null,
      phase: "choosingLine", availableLines: allLines, highlightCells: [],
      logs: [...state.logs, `¡Múltiples 3 en línea! Selecciona una.`],
    }
  }
  if (state.afterEffectsPhase) {
    return {
      ...state, pendingEffects: [],
      phase: state.afterEffectsPhase,
      afterEffectsPhase: null,
      selectedHandPieceIndex: null, selectedVariationIndex: null, selectedDirection: 0,
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
      const sharedDeck = generateSharedDeck()
      const { players, remainingDeck } = createPlayers(action.playerConfigs, sharedDeck)
      const newState: GameState = {
        ...createInitialState(),
        phase: "startOfTurn",
        players,
        sharedDeck: remainingDeck,
        turnNumber: 1,
        logs: ["¡Comienza el juego!"],
      }
      return processTurnStart(newState)
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
      return {
        ...state,
        selectedHandPieceIndex: action.index,
        selectedVariationIndex: 0,
        selectedDirection: 0,
        phase: hp.piece.haveRotate ? "choosingDirection" : "placing",
      }
    }
    case "CHOOSE_VARIATION": {
      if (state.phase !== "choosingVariation") return state
      const player = state.players[state.currentPlayerIndex]
      if (state.selectedHandPieceIndex === null) return state
      const hp = player.hand[state.selectedHandPieceIndex]
      if (action.index < 0 || action.index >= hp.piece.variations.length) return state
      return {
        ...state,
        selectedVariationIndex: action.index,
        selectedDirection: 0,
        phase: hp.piece.variations.length > 1 ? "choosingDirection" as const : "placing",
      }
    }
    case "CHOOSE_DIRECTION": {
      if (state.phase !== "choosingDirection") return state
      return {
        ...state,
        selectedDirection: action.direction,
        phase: "placing",
      }
    }
    case "PLACE_PIECE": {
      const { row, col } = action
      if (state.phase !== "placing") return state
      if (state.selectedHandPieceIndex === null) return state
      if (state.selectedVariationIndex === null) return state
      if (!isValidPlacement(state.board, row, col)) return state
      const player = state.players[state.currentPlayerIndex]
      const hp = player.hand[state.selectedHandPieceIndex]
      const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
      newBoard[row][col] = {
        piece: hp.piece,
        user: player.user,
        variationIndex: state.selectedVariationIndex,
        turnPlaced: state.turnNumber,
        isWall: false,
        direction: state.selectedDirection,
      }
      const newHand = player.hand.filter((_, i) => i !== state.selectedHandPieceIndex)
      const { drawn, remaining: deckAfterDraw } = drawOneFromDeck(state.sharedDeck)
      const finalHand = drawn ? [...newHand, drawn] : newHand
      let finalDeck = deckAfterDraw
      let finalPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: finalHand } : p
      )
      const { deck: regenDeck, players: regenPlayers } = regenerateDeckIfNeeded(finalDeck, finalPlayers)
      finalDeck = regenDeck
      finalPlayers = regenPlayers

      const log = `${player.name} colocó ${hp.piece.power.replaceAll("_", " ")} en [${row + 1}, ${col + 1}]`

      if (hp.piece.action === "INSTANTANEA") {
        const effects = buildInstantEffects(newBoard, row, col, hp, state.selectedVariationIndex, player.name, player.user)
        if (effects.length > 0) {
          const needsChoice = effects.some(e => e.needsTargetSelection)
          if (needsChoice) {
            return {
              ...state, board: newBoard, players: finalPlayers, sharedDeck: finalDeck,
              scoredThisTurn: false,
              selectedHandPieceIndex: null, selectedVariationIndex: null,
              phase: "resolvingEffects", pendingEffects: effects,
              logs: [...state.logs, log],
            }
          }
          let boardAfterEffects = newBoard
          const allCleared: ClearedCell[] = []
          for (const effect of effects) {
            for (const t of effect.targets) {
              const c = boardAfterEffects[t.row][t.col]
              if (c && !c.isWall) {
                allCleared.push({ pos: t, cell: c })
                boardAfterEffects[t.row][t.col] = null
              }
            }
            for (const p of effect.piecesToPlace || []) {
              boardAfterEffects[p.position.row][p.position.col] = {
                piece: p.piece, user: p.user,
                variationIndex: p.variationIndex,
                turnPlaced: 0, isWall: false, direction: 0,
              }
            }
            for (const m of effect.piecesToMove || []) {
              const piece = boardAfterEffects[m.from.row][m.from.col]
              if (piece && !piece.isWall) {
                boardAfterEffects[m.to.row][m.to.col] = piece
                boardAfterEffects[m.from.row][m.from.col] = null
              }
            }
          }
          const chainFromInstant = buildDestructionEffects(allCleared, boardAfterEffects)
          const fullLogs = [...state.logs, log, ...effects.map(e => e.description)]
          if (chainFromInstant.length > 0) {
            return {
              ...state, board: boardAfterEffects, players: finalPlayers, sharedDeck: finalDeck,
              scoredThisTurn: false,
              selectedHandPieceIndex: null, selectedVariationIndex: null,
              phase: "resolvingEffects", pendingEffects: chainFromInstant,
              afterEffectsPhase: "endOfTurn",
              logs: [...fullLogs, `💥 Efecto en cadena por destrucción...`],
            }
          }
          const allLines = findAllThreeInLine(boardAfterEffects)
          if (allLines.length > 0) {
            if (allLines.length === 1) {
              return {
                ...state, board: boardAfterEffects, players: finalPlayers, sharedDeck: finalDeck,
                scoredThisTurn: false,
                selectedHandPieceIndex: null, selectedVariationIndex: null,
                phase: "checkingLine", highlightCells: allLines[0].positions,
                pendingEffects: [],
                logs: [...fullLogs, `¡3 en línea de ${player.name}!`],
              }
            }
            return {
              ...state, board: boardAfterEffects, players: finalPlayers, sharedDeck: finalDeck,
              scoredThisTurn: false,
              selectedHandPieceIndex: null, selectedVariationIndex: null,
              phase: "choosingLine", availableLines: allLines, highlightCells: [],
              pendingEffects: [],
              logs: [...fullLogs, `¡Múltiples 3 en línea! Selecciona una.`],
            }
          }
          return {
            ...state, board: boardAfterEffects, players: finalPlayers, sharedDeck: finalDeck,
            scoredThisTurn: false,
            selectedHandPieceIndex: null, selectedVariationIndex: null,
            phase: "endOfTurn" as GameState["phase"], pendingEffects: [],
            logs: fullLogs,
          }
        }
      }
      const allLines = findAllThreeInLine(newBoard)
      if (allLines.length > 0) {
        if (allLines.length === 1) {
          return {
            ...state, board: newBoard, players: finalPlayers, sharedDeck: finalDeck,
            scoredThisTurn: false,
            selectedHandPieceIndex: null, selectedVariationIndex: null,
            phase: "checkingLine", highlightCells: allLines[0].positions,
            logs: [...state.logs, log, `¡3 en línea de ${player.name}!`],
          }
        }
        return {
          ...state, board: newBoard, players: finalPlayers, sharedDeck: finalDeck,
          scoredThisTurn: false,
          selectedHandPieceIndex: null, selectedVariationIndex: null,
          phase: "choosingLine", availableLines: allLines, highlightCells: [],
          logs: [...state.logs, log, `¡Múltiples 3 en línea! Selecciona una.`],
        }
      }
      return {
        ...state, board: newBoard, players: finalPlayers, sharedDeck: finalDeck,
        scoredThisTurn: false,
        selectedHandPieceIndex: null, selectedVariationIndex: null,
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
        const { drawn, remaining: deckAfterDraw } = drawOneFromDeck(state.sharedDeck)
        const finalHand = drawn ? [...newHand, drawn] : newHand
        let finalDeck = deckAfterDraw
        let finalPlayers = state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: finalHand } : p
        )
        const { deck: regenDeck, players: regenPlayers } = regenerateDeckIfNeeded(finalDeck, finalPlayers)
        finalDeck = regenDeck
        finalPlayers = regenPlayers
        return {
          ...state, board: newBoard, players: finalPlayers, sharedDeck: finalDeck,
          selectedHandPieceIndex: null, selectedVariationIndex: null,
          phase: "endOfTurn" as GameState["phase"],
          pendingEffects: [], highlightCells: [],
          logs: [...state.logs, `Negador anuló efecto en [${target.row + 1}, ${target.col + 1}]`],
        }
      }
      if (state.phase === "resolvingEffects") {
        const [current] = state.pendingEffects
        if (current?.effectPower === IPowers.Incendio) {
          return resolveIncendioTarget(state, action.row, action.col)
        }
        if (current?.effectPower === IPowers.Corredor) {
          return resolveCorredorTarget(state, action.row, action.col)
        }
        if (current?.effectPower === IPowers.Germen) {
          return resolveGermenTarget(state, action.row, action.col)
        }
        return resolveEffectWithTarget(state, action.row, action.col)
      }
      if (state.phase === "resolvingActivations") {
        return resolveActivationTarget(state, action.row, action.col)
      }
      return state
    }
    case "RESOLVED_EFFECT": {
      if (state.pendingEffects.length === 0) return advanceFromEmptyEffects(state)
      const [current, ...rest] = state.pendingEffects
      if (current.needsTargetSelection) return state
      const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
      const clearedDestruction: ClearedCell[] = []
      for (const t of current.targets) {
        const c = newBoard[t.row][t.col]
        if (c && !c.isWall) {
          clearedDestruction.push({ pos: t, cell: c })
          newBoard[t.row][t.col] = null
        }
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
      if (current.sourceUpdates) {
        const src = newBoard[current.sourcePos.row]?.[current.sourcePos.col]
        if (src) {
          if (current.sourceUpdates.direction !== undefined) src.direction = current.sourceUpdates.direction
          if (current.sourceUpdates.isWall !== undefined) src.isWall = current.sourceUpdates.isWall
        }
      }

      const chainEffects = buildDestructionEffects(clearedDestruction, newBoard)

      let player = state.players[state.currentPlayerIndex]
      let newPlayers = state.players
      let updatedSharedDeck = state.sharedDeck
      if (current.consumeSinEfecto) {
        const handWithoutSin = removeSinEfectoFromHand(player.hand)
        const { hand: refilled, deck: deckAfterRefill } = refillHand(handWithoutSin, updatedSharedDeck)
        const { deck: regenDeck, players: regenPlayers } = regenerateDeckIfNeeded(deckAfterRefill, state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: refilled } : p
        ))
        updatedSharedDeck = regenDeck
        newPlayers = regenPlayers
        player = newPlayers[state.currentPlayerIndex]
      }

      const logs = [...state.logs, current.description]
      const updatedState = { ...state, board: newBoard, players: newPlayers, logs, sharedDeck: updatedSharedDeck }

      if (current.effectPower === IPowers.Destructor) {
        updatedState.destructorUsedThisTurn = true
      }
      if (current.effectPower === IPowers.Germen) {
        updatedState.germenUsedThisTurn = true
      }

      const combinedRest = [...chainEffects, ...rest]
      if (combinedRest.length > 0) {
        return { ...updatedState, pendingEffects: combinedRest }
      }
      if (state.turnEffectQueue.length > 0) {
        const [nextSource, ...remainingQueue] = state.turnEffectQueue
        const nextEffect = buildEffectFromSource(updatedState, nextSource)
        if (!nextEffect) {
          return processNextTurnEffect(updatedState, remainingQueue, updatedState.logs)
        }
        return {
          ...updatedState, pendingEffects: [nextEffect],
          turnEffectQueue: remainingQueue,
        }
      }

      const allLines = findAllThreeInLine(newBoard)
      if (allLines.length > 0) {
        if (allLines.length === 1) {
          return {
            ...updatedState, pendingEffects: [], afterEffectsPhase: null,
            phase: "checkingLine", highlightCells: allLines[0].positions,
            logs: [...logs, `¡3 en línea de ${state.players.find(p => p.user === allLines[0].user)?.name || "alguien"}!`],
          }
        }
        return {
          ...updatedState, pendingEffects: [], afterEffectsPhase: null,
          phase: "choosingLine", availableLines: allLines, highlightCells: [],
          logs: [...logs, `¡Múltiples 3 en línea! Selecciona una.`],
        }
      }
      if (updatedState.afterEffectsPhase) {
        const targetPhase = updatedState.afterEffectsPhase
        return {
          ...updatedState, pendingEffects: [],
          phase: targetPhase,
          afterEffectsPhase: null,
          selectedHandPieceIndex: null, selectedVariationIndex: null, selectedDirection: 0,
        }
      }
      return {
        ...updatedState, pendingEffects: [],
        phase: "endOfTurn" as GameState["phase"], logs,
      }
    }
    case "SKIP_EFFECT": {
      if (state.phase !== "resolvingEffects") return state
      const [current, ...rest] = state.pendingEffects
      if (!current || !current.optional) return state
      const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
      if (current.sourceUpdates) {
        const src = newBoard[current.sourcePos.row]?.[current.sourcePos.col]
        if (src) {
          if (current.sourceUpdates.direction !== undefined) src.direction = current.sourceUpdates.direction
          if (current.sourceUpdates.isWall !== undefined) src.isWall = current.sourceUpdates.isWall
        }
      }
      const logs = [...state.logs, `${current.description} (saltado)`]
      const updatedState = { ...state, board: newBoard, logs }
      if (current.effectPower === IPowers.Destructor) {
        updatedState.destructorUsedThisTurn = true
      }
      if (current.effectPower === IPowers.Germen) {
        updatedState.germenUsedThisTurn = true
      }
      if (rest.length > 0) {
        return { ...updatedState, pendingEffects: rest }
      }
      if (state.turnEffectQueue.length > 0) {
        const [nextSource, ...remainingQueue] = state.turnEffectQueue
        const nextEffect = buildEffectFromSource(updatedState, nextSource)
        if (!nextEffect) {
          return processNextTurnEffect(updatedState, remainingQueue, updatedState.logs)
        }
        return {
          ...updatedState, pendingEffects: [nextEffect],
          turnEffectQueue: remainingQueue,
        }
      }
      const allLines = findAllThreeInLine(newBoard)
      if (allLines.length > 0) {
        if (allLines.length === 1) {
          return {
            ...updatedState, pendingEffects: [], afterEffectsPhase: null,
            phase: "checkingLine", highlightCells: allLines[0].positions,
            logs: [...logs, `¡3 en línea de ${state.players.find(p => p.user === allLines[0].user)?.name || "alguien"}!`],
          }
        }
        return {
          ...updatedState, pendingEffects: [], afterEffectsPhase: null,
          phase: "choosingLine", availableLines: allLines, highlightCells: [],
          logs: [...logs, `¡Múltiples 3 en línea! Selecciona una.`],
        }
      }
      if (updatedState.afterEffectsPhase) {
        const targetPhase = updatedState.afterEffectsPhase
        return {
          ...updatedState, pendingEffects: [],
          phase: targetPhase,
          afterEffectsPhase: null,
          selectedHandPieceIndex: null, selectedVariationIndex: null, selectedDirection: 0,
        }
      }
      return {
        ...updatedState, pendingEffects: [],
        phase: "endOfTurn" as GameState["phase"], logs,
      }
    }
    case "NEXT_TURN": {
      if (state.phase === "startOfTurn") return processTurnStart(state)
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
        selectedVariationIndex: null,
        selectedDirection: 0,
        pendingEffects: [],
        highlightCells: [],
        turnEffectQueue: [],
        afterEffectsPhase: null,
        germenUsedThisTurn: false,
        destructorUsedThisTurn: false,
        logs: [...state.logs, `--- Turno ${nextTurn}: ${state.players[nextPlayer].name} ---`],
      }
      return processTurnStart(newState)
    }
    case "SELECT_LINE": {
      if (state.phase !== "choosingLine") return state
      if (action.lineIndex < 0 || action.lineIndex >= state.availableLines.length) return state
      const selected = state.availableLines[action.lineIndex]
      return {
        ...state,
        phase: "checkingLine",
        highlightCells: selected.positions,
        availableLines: [],
      }
    }
    case "RESOLVE_LINE": {
      if (state.phase !== "checkingLine") return state
      return resolveLine(state)
    }
    case "REMOVE_PLAYER": {
      const removed = state.players[action.playerIndex]
      if (!removed) return state
      const newBoard = state.board.map(r => r.map(c => c && c.user === removed.user ? null : c ? { ...c } : null))
      const newLogs = [...state.logs, `${removed.name} se desconectó y fue eliminado de la partida`]
      const newPlayers = state.players.filter((_, i) => i !== action.playerIndex)
      if (newPlayers.length <= 1) {
        return {
          ...state,
          board: newBoard,
          players: newPlayers,
          winner: 0,
          phase: "gameOver",
          logs: [...newLogs, `¡${newPlayers[0]?.name || "Nadie"} gana! (único jugador restante)`],
        }
      }
      let newCurrentIndex = state.currentPlayerIndex
      if (action.playerIndex < state.currentPlayerIndex) {
        newCurrentIndex -= 1
      } else if (action.playerIndex === state.currentPlayerIndex) {
        newCurrentIndex = newCurrentIndex % newPlayers.length
      }
      return {
        ...state,
        board: newBoard,
        players: newPlayers,
        currentPlayerIndex: newCurrentIndex,
        selectedHandPieceIndex: null,
        selectedVariationIndex: null,
        selectedDirection: 0,
        phase: "placing",
        highlightCells: [],
        pendingEffects: [],
        turnEffectQueue: [],
        afterEffectsPhase: null,
        logs: newLogs,
      }
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

function processTurnStart(state: GameState): GameState {
  const sources = collectTurnEffectSources(state)
  if (sources.length === 0) {
    const logs = [...state.logs, `🎯 ${state.players[state.currentPlayerIndex].name}, coloca una ficha`]
    return {
      ...state,
      phase: "placing",
      scoredThisTurn: false,
      selectedHandPieceIndex: null,
      selectedVariationIndex: null,
      selectedDirection: 0,
      pendingEffects: [],
      highlightCells: [],
      turnEffectQueue: [],
      afterEffectsPhase: null,
      logs,
    }
  }
  const logs = [...state.logs, `⚡ Efectos de turno de ${state.players[state.currentPlayerIndex].name}...`]
  const firstEffect = buildEffectFromSource(state, sources[0])
  const rest = sources.slice(1)
  if (!firstEffect) {
    return processNextTurnEffect(state, rest, logs)
  }
  return {
    ...state,
    phase: "resolvingEffects",
    pendingEffects: [firstEffect],
    turnEffectQueue: rest,
    highlightCells: [],
    afterEffectsPhase: "placing",
    logs,
  }
}

function processNextTurnEffect(state: GameState, queue: TurnEffectSource[], logs: string[]): GameState {
  if (queue.length === 0) {
    const allLines = findAllThreeInLine(state.board)
    if (allLines.length > 0) {
      if (allLines.length === 1) {
        return {
          ...state, pendingEffects: [], turnEffectQueue: [],
          phase: "checkingLine", highlightCells: allLines[0].positions,
          logs: [...logs, `¡3 en línea de ${state.players.find(p => p.user === allLines[0].user)?.name || "alguien"}!`],
        }
      }
      return {
        ...state, pendingEffects: [], turnEffectQueue: [],
        phase: "choosingLine", availableLines: allLines, highlightCells: [],
        logs: [...logs, `¡Múltiples 3 en línea! Selecciona una.`],
      }
    }
    return {
      ...state, pendingEffects: [], turnEffectQueue: [],
      selectedHandPieceIndex: null, selectedVariationIndex: null, selectedDirection: 0,
      phase: "placing",
      logs: [...logs, `🎯 ${state.players[state.currentPlayerIndex].name}, coloca una ficha`],
    }
  }
  const nextEffect = buildEffectFromSource(state, queue[0])
  if (!nextEffect) {
    return processNextTurnEffect(state, queue.slice(1), logs)
  }
  return {
    ...state,
    phase: "resolvingEffects",
    pendingEffects: [nextEffect],
    turnEffectQueue: queue.slice(1),
    highlightCells: [],
    afterEffectsPhase: "placing",
    logs,
  }
}

function resolveActivationTarget(state: GameState, row: number, col: number): GameState {
  const [current, ...rest] = state.pendingEffects
  if (!current || !current.needsTargetSelection) return state
  const target = current.availableTargets.find(t => t.row === row && t.col === col)
  if (!target) return state
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  const logs = [...state.logs]

  if (current.effectPower === IPowers.Duplicador) {
    const srcCell = newBoard[current.sourcePos.row][current.sourcePos.col]
    if (srcCell) {
      newBoard[target.row][target.col] = { ...srcCell }
      logs.push(`Duplicador creó copia en [${target.row + 1}, ${target.col + 1}]`)
    }
  }

  if (rest.length > 0) {
    return {
      ...state, board: newBoard, pendingEffects: rest, logs,
      phase: "resolvingActivations",
    }
  }

  const playerIdx = state.currentPlayerIndex
  const player = state.players[playerIdx]
  const line = state.pendingLine || []
  return finishLineResolution(
    { ...state, board: newBoard, logs },
    newBoard, line, [], playerIdx, player,
  )
}

function resolveIncendioTarget(state: GameState, row: number, col: number): GameState {
  const [current, ...rest] = state.pendingEffects
  if (!current || !current.needsTargetSelection) return state
  const target = current.availableTargets.find(t => t.row === row && t.col === col)
  if (!target) return state
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  const targetCell = newBoard[target.row][target.col]
  const cleared: ClearedCell[] = []
  if (targetCell && !targetCell.isWall) {
    cleared.push({ pos: target, cell: targetCell })
    newBoard[target.row][target.col] = null
  }
  const chainEffects = buildDestructionEffects(cleared, newBoard)
  const logs = [...state.logs, `Incendio quemó ficha en [${target.row + 1}, ${target.col + 1}]`]

  const combinedRest = [...chainEffects, ...rest]
  if (combinedRest.length > 0) {
    return { ...state, board: newBoard, pendingEffects: combinedRest, logs }
  }
  const afterPhase = state.afterEffectsPhase
  if (afterPhase) {
    return {
      ...state, board: newBoard, pendingEffects: [], logs,
      phase: afterPhase, afterEffectsPhase: null,
      selectedHandPieceIndex: null, selectedVariationIndex: null,
    }
  }
  return {
    ...state, board: newBoard, pendingEffects: [], logs,
    phase: "endOfTurn" as GameState["phase"],
  }
}

function resolveCorredorTarget(state: GameState, row: number, col: number): GameState {
  const [current, ...rest] = state.pendingEffects
  if (!current || !current.needsTargetSelection) return state
  const target = current.availableTargets.find(t => t.row === row && t.col === col)
  if (!target) return state
  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))

  // Destroy any piece already at the destination
  const cleared: ClearedCell[] = []
  const destCell = newBoard[target.row][target.col]
  if (destCell && !destCell.isWall) {
    cleared.push({ pos: target, cell: destCell })
    newBoard[target.row][target.col] = null
  }

  // Move Corredor to destination
  const srcCell = newBoard[current.sourcePos.row][current.sourcePos.col]
  if (srcCell) {
    newBoard[target.row][target.col] = srcCell
    newBoard[current.sourcePos.row][current.sourcePos.col] = null
  }

  const chainEffects = buildDestructionEffects(cleared, newBoard)
  const moveLog = cleared.length > 0
    ? `Corredor avanzó a [${target.row + 1}, ${target.col + 1}] y destruyó ficha`
    : `Corredor avanzó a [${target.row + 1}, ${target.col + 1}]`
  const logs = [...state.logs, moveLog]

  const combinedRest = [...chainEffects, ...rest]
  if (combinedRest.length > 0) {
    return { ...state, board: newBoard, pendingEffects: combinedRest, logs }
  }
  const afterPhase = state.afterEffectsPhase
  if (afterPhase) {
    return {
      ...state, board: newBoard, pendingEffects: [], logs,
      phase: afterPhase, afterEffectsPhase: null,
      selectedHandPieceIndex: null, selectedVariationIndex: null,
    }
  }
  return { ...state, board: newBoard, pendingEffects: [], logs, phase: "endOfTurn" as GameState["phase"] }
}

function resolveGermenTarget(state: GameState, row: number, col: number): GameState {
  const [current, ...rest] = state.pendingEffects
  if (!current || !current.needsTargetSelection) return state
  const target = current.availableTargets.find(t => t.row === row && t.col === col)
  if (!target) return state
  const player = state.players[state.currentPlayerIndex]
  const sinIdx = findSinEfectoInHand(player.hand)
  if (sinIdx === -1) return state

  const newBoard = state.board.map(r => r.map(c => c ? { ...c } : null))
  const oldCell = newBoard[target.row][target.col]
  const cleared: ClearedCell[] = []
  if (oldCell && !oldCell.isWall) {
    cleared.push({ pos: target, cell: oldCell })
    newBoard[target.row][target.col] = null
  }

  const handWithoutSin = removeSinEfectoFromHand(player.hand)
  const { hand: refilledHand, deck: deckAfterRefill } = refillHand(handWithoutSin, state.sharedDeck)
  const { deck: regenDeck, players: newPlayers } = regenerateDeckIfNeeded(deckAfterRefill, state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: refilledHand } : p
  ))

  newBoard[target.row][target.col] = {
    piece: FICHAS_SIN_EFECTO[0],
    user: player.user,
    variationIndex: 0,
    turnPlaced: 0,
    isWall: false,
    direction: 0,
  }

  const chainEffects = buildDestructionEffects(cleared, newBoard)
  const logs = [...state.logs, `Germen infectó ficha en [${target.row + 1}, ${target.col + 1}]`]

  const combinedRest = [...chainEffects, ...rest]
  if (combinedRest.length > 0) {
    return { ...state, board: newBoard, players: newPlayers, sharedDeck: regenDeck, pendingEffects: combinedRest, logs }
  }
  const afterPhase = state.afterEffectsPhase
  if (afterPhase) {
    return {
      ...state, board: newBoard, players: newPlayers, sharedDeck: regenDeck, pendingEffects: [], logs,
      phase: afterPhase, afterEffectsPhase: null,
      selectedHandPieceIndex: null, selectedVariationIndex: null,
    }
  }
  return {
    ...state, board: newBoard, players: newPlayers, sharedDeck: regenDeck, pendingEffects: [], logs,
    phase: "endOfTurn" as GameState["phase"],
  }
}
