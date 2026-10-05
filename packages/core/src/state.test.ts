import { describe, expect, it } from 'vitest'
import {
  mergeMessages,
  normalizeConfig,
  touchConversation,
  upsertConversation,
  type ThreadMessage
} from './state.ts'
import type { Conversation, Message } from './types.ts'

const msg = (id: string, createdAt: string, patch: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id,
  conversationId: 'cs_1',
  createdAt,
  sender: { type: 'AGENT' },
  kind: 'message',
  body: { format: 'text', content: id },
  attachments: [],
  event: null,
  ...patch
})

const conv = (id: string, updatedAt: string, lastMessage: Message | null = null): Conversation => ({
  id,
  createdAt: updatedAt,
  updatedAt,
  phase: 'ai',
  isTest: false,
  unreadCount: 0,
  assignee: null,
  ticket: null,
  lastMessage
})

describe('mergeMessages', () => {
  it('orders by createdAt and de-duplicates by id', () => {
    const merged = mergeMessages(
      [msg('b', '2026-01-01T00:00:02.000Z')],
      [
        msg('a', '2026-01-01T00:00:01.000Z'),
        msg('b', '2026-01-01T00:00:02.000Z'),
        msg('c', '2026-01-01T00:00:03.000Z')
      ]
    )
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('replaces an optimistic message with the server copy and marks it sent', () => {
    const local = msg('local:x', '2099-01-01T00:00:00.000Z', {
      clientId: 'x',
      sender: { type: 'USER' },
      delivery: 'sending'
    })
    const pending = msg('local:y', '2099-01-01T00:00:00.000Z', {
      clientId: 'y',
      delivery: 'sending'
    })
    const merged = mergeMessages(
      [msg('a', '2026-01-01T00:00:01.000Z'), local, pending],
      [msg('cm_x', '2026-01-01T00:00:05.000Z', { clientId: 'x', sender: { type: 'USER' } })]
    )
    expect(merged.map((m) => [m.id, m.delivery])).toEqual([
      ['a', undefined],
      ['cm_x', 'sent'],
      ['local:y', 'sending']
    ])
  })

  it('keeps local messages last even when the client clock is behind', () => {
    const merged = mergeMessages(
      [msg('local:z', '2000-01-01T00:00:00.000Z', { clientId: 'z', delivery: 'sending' })],
      [msg('a', '2026-01-01T00:00:01.000Z')]
    )
    expect(merged.map((m) => m.id)).toEqual(['a', 'local:z'])
  })
})

describe('conversations', () => {
  it('upserts and keeps newest first', () => {
    const list = upsertConversation(
      [conv('a', '2026-01-01T00:00:01.000Z'), conv('b', '2026-01-01T00:00:03.000Z')],
      conv('a', '2026-01-01T00:00:05.000Z')
    )
    expect(list.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('touches the preview on new messages, ignores unknown conversations', () => {
    const list = [conv('cs_1', '2026-01-01T00:00:01.000Z')]
    const touched = touchConversation(list, msg('m', '2026-01-01T00:00:09.000Z'))!
    expect(touched[0]!.lastMessage!.id).toBe('m')
    expect(touched[0]!.updatedAt).toBe('2026-01-01T00:00:09.000Z')
    expect(touchConversation(list, { ...msg('m', 'x'), conversationId: 'other' })).toBeNull()
  })
})

describe('normalizeConfig', () => {
  it('fills missing fields with defaults and drops unknown or mistyped ones', () => {
    const config = normalizeConfig({
      team: { name: 'Acme', bogus: 1 },
      appearance: { accentColor: '#000', launcher: { label: 'Help' } },
      texts: { greetingTitle: 'Yo', broken: 3 },
      socket: { heartbeatSeconds: 10 }
    })
    expect(config.team).toEqual({
      name: 'Acme',
      avatars: [],
      replyTimeHint: null,
      availability: { state: 'online', next: null, hours: null }
    })
    expect(config.appearance.accentColor).toBe('#000')
    expect(config.appearance.launcher).toEqual({ icon: 'chat', label: 'Help', hideWhenOpen: false })
    expect(config.texts).toEqual({ greetingTitle: 'Yo' })
    expect(config.socket).toEqual({
      url: 'wss://api.ticketping.com/ws/v2/widget/',
      heartbeatSeconds: 10
    })
    expect(config.branding.poweredBy).toBe(true)
    expect(normalizeConfig(null).features.gifs).toBe(false)
  })
})
