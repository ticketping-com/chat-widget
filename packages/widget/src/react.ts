import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type { InitOptions } from '@ticketping/core'
import type { TicketpingApi } from './api.ts'
import { createUserSync, type GetToken, type UserInput } from './adapters/user-sync.ts'
import { createClient } from './client.ts'

export type { GetToken, TicketpingUser, UserInput } from './adapters/user-sync.ts'

export interface TicketpingProviderProps extends Omit<InitOptions, 'integration'> {
  /**
   * The host app's signed-in user. `undefined` while auth is loading (nothing happens), `null`
   * when signed out (logs the previous user out). Changing `userId` switches users.
   */
  user?: UserInput
  /** Fetches a short-lived identity JWT from your server. Without it, `user` is sent unsigned. */
  getToken?: GetToken
  /** An instance from `createTicketping()`. Defaults to a new one owned by this provider. */
  client?: TicketpingApi
  children?: ReactNode
}

export interface TicketpingContextValue {
  client: TicketpingApi
  unreadCount: number
  isOpen: boolean
  open(): void
  close(): void
  toggle(): void
  showNewMessage(prefill?: string): void
  showConversation(conversationId: string): void
  showSpace: TicketpingApi['showSpace']
  update: TicketpingApi['update']
  setContext: TicketpingApi['setContext']
  trackEvent: TicketpingApi['trackEvent']
}

const Context = createContext<TicketpingContextValue | null>(null)

/**
 * Mounts the widget for its subtree. Safe to render on the server: the widget starts in an effect.
 * `publishableKey` and the other init options are read once; remount (change `key`) to change them.
 */
export function TicketpingProvider(props: TicketpingProviderProps): ReactNode {
  const { user, getToken, client: provided, children, ...options } = props
  const [client] = useState(
    () => provided ?? createClient({ version: __VERSION__, integration: 'react' })
  )
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const getTokenRef = useRef(getToken)
  const optionsRef = useRef(options)
  useEffect(() => {
    getTokenRef.current = getToken
  })

  const sync = useMemo(() => createUserSync(client, () => getTokenRef.current), [client])

  useEffect(() => {
    client.init({ ...optionsRef.current, integration: 'react' })
    const refresh = () => {
      setUnreadCount(client.getUnreadCount())
      setIsOpen(client.isOpen())
    }
    const offs = [
      client.on('ready', refresh),
      client.on('open', refresh),
      client.on('close', refresh),
      client.on('unreadCountChange', refresh)
    ]
    refresh()
    return () => {
      for (const off of offs) off()
      client.destroy()
      sync.reset()
    }
  }, [client, sync])

  useEffect(() => {
    sync.sync(user)
  }, [sync, user])

  const value = useMemo<TicketpingContextValue>(
    () => ({
      client,
      unreadCount,
      isOpen,
      open: () => client.open(),
      close: () => client.close(),
      toggle: () => client.toggle(),
      showNewMessage: (prefill) => client.showNewMessage(prefill),
      showConversation: (id) => client.showConversation(id),
      showSpace: (space) => client.showSpace(space),
      update: (next) => client.update(next),
      setContext: (attributes) => client.setContext(attributes),
      trackEvent: (name, meta) => client.trackEvent(name, meta)
    }),
    [client, unreadCount, isOpen]
  )

  return createElement(Context.Provider, { value }, children)
}

/** The widget's state and actions. Must be used inside `<TicketpingProvider>`. */
export function useTicketping(): TicketpingContextValue {
  const value = useContext(Context)
  if (!value) throw new Error('useTicketping() must be used inside <TicketpingProvider>.')
  return value
}
