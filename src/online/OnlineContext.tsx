/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from "react"
import type { GameState } from "../game/types"

interface OnlineContextValue {
  connected: boolean
  send: (msg: unknown) => void
  subscribe: (handler: (msg: Record<string, unknown>) => void) => () => void
  clientId: string | null
  lastGameState: GameState | null
}

const OnlineContext = createContext<OnlineContextValue | null>(null)

export function OnlineProvider({ children, url }: { children: ReactNode; url?: string }) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [lastGameState, setLastGameState] = useState<GameState | null>(null)
  const handlersRef = useRef<Set<(msg: Record<string, unknown>) => void>>(new Set())

  useEffect(() => {
    const wsUrl = url || `/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setClientId(null)
    }
    ws.onerror = () => setConnected(false)
    ws.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      if (msg.type === "connected") {
        setClientId(msg.clientId)
      }
      if (msg.type === "game_state_update") {
        setLastGameState(msg.state as GameState)
      }
      for (const handler of handlersRef.current) {
        handler(msg)
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
      setConnected(false)
      setClientId(null)
      setLastGameState(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const subscribe = useCallback((handler: (msg: Record<string, unknown>) => void) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  return (
    <OnlineContext.Provider value={{ connected, send, subscribe, clientId, lastGameState }}>
      {children}
    </OnlineContext.Provider>
  )
}

export function useOnline() {
  const ctx = useContext(OnlineContext)
  if (!ctx) throw new Error("useOnline debe usarse dentro de OnlineProvider")
  return ctx
}
