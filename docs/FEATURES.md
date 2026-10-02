# Ticketping Chat Widget: Feature Inventory

Snapshot of `@ticketping/chat-widget` v1.12.0 and the backend contract it relies on
(`ticketping-backend`, `apps/ticket/consumers.py`, `apps/ticket/views.py`, `apps/team`).

The inventory has three parts:

1. What actually works today, end to end.
2. Options that are documented or declared but not implemented.
3. Bugs and risks found while reading the code.

---

## 1. Architecture at a glance

| Piece                | File                                        | Role                                                                                                                          |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Entry / orchestrator | `src/widget.js`                             | `TicketpingChat` class, global `window.TicketpingChat` API, state (conversations, unread), WebSocket wiring                   |
| Launcher             | `src/components/chat-bubble.js`             | Floating round button, open/close icon swap, unread dot                                                                       |
| Window               | `src/components/chat-window.js`             | Home tab, Messages tab (list + thread), composer, file upload, offline banner. Plain HTML strings + `innerHTML`               |
| Conversation socket  | `src/services/websocket.js`                 | One socket per open conversation (`/ws/chat/<team>/<session>/`), heartbeat, exponential reconnect (5 tries)                   |
| Notification socket  | `src/services/notification-websocket.js`    | Persistent socket (`/ws/customer-notifs/<team>/`) for unread count. Authenticated users only (server closes anon connections) |
| REST                 | `src/services/api.js`                       | Team settings, JWT exchange, session create, conversation list, file upload                                                   |
| Storage              | `src/services/storage.js`                   | `localStorage` (memory fallback): conversations, user, device ID                                                              |
| Styles               | `src/styles/main.css`                       | ~1,500 lines, CSS custom properties `--tp-*`, global (no Shadow DOM / iframe)                                                 |
| Framework wrappers   | `src/frameworks/react`, `svelte`, `svelte4` | Thin mount/unmount wrappers around the global API                                                                             |

Distribution: npm (`@ticketping/chat-widget`), unpkg CDN (`widget.min.js` + `widget.css`), ESM/UMD builds,
React, Svelte 5 and Svelte 4 entry points, TypeScript declarations. Auto-initializes if `window.ticketpingConfig` exists.

Build and quality: Vite, ESLint, Vitest + jsdom (4 test files, ~130 test cases), `prepublishOnly` runs lint, tests and build.

---

## 2. Working features

### 2.1 Installation and setup

- CDN script + CSS, or npm import (`import TicketpingChat from '@ticketping/chat-widget'` + `/style`).
- Required config: `appId`, `teamSlug`. Validated on init (`src/utils/validation.js`).
- Optional config that is actually read: `apiBase`, `wsBase`, `userJWT`, `teamLogoIcon`, `theme` (object of colors), `position` (fallback only), `maxFileSize`, `analytics`.
- Auto-init from `window.ticketpingConfig`.
- Re-init safety: a second `init()` returns the existing instance; an existing `.ticketping-widget` node is removed before rendering.

### 2.2 Server-driven settings (from the Ticketping dashboard)

Fetched once on init from `GET /api/v1/team/widget/<teamSlug>/`:

| Setting                                            | Effect in widget                                                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `logoUrl`                                          | Logo on Home header (config `teamLogoIcon` wins if set)                                                                                      |
| `widgetPosition` (`left` / `right`)                | Bottom-left or bottom-right placement. Overrides the `position` config                                                                       |
| `widgetBubbleVisible`                              | Hides the launcher; widget still works via `TicketpingChat.open()`                                                                           |
| `widgetWelcomeMessage`                             | Subtitle under "Hi there 👋" on Home                                                                                                         |
| `isAvailable`, `nextAvailable`, `workHoursDisplay` | Online/offline status dot, offline banner ("Offline right now, back Monday at 9:00 AM IST"), CTA subtext ("We'll respond on Monday at 9:00") |
| `widgetDefaultMessage`                             | Not used by the widget. The backend uses it as the bot greeting                                                                              |
| `authOnlyTickets`                                  | Returned, but ignored by the widget                                                                                                          |

If the settings call fails, the widget falls back to defaults ("Typically replies within minutes", online).

### 2.3 Launcher (bubble)

