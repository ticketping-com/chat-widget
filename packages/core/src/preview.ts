import type { Conversation, Message } from './types.ts'

export type PreviewView = 'launcher' | 'home' | 'thread'

export const PREVIEW_CONVERSATION_ID = 'preview'

/** The fixed thread for `preview({ view: 'thread' })`: every sender type, a handoff and a status. */
export function previewConversation(now: number = Date.now()): {
  conversation: Conversation
  messages: Message[]
} {
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString()
  const base = { conversationId: PREVIEW_CONVERSATION_ID, attachments: [], event: null }
  const messages: Message[] = [
    {
      ...base,
      id: 'preview-1',
      clientId: 'preview-1',
      createdAt: at(12),
      sender: { type: 'USER', name: null },
      kind: 'message',
      body: { format: 'text', content: "Hi! I can't find where to export my invoices." }
    },
    {
      ...base,
      id: 'preview-2',
      createdAt: at(11),
      sender: { type: 'AI', name: null },
      kind: 'message',
      body: {
        format: 'markdown',
        content:
          'You can export invoices from **Settings > Billing > Invoices**. Want me to get someone from the team?'
      }
    },
    {
      ...base,
      id: 'preview-3',
      clientId: 'preview-3',
      createdAt: at(10),
      sender: { type: 'USER', name: null },
      kind: 'message',
      body: { format: 'text', content: "Yes please, I need last year's too." }
    },
    {
      ...base,
      id: 'preview-4',
      createdAt: at(10),
      sender: { type: 'SYSTEM', name: null },
      kind: 'event',
      body: null,
      event: { type: 'handoff' }
    },
    {
      ...base,
      id: 'preview-5',
      createdAt: at(4),
      sender: { type: 'AGENT', name: 'Grace', avatarUrl: null },
      kind: 'message',
      body: {
        format: 'markdown',
        content: "Hi, Grace here. I've emailed you last year's invoices as a ZIP."
      }
    }
  ]
  const conversation: Conversation = {
    id: PREVIEW_CONVERSATION_ID,
    createdAt: at(12),
    updatedAt: at(4),
    phase: 'team',
    isTest: false,
    unreadCount: 0,
    assignee: { name: 'Grace', avatarUrl: null },
    ticket: {
      id: 'tk_preview',
      number: 482,
      status: { slug: 'waiting-for-customer', label: 'Waiting for customer', theme: 'BLUE' }
    },
    lastMessage: messages[messages.length - 1] ?? null
  }
  return { conversation, messages }
}
