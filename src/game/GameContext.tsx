import { createContext, useContext, useReducer, type ReactNode } from "react"
import type { GameState, GameAction } from "./types"
import { createInitialState, gameReducer } from "./state"

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({
  children,
  externalState,
  externalDispatch,
  initialState,
}: {
  children: ReactNode
  externalState?: GameState
  externalDispatch?: React.Dispatch<GameAction>
  initialState?: GameState
}) {
  const [localState, localDispatch] = useReducer(
    gameReducer,
    initialState ?? null,
    initialState ? () => initialState : createInitialState
  )
  const state = externalState ?? localState
  const dispatch = externalDispatch ?? localDispatch
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}