- 60px round button, gradient from `primaryColor` to `primaryHover`, configurable icon color.
- Swaps to a close (X) icon when open; `aria-expanded` and `aria-label` update.
- Keyboard: Enter / Space toggles.
- Unread indicator: a dot (no number) shown when the server reports unread > 0 and the widget is closed. Authenticated users only.

### 2.4 Home tab

- Team logo (or default icon), close button.
- Greeting "Hi there 👋" (hardcoded) + team welcome message.
- "Recent conversation" card: most recent conversation with preview, timestamp, unread dot. Click opens it.
- "Send us a message" CTA with response-time / next-available subtext.
- "Powered by Ticketping" footer link (always shown).
- Bottom tab bar: Home / Messages, with an unread dot on Messages.

### 2.5 Messages tab: conversation list

- All conversations sorted newest first; preview is the server `summary` (for example "Ticket #123"), else last message snippet, else "Support Chat".
- Per-conversation unread dot + bold text.
- Empty state ("No conversations yet").
- "Send us a message" button to start a new conversation.
- Source of the list:
  - Authenticated: `GET /api/v1/chat-sessions/` (server is the source of truth for `hasUnread`), mirrored to localStorage.
  - Anonymous: localStorage only (same browser, same device).

### 2.6 Conversation thread

- Loading state ("Starting conversation... Connecting you with support").
- Full history delivered over the socket on connect (`server_message_history`), including chat messages and public ticket replies.
- Left/right bubbles by sender (`USER` vs `AGENT` / `SYSTEM`).
- Grouping: consecutive messages from the same sender within 5 minutes are grouped; only the last one in the group shows a timestamp.
- Date separators: "Today", "Yesterday", or full weekday date (year shown if not the current year), in the visitor's timezone.
- Renders server `messageHtml` when present (agent replies with formatting), otherwise escaped plain text.
- Attachments: images render inline with a loading placeholder and open in a new tab; other files render as a download link.
- Auto-scroll to bottom on new messages.
- Back button returns to the list and disconnects the conversation socket.
- Offline banner above the composer when the team is outside working hours.

### 2.7 Composer

- Auto-growing textarea (up to 100px).
- Enter sends, Shift+Enter inserts a newline.
- Send button disabled when empty.
- Attach button (hidden while typing): single file, `image/*,.pdf,.doc,.docx`, client-side size check (10MB default), full-composer "Uploading..." overlay.
- Uploads go to `POST /api/v1/chat-session/file-upload/<team>/<session>/`; the file appears in the thread when the server echoes `file_attachment` over the socket. If a ticket exists, the file becomes a ticket reply.

### 2.8 Conversation flow (server-side, experienced through the widget)

This is the core product behavior, implemented in `ChatConsumer`:

1. Visitor clicks "Send us a message". The widget creates a session (`POST /api/v1/chat-session/create/`) and opens the socket.
2. Server sends a greeting as a `SYSTEM` message: personalized with the name for logged-in users, an offline variant outside working hours, otherwise `widgetDefaultMessage`.
3. **AI agent first** (if the team has AI knowledge entries): each message goes to an OpenAI model (`gpt-4o-mini`, 150 max tokens) grounded on the team's `TeamAIKnowledge` entries. AI answers appear as `SYSTEM` messages.
4. **Handoff**: when the AI can't answer (`TRANSFER_TO_HUMAN_AGENT`), the widget shows "Let me connect you with a human support agent...".
   - Logged-in customer: a ticket is created immediately.
   - Anonymous: bot asks for an email address in chat; it is validated with a regex; then the ticket is created.
   - Without AI: if the first message is shorter than 3 words, the bot asks for more detail (up to 10 escalating prompts) before moving on.
5. Ticket creation: AI one-line summary, auto labels, spam/suppression check, auto-assign, Slack post, confirmation emails to customer and team. The widget shows "I've created support ticket #N for you...".
6. After the ticket exists, visitor messages become ticket replies (synced to the dashboard and the Slack thread). Agent replies from the dashboard or Slack arrive live in the widget (`server_message` with `sender: AGENT`).
7. Email replies to the ticket also land in the ticket, so they appear in the widget history on the next load (a form of chat-to-email continuity).

### 2.9 Identity and security

