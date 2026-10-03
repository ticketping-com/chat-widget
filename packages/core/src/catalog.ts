// The English catalog. Every UI string goes through `i18n.t(key, params)`. `{name}` placeholders
// are filled from params; entries with `one`/`other` are chosen with `Intl.PluralRules` on
// `params.count`. Any key can be overridden per widget through `texts` (dashboard or code).

export interface PluralEntry {
  zero?: string
  one?: string
  two?: string
  few?: string
  many?: string
  other: string
}

export const en = {
  // Dashboard-editable texts (protocol 3.1 `texts`)
  greetingTitle: 'Hi there 👋',
  greetingBody: 'How can we help you?',
  composerPlaceholder: 'Type a message...',
  conversationStarter: 'Hi, how can I help you today?',

  // Launcher
  'launcher.open': 'Open chat',
  'launcher.openUnread': {
    one: 'Open chat, {count} unread message',
    other: 'Open chat, {count} unread messages'
  },
  'launcher.close': 'Close chat',
  'launcher.badge': { one: '{count} unread message', other: '{count} unread messages' },

  // Panel chrome
  'panel.label': 'Chat with {team}',
  'panel.labelNoTeam': 'Chat',
  'panel.close': 'Close',
  'panel.back': 'Back',
  'panel.minimize': 'Minimize',

  // Home
  'home.newMessage': 'Send us a message',
  'home.continue': 'Continue the conversation',
  'home.recent': 'Recent conversation',
  'home.seeAll': 'See all',
  'home.replyTime': '{hint}',
  'home.nav.home': 'Home',
  'home.nav.live': 'Live chat',
  'home.nav.messages': 'History',

  // Conversation list
  'list.title': 'Messages',
  'list.empty': "You don't have any chats yet.",
  'list.emptyBody': 'Start a new chat to get started.',
  'list.loadMore': 'Show older conversations',
  'list.loading': 'Loading conversations...',
  'list.error': "Couldn't load conversations.",
  'list.newConversation': 'Start a new chat',
  'list.unread': { one: '{count} unread', other: '{count} unread' },
  'list.youPrefix': 'You: {text}',

  // Previews (list, toasts, tab title)
  'title.newMessages': { one: 'New message', other: '{count} new messages' },
  'preview.gif': 'GIF',
  'preview.gifTitled': 'GIF: {title}',
  'preview.attachment': 'Attachment',
  'preview.attachments': { one: '{count} attachment', other: '{count} attachments' },
  'preview.image': 'Image',
  'preview.event': 'Update',

  // Thread
  'thread.newTitle': 'New conversation',
  'thread.title': 'Conversation',
  'thread.loadOlder': 'Load earlier messages',
  'thread.loading': 'Loading messages...',
  'thread.error': "Couldn't load messages.",
  'thread.retryLoad': 'Try again',
  'thread.notFound': "This conversation isn't available.",
  'thread.typing': '{name} is typing...',
  'thread.typingSomeone': 'Typing...',
  'thread.aiThinking': 'AI is thinking...',
  'thread.newMessages': { one: '{count} new message', other: '{count} new messages' },
  'thread.today': 'Today',
  'thread.yesterday': 'Yesterday',

  // Senders
  'sender.you': 'You',
  'sender.ai': 'AI Agent',
  'sender.aiLabel': 'AI',
  'sender.agentFallback': 'Support',
  'sender.system': '{team}',
  'sender.avatarAlt': '{name}',

  // Ticket status
  'status.label': 'Status: {status}',
  'status.ticket': 'Ticket {id}',

  // AI and handoff (protocol 7)
  'availability.online': 'Online',
  'availability.offline': 'Offline right now',
  'availability.offlineBack': 'Offline right now — back {day} at {time} {timezone}',
  'availability.offlineHours': 'Offline right now — Hours: {hours}',
  'availability.offlineHint': "Leave a message and we'll pick it up first thing.",

  'handoff.button': 'Talk to a person',
  'handoff.pending': 'Connecting you to the team...',
  'handoff.done': 'The team has been notified and will reply here.',

  // Event messages (protocol 3.4 `event`)
  'event.handoff': 'Handed over to the team',
  'event.contact_requested': 'Leave your email so the team can reach you',
  'event.contact_saved': "We'll reply by email too",
  'event.ticket_created': 'The team has your message',
  'event.status_changed': 'Status changed to {status}',
  'event.unknown': 'Conversation updated',

  // Composer
  'composer.send': 'Send',
  'composer.withAi': 'Chatting with our AI',
  'composer.attach': 'Attach files',
  'composer.emoji': 'Insert emoji',
  'composer.gif': 'Send a GIF',
  'composer.removeAttachment': 'Remove {name}',
  'composer.uploading': 'Uploading {name}, {percent}%',
  'composer.uploaded': '{name} uploaded',
  'composer.tooLong': 'Messages can be up to {max} characters',
  'composer.dropFiles': 'Drop files to attach',
  'composer.disabledOffline': "You're offline. Messages send when you reconnect.",

  // Delivery states (protocol 6.3)
  'delivery.sending': 'Sending...',
  'delivery.sent': 'Sent',
  'delivery.failed': 'Not delivered',
  'delivery.retry': 'Retry',
  'delivery.discard': 'Delete',
  'delivery.rateLimited': "You're sending messages too fast",

  // Connection banner
  'connection.reconnecting': 'Reconnecting...',
  'connection.offline': "You're offline",
  'connection.restored': 'Connected',
  'connection.failed': "Chat isn't available right now",

  // Email capture (protocol 4.3)
  'email.title': 'Get notified by email',
  'email.body': "Leave your email and we'll let you know when the team replies.",
  'email.label': 'Email',
  'email.placeholder': 'you@example.com',
  'email.submit': 'Save',
  'email.saving': 'Saving...',
  'email.invalid': 'Enter a valid email address',
  'email.saved': "Thanks! We'll email you at {email}",
  'email.error': "Couldn't save your email. Try again.",

  // Identified-only configs (protocol 7)
  'login.title': 'Log in to chat',
  'login.body': 'Log in to your account to message the team.',
  'login.button': 'Log in',

  // Attachments
  'attachments.tooLarge': '{name} is over {max}',
  'attachments.tooMany': 'You can attach up to {max} files',
  'attachments.typeNotAllowed': "{name} isn't a supported file type",
  'attachments.uploadFailed': "Couldn't upload {name}",
  'attachments.download': 'Download {name}',
  'attachments.open': 'Open {name}',
  'attachments.fallbackName': 'Attachment',
  'attachments.size': '{size}',

  // Emoji picker (protocol 7.2)
  'emoji.search': 'Search emoji',
  'emoji.recent': 'Recently used',
  'emoji.noResults': 'No emoji found',
  'emoji.skinTone': 'Skin tone',
  'emoji.suggestions': 'Emoji suggestions',
  'emoji.category.smileys': 'Smileys and emotion',
  'emoji.category.people': 'People and body',
  'emoji.category.animals': 'Animals and nature',
  'emoji.category.food': 'Food and drink',
  'emoji.category.travel': 'Travel and places',
  'emoji.category.activities': 'Activities',
  'emoji.category.objects': 'Objects',
  'emoji.category.symbols': 'Symbols',
  'emoji.category.flags': 'Flags',

  // GIF picker (protocol 4.6.1, 3.5)
  'gif.search': 'Search GIFs',
  'gif.trending': 'Trending',
  'gif.poweredBy': 'Powered by GIPHY',
  'gif.noResults': 'No GIFs found',
  'gif.error': "Couldn't load GIFs",
  'gif.loadMore': 'More GIFs',
  'gif.play': 'Play {title}',
  'gif.pause': 'Pause {title}',
  'gif.fallbackTitle': 'GIF',

  // Branding and misc
  'branding.poweredBy': 'Powered by Ticketping',
  'test.tag': 'Test',
  'test.tagTitle': 'Test conversation: not shown to real users',

  // Errors
  'error.generic': 'Something went wrong. Try again.',
  'error.rateLimited': 'Too many requests. Try again in a moment.',
  'error.sessionLost': 'Your session ended. Messages from now on start a new conversation.',
  'error.network': "Can't reach the server.",

  // Time
  'time.justNow': 'Just now',
  'time.minutes': '{count}m',
  'time.hours': '{count}h',
  'time.days': '{count}d',

  // Screen reader announcements
  'a11y.newMessage': 'New message from {name}',
  'a11y.messageFailed': 'Message not delivered',
  'a11y.unread': { one: '{count} unread message', other: '{count} unread messages' }
} as const

export type MessageKey = keyof typeof en
export type Catalog = { readonly [K in MessageKey]?: string | PluralEntry }
