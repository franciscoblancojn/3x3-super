/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from "react"
import type { GameState } from "../game/types"

const SESSION_KEY = "game_session_id"

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return Math.random().toString(36).substring(2, 15)
  }
}

interface ReconnectInfo {
  roomId: string
  sessionId: string
  playerName: string
  isHost: boolean
  playerIndex: number
  configs: { name: string; user: string }[]
}

const RECONNECT_KEY = "game_reconnect_info"

function saveReconnectInfo(info: ReconnectInfo) {
  try {
    localStorage.setItem(RECONNECT_KEY, JSON.stringify(info))
  } catch {
    // ignore
  }
}

function loadReconnectInfo(): ReconnectInfo | null {
  try {
    const raw = localStorage.getItem(RECONNECT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearReconnectInfo() {
  try {
    localStorage.removeItem(RECONNECT_KEY)
  } catch {
    // ignore
  }
}

interface OnlineContextValue {
  connected: boolean
  send: (msg: unknown) => void
  subscribe: (handler: (msg: Record<string, unknown>) => void) => () => void
  clientId: string | null
  lastGameState: GameState | null
  sessionId: string
  roomId: string
  reconnectInfo: ReconnectInfo | null
  saveReconnect: (info: ReconnectInfo) => void
  clearReconnect: () => void
  reconnecting: boolean
  setReconnecting: (v: boolean) => void
}

const OnlineContext = createContext<OnlineContextValue | null>(null)

export function OnlineProvider({ children, url }: { children: ReactNode; url?: string }) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [lastGameState, setLastGameState] = useState<GameState | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [roomId, setRoomId] = useState("")
  const handlersRef = useRef<Set<(msg: Record<string, unknown>) => void>>(new Set())
  const sessionId = useRef(getOrCreateSessionId()).current
  const reconnectInfoRef = useRef(loadReconnectInfo())

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
      if (msg.type === "room_created" || msg.type === "room_joined") {
        setRoomId(msg.roomId as string)
      }
      if (msg.type === "reconnected") {
        setReconnecting(false)
        setRoomId((msg as Record<string, unknown>).roomId as string || roomId)
      }
      if (msg.type === "game_state_update") {
        setLastGameState(msg.state as GameState)
      }
      if (msg.type === "room_closed") {
        clearReconnectInfo()
        reconnectInfoRef.current = null
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

  const saveReconnect = useCallback((info: ReconnectInfo) => {
    reconnectInfoRef.current = info
    saveReconnectInfo(info)
  }, [])

  const clearReconnect = useCallback(() => {
    reconnectInfoRef.current = null
    clearReconnectInfo()
  }, [])

  return (
    <OnlineContext.Provider value={{
      connected,
      send,
      subscribe,
      clientId,
      lastGameState,
      sessionId,
      roomId,
      reconnectInfo: reconnectInfoRef.current,
      saveReconnect,
      clearReconnect,
      reconnecting,
      setReconnecting,
    }}>
      {children}
    </OnlineContext.Provider>
  )
}

export function useOnline() {
  const ctx = useContext(OnlineContext)
  if (!ctx) throw new Error("useOnline debe usarse dentro de OnlineProvider")
  return ctx
}

export { loadReconnectInfo, clearReconnectInfo, RECONNECT_KEY }