- Anonymous by default. The session ID acts as the only secret for anonymous sessions.
- Logged-in mode: host app passes `userJWT` (signed with the team's JWT secret) via config or `identify({ userJWT })`.
  - Widget exchanges it at `GET /api/v1/jwt/auth/` for a Ticketping chat JWT, cached in a `ticketping_chat_jwt` cookie for up to 7 days.
  - Sessions created with a JWT are bound to the customer; the server refuses socket connections to a claimed session without the matching JWT.
  - An anonymous session is upgraded (attached to the customer) when the user logs in mid-chat.
- `identify()` also reloads conversations from the server and reconnects the active socket with auth.

### 2.10 Unread and read state

- Server tracks `last_agent_reply_ts` vs `last_read_ts` per ticket.
- Opening a conversation marks it read (socket connect + `mark_read`), which pushes a fresh unread count to the notification socket.
- Live updates: when an agent replies, the notification socket pushes the new unread count; the widget refreshes the list and shows the bubble dot.

### 2.11 Public JavaScript API

```js
TicketpingChat.init(config) // returns the instance
TicketpingChat.identify({ userJWT, id, email, name })
TicketpingChat.open()
TicketpingChat.close()
TicketpingChat.startConversation() // creates a session; does not switch the UI to it
TicketpingChat.destroy()
TicketpingChat.version
// instance-only:
instance.toggle()
```

### 2.12 Theming and responsiveness

- 21 color tokens via the `theme` object or CSS custom properties (`--tp-primary-color`, `--tp-background`, and so on).
- Inherits the host page font.
- 400px floating window on desktop; full-screen (100vw x 100dvh) under 480px with body scroll lock.
- `prefers-reduced-motion` and `prefers-contrast: high` handled.
- Thin scrollbars on desktop.

### 2.13 Framework wrappers

- React: `<TicketpingChat appId teamSlug ... />`, SSR-safe dynamic import, destroys on unmount.
- Svelte 5 / Svelte 4: same props plus an `open` prop and exported methods.

---

## 3. Declared but not implemented

These appear in `README.md`, `src/constants/config.js` or `src/widget.d.ts`, so integrators may expect them, but no code reads them:

| Option                                                                                                   | Where it's promised                                 | Reality                                                           |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `onReady`, `onOpen`, `onClose`, `onMessageSent`, `onMessageReceived`, `onConversationStarted`, `onError` | README "Event Callbacks", types                     | Never called                                                      |
| `autoOpen`                                                                                               | README, types                                       | Ignored                                                           |
| `labels.*` (about 25 strings, including `messageInputPlaceholder`, `typingIndicator`, `connectionLost`)  | config, types                                       | All UI strings are hardcoded in English                           |
| `locale`, `timezone`                                                                                     | config, types                                       | Browser locale is used for dates; no translations                 |
| `theme: 'dark' \| 'light'`                                                                               | config, types, CHANGELOG "Dark/Light theme support" | `[data-theme="dark"]` CSS exists but nothing sets the attribute   |
| `zIndex`, `customCSS`                                                                                    | config, types                                       | Ignored                                                           |
| `enableFileUpload`, `enableTypingIndicators`, `enableEmojis`, `enableMarkdown`, `enableLinkPreviews`     | config, types                                       | Ignored; no emoji picker or markdown exists                       |
| `enableSoundNotifications`, `enableBrowserNotifications`                                                 | config, types                                       | Ignored; no sounds or notifications                               |
| `allowedFileTypes`, `maxMessageLength`                                                                   | config, types                                       | File input `accept` is hardcoded; length not enforced client-side |
| `showConversationHistory`, `maxConversationsStored`, `autoDeleteAfterDays`                               | config, types                                       | Storage keeps 50, hardcoded; no cleanup runs                      |
| `enableSecureMode`                                                                                       | config, types                                       | Ignored                                                           |
| `position: 'top-left' \| 'top-right'`                                                                    | validation                                          | Accepted, but only bottom-left/right render                       |
| `open` prop (React)                                                                                      | README props table                                  | React wrapper ignores it                                          |
| `userData` prop (Svelte)                                                                                 | README props table                                  | Not a prop in either Svelte wrapper                               |
| Help articles (`labels.helpArticles`, `getHelpArticles`, `searchHelpArticles`)                           | config, api.js                                      | No UI; endpoints don't exist                                      |
| `getMessages`, `markAsRead`, `updateUser`, `getAgentStatus`, `batchRequest`, `healthCheck`, `track`      | api.js                                              | Point to endpoints that don't exist, or are no-ops                |
| Analytics (`analytics: true`)                                                                            | README                                              | `api.track()` returns immediately; nothing is sent                |
| Agent joined/left, agent online status                                                                   | websocket.js                                        | Server never sends them; the handler would also throw (see 4.1)   |

---

## 4. Bugs and risks found

### 4.1 Functional bugs

1. **Typing indicator can never show.** `websocket.js` switches on `WEBSOCKET_EVENTS.SERVER_TYPING`, which is undefined (the constant is named `TYPING_INDICATOR`). The server also never emits typing events to the widget, and the widget never sends `typing_start`.
2. **Svelte wrappers are half-broken.** `widgetReady` is never set to `true`, so the `open` prop and every exported method (`openWidget`, `identifyUser`, and others) are no-ops. Svelte 5 also calls an undefined `onerror` in its catch block.
3. **Wrong default socket host in wrappers.** React and Svelte default `wsBase` to `wss://api.ticketping.com`, while the core default is `wss://ws.ticketping.com`.
4. **REST fallback loses messages.** If the socket is down, `sendMessage` posts to `/messages`, which doesn't exist. The message still shows in the UI as sent. There is no queue, retry, or failed state.
5. **`updateAgentStatus` would throw.** It queries `.ticketping-chat-header-content p`, which isn't in the DOM.
6. **`ticket_status_update` is unhandled.** The server sends it when an agent changes ticket status; the widget logs "Unknown WebSocket message type".
7. **Errors are invisible.** `showError()` is a TODO that only logs to the console. Failed uploads and failed loads give the visitor no feedback.
8. **Closing the widget kills live updates for anonymous visitors.** `close()` disconnects the conversation socket, and anonymous visitors have no notification socket. An agent reply while the widget is closed produces no badge.
9. **`startConversation()` (public API) doesn't open the UI.** It creates a session and socket, but the window stays on whatever tab it was on.
10. **IME composition.** Enter is handled on `keypress` without an `isComposing` check, so Japanese/Chinese/Korean input can send half-composed text.
11. **Snippet crash risk.** List previews call `lastMessage.messageText.substring(...)` without a null check.
12. **Logo precedence comment is inverted.** The comment says team settings win; the code makes config `teamLogoIcon` win.

### 4.2 Security and privacy risks

1. **Cached chat JWT ignores user switches.** `getChatToken()` returns the cookie token whenever it's unexpired, even if `identify()` was called with a different user's `userJWT`. On shared machines, or after logout/login as another user, the widget can keep acting as the previous customer for up to 7 days. There's no `logout`/`reset` API to clear it.
2. **Unsanitized HTML.** `messageHtml` from the server (agent replies, which can come from email) is injected with `innerHTML`. Any HTML that survives server-side processing runs in the host page's origin. `teamLogoIcon` and attachment URLs are also interpolated into markup unescaped.
3. **No style or DOM isolation.** The widget renders into the host DOM with global CSS and writes theme variables on `document.documentElement`. Host CSS can break the widget, and the widget's `*` reset can collide with host styles.
4. **Anonymous session IDs are bearer secrets.** Anyone holding a session ID can read that conversation (acknowledged by an `XXX` comment in `create_chat_session`).
5. **No domain allowlist.** Any site can embed any team's widget with its `appId` and `teamSlug`.
6. **Verbose console logging in production.** Message payloads and conversation maps are logged with `console.log`.

### 4.3 Backend-side limitations that shape the widget experience

- AI calls are synchronous and non-streaming, run in a DB-sync thread, and capped at 150 tokens. There's no "AI is typing" signal.
- AI knowledge comes only from `TeamAIKnowledge` entries pasted into the prompt. The team's published help-docs articles (`apps/supdoc`) are not used, and there's no retrieval and no citations.
- AI and system notices share `sender: SYSTEM`, so the visitor can't tell bot answers from automated notices, and there's no AI disclosure.
- Agent name is sent (`agent` field) but the widget doesn't display it. There are no avatars.
- Email capture is a free-text chat turn, not a form.
- The full history is sent on every connect, with no pagination.
