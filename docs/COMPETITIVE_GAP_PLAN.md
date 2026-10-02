# Chat Widget: Competitive Gap Analysis and Plan

Compares the Ticketping widget (v1.12.0, see `FEATURES.md`) against Intercom Messenger,
Chatwoot's website widget and the Crisp chatbox as of October 2026, then proposes what to build, in what order, and what to skip.

Nothing in this document is built yet.

---

## 1. Summary

- The widget's **core loop is good**: AI answers first, hands off to a human, every conversation becomes a ticket, and agents reply from Slack or the dashboard in real time. Competitors charge a lot for this loop.
- The **gaps are mostly basics**, not features. Visitors can't tell who they're talking to. Failures are silent. Nothing happens when the widget is closed. Every string is in English. About 25 config options are documented but do nothing. Two of the issues are security problems: an identity mix-up through the cached JWT, and unsanitized HTML.
- **Phase 0 (fix the foundation) comes before any new feature.** Several items in `FEATURES.md` section 4 are bugs that integrators will hit.
- After parity, the best bets are **self-serve (help docs in the widget plus a much stronger AI)** and a **B2B SaaS differentiator: automatic technical context capture** (page, browser, console errors, screenshot), which none of the three competitors do natively.
- **Skip** co-browsing, calls, product tours, checklists and outbound campaigns. They're expensive and off-strategy for a Slack-first support tool.

---

## 2. What the competitors set as the bar

**Intercom Messenger.** Configurable "spaces": Home, Messages, Tickets, Help, News, Tasks. Fin AI agent with RAG over help center, PDFs and web pages, inline source citations, natural-language and automatic handoff, clear "who's handling this" labels, and AI-generated conversation titles. Option to launch straight into a conversation. Special notices with multilingual text, privacy notice, reply-time expectations, expandable window. JWT-based Messenger security. A rich JS API: `boot`, `update`, `show`, `showNewMessage(prefill)`, `showSpace`, `showArticle`, `showTicket`, `showConversation`, `trackEvent`, `onUnreadCountChange`, `onShow`/`onHide`, `startTour`, `startSurvey`, `shutdown`.

**Chatwoot.** Pre-chat forms with standard fields and typed custom attributes (required, ordering, regex validation). Email collection plus chat-to-email continuity. CSAT survey after resolution (emoji or stars, label rules). Ongoing campaigns by URL and time on page. HMAC identity validation (optionally mandatory), allowed-domains list, 50+ languages with `setLocale`. Feature flags (attachments, emoji picker, end conversation). Popout window. Interactive messages (cards, forms, options). SDK: `setUser`, `setCustomAttributes`, `setLabel`, `toggle`, `reset`, `chatwoot:ready` and other events.

**Crisp chatbox.** Helpdesk search and article view inside the chatbox. Triggers and bot scenarios. Rich message types (picker, field, carousel, file, audio, animation). Auto-translation. MagicBrowse co-browsing (rebuilt in 2026), video/audio calls, status page. Sound mute, vacation mode, hide on away/mobile, color mode, locale override. New 2026 customization UI with live preview and per-language text. `$crisp` SDK with `set` (user, session data, segments, events), `do`, `get`, `is` and many `on` events, plus a Hugo AI agent with tools.

---

## 3. Gap matrix

Legend: **Yes** = shipped; **Partial** = exists with notable limits; **No** = missing.

| Capability                                              | Ticketping                                          | Intercom            | Chatwoot      | Crisp                          |
| ------------------------------------------------------- | --------------------------------------------------- | ------------------- | ------------- | ------------------------------ |
| Real-time chat, history, attachments                    | Partial (1 file, silent failures)                   | Yes                 | Yes           | Yes                            |
| Agent name and avatar on messages                       | No                                                  | Yes                 | Yes           | Yes                            |
| Typing indicators (both directions)                     | No (broken)                                         | Yes                 | Yes           | Yes (plus live typing preview) |
| Delivery and read states, retry                         | No                                                  | Yes                 | Partial       | Yes                            |
| Live updates while widget closed (badge, preview popup) | Partial (logged-in only, dot only)                  | Yes                 | Yes           | Yes                            |
| Sound, tab title, browser notifications                 | No                                                  | Yes                 | Yes           | Yes                            |
| Pre-chat form / email capture UI                        | Partial (chat-turn regex)                           | Yes                 | Yes           | Yes                            |
| Identify with attributes, company, events               | Partial (JWT only)                                  | Yes                 | Yes           | Yes                            |
| Signed identity enforcement                             | Partial (JWT, not enforceable)                      | Yes (JWT)           | Yes (HMAC)    | Yes                            |
| Page/URL/device context to agent                        | No                                                  | Yes                 | Yes           | Yes                            |
| i18n / RTL                                              | No                                                  | Yes                 | Yes (50+)     | Yes (plus auto-translate)      |
| Dashboard theming with live preview, dark mode          | Partial (position, logo, message)                   | Yes                 | Yes           | Yes                            |
| CSAT after resolution                                   | No                                                  | Yes                 | Yes           | Yes                            |
| Ticket status visible to customer                       | No                                                  | Yes (Tickets space) | Partial       | Partial                        |
| Help center inside widget                               | No (help docs exist in product)                     | Yes                 | Yes           | Yes                            |
| AI agent                                                | Partial (prompt-stuffed, no citations or streaming) | Yes (Fin)           | Yes (Captain) | Yes (Hugo)                     |
| Interactive messages (buttons, forms, cards)            | No                                                  | Yes                 | Yes           | Yes                            |
| Special notice / status banner                          | Partial (offline banner only)                       | Yes                 | No            | Yes (status page)              |
| Proactive triggers / campaigns                          | No                                                  | Yes                 | Yes           | Yes                            |
| Full JS API and events                                  | Partial (5 methods, no events)                      | Yes                 | Yes           | Yes                            |
| Style isolation (iframe / shadow DOM)                   | No                                                  | Yes                 | Yes           | Yes                            |
| Accessibility (dialog, focus, live regions)             | Partial                                             | Yes                 | Partial       | Partial                        |
| Domain allowlist                                        | No                                                  | Yes                 | Yes           | Yes                            |
| Mobile SDKs                                             | No                                                  | Yes                 | Yes           | Yes                            |
| Co-browsing, calls                                      | No                                                  | No (via apps)       | No            | Yes                            |
| Product tours, checklists, news                         | No                                                  | Yes                 | No            | Partial                        |
| Auto technical context (console errors, screenshot)     | No                                                  | No (apps)           | No            | No                             |

---

## 4. Strategy

**Match** where a missing feature makes the widget feel broken or untrustworthy: identity, delivery states, notifications, agent identity, i18n, theming, CSAT, accessibility. Visitors and integrators compare against Intercom without thinking about it.

**Lean in** where Ticketping already has assets competitors charge extra for:

- Tickets are first-class, so show them (status, ticket number, history, email continuity).
- Help docs already exist (`apps/supdoc`), so put them in the widget and ground the AI on them.
- Replies happen in Slack, so surface that speed: real response times, live typing and status changes.

**Differentiate** for B2B SaaS teams, the likely buyers of "support meets Slack": capture the technical context that support engineers otherwise ask for over three back-and-forth messages.

**Skip** marketing-automation and heavy real-time media. It's large surface area, low leverage for this audience, and it pulls the product toward Intercom's pricing tier.

---

## 5. Decisions needed before Phase 1

These affect everything after Phase 0, so decide them first.

1. **Isolation model.** Today the widget renders into the host DOM with global CSS.
   - _Shadow DOM (recommended):_ fixes CSS bleed both ways, stays same-origin (cookies and storage behave as today), and is a small change.
   - _Iframe (Intercom/Crisp style):_ full JS/CSS isolation and a natural sandbox for agent HTML. But third-party storage partitioning (Safari ITP, Chrome) complicates persistence and auth, and it needs a postMessage bridge.
2. **Rendering approach.** Hand-written `innerHTML` templates won't scale to forms, interactive messages, a help center and CSAT. Options: compile the UI with Svelte 5 (team expertise, small runtime) or Preact (about 4KB). The public API stays the same either way. Pair this with a bundle-size check in CI; `bundlesize` is declared in `package.json` but not wired up.
3. **Socket protocol v2.** Define it once rather than patching it per feature:
   - Sender types `USER | AGENT | AI | SYSTEM`, plus agent profile (name, avatar).
   - Client message IDs with server acks (enables sending/sent/failed states).
   - Typed message kinds (`text`, `file`, `buttons`, `form`, `card`, `csat`, `article`).
   - Typing events and ticket status events.
   - A protocol version field so older widget builds keep working.
4. **Loader.** A tiny async snippet with a command queue (`TicketpingChat('open')` works before the bundle loads), with the window chunk lazy-loaded on first open or idle.

---

## 6. Phased plan

Effort: **S** = days, **M** = about 1-2 weeks, **L** = multi-week. "BE" marks backend work.

### Phase 0: Fix the foundation

The goal is that everything the README promises either works or is removed.

| #    | Item                                                                                                                                                                                                                                       | Effort    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 0.1  | Fix cached chat JWT reuse across users: key the cookie to the user's identity (or drop the cache when `identify()` gets a new JWT). Add `logout()` / `reset()` that clears cookie, storage and sockets                                     | S         |
| 0.2  | Sanitize all rendered HTML (allowlist sanitizer client-side, ideally also server-side); escape logo and attachment URLs                                                                                                                    | S (+BE S) |
| 0.3  | Remove the fake REST fallback; queue outgoing messages while reconnecting; show a failed state with retry; show the `connectionLost` banner                                                                                                | M         |
| 0.4  | Implement `showError` as an inline, dismissible error (upload failed, load failed, file too large)                                                                                                                                         | S         |
| 0.5  | Fix the typing constant; handle `ticket_status_update`; remove or fix `updateAgentStatus`                                                                                                                                                  | S         |
| 0.6  | Fix Svelte wrappers (`widgetReady`, `onerror`); add `open` to React; align default `wsBase`                                                                                                                                                | S         |
| 0.7  | Implement callbacks (`onReady`, `onOpen`, `onClose`, `onMessageSent`, `onMessageReceived`, `onConversationStarted`, `onError`) and `autoOpen`; delete every other declared-but-unused option from README, types and config until it's real | S         |
| 0.8  | `startConversation()` opens the window into the new thread; IME-safe Enter (`isComposing`); null-safe previews                                                                                                                             | S         |
| 0.9  | Strip `console.log` in production builds; keep a `debug` logger                                                                                                                                                                            | S         |
| 0.10 | Keep live updates while closed for anonymous visitors (session-scoped notification socket, or keep the conversation socket alive)                                                                                                          | M (+BE S) |

### Phase 1: Table stakes

**1a. Trust and real-time feel**

| #   | Item                                                                                                                                                                                       | Competitor reference             | Effort                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------ |
| 1.1 | Style isolation (decision 5.1) and new rendering layer (5.2)                                                                                                                               | All three                        | M                                    |
| 1.2 | Agent name and avatar on messages; team avatars on Home; distinct AI identity with a label ("AI agent"), plus a "handed to {name}" divider at handoff                                      | Intercom handover labels         | M (+BE S: `AI` sender, agent avatar) |
| 1.3 | Delivery states (sending, sent, failed) with retry; "Seen" when an agent has read the message                                                                                              | Intercom, Crisp                  | M (+BE M: acks, agent read receipts) |
| 1.4 | Agent typing indicator driven by the dashboard composer (the dashboard already calls a typing endpoint for Slack; extend it to the widget group). Optionally show visitor typing to agents | All three                        | S (+BE S)                            |
| 1.5 | Notifications: numeric badge; unread-message preview popup next to the launcher when closed; tab title flash; mutable sound; opt-in browser notifications                                  | Intercom snippets, Crisp         | M                                    |
| 1.6 | Accessibility: `role="dialog"`, focus move and return, Esc to close, `aria-live` for incoming messages, labeled controls, WCAG AA contrast check against custom colors                     | Intercom                         | S                                    |
| 1.7 | Mobile polish: safe-area insets, `visualViewport` keyboard handling, "hide launcher on mobile" option; expand/popout on desktop                                                            | Chatwoot popout, Intercom expand | S                                    |
| 1.8 | Loader snippet with command queue and lazy chunk (decision 5.4)                                                                                                                            | All three                        | M                                    |

**1b. Identity, context and configuration**

| #    | Item                                                                                                                                                                                                                                                                                              | Competitor reference                  | Effort           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| 1.9  | `identify({ name, email, company, attributes })` and `update()` sent to the server and shown in the ticket sidebar. Signed-identity enforcement toggle per team (reject unsigned identity when on)                                                                                                | Intercom JWT, Chatwoot HMAC           | M (+BE M)        |
| 1.10 | Automatic page context: current URL, referrer, page title, locale, timezone, browser/OS, viewport; SPA route tracking. Attached to the session and shown to agents                                                                                                                                | All three                             | S (+BE S)        |
| 1.11 | Email capture as an inline form card instead of a chat turn; configurable pre-chat form (name, email, phone, custom fields; required/optional). Respect `authOnlyTickets` by showing "Log in to chat" with the team's `login_url`                                                                 | Chatwoot pre-chat                     | M (+BE M)        |
| 1.12 | Public API parity: `show()`/`hide()` launcher, `showNewMessage(prefill)`, `showConversation(id)`, `showSpace('messages' \| 'help' \| 'tickets')`, `onUnreadCountChange`, `on(event, cb)`, `trackEvent(name, meta)`, `setLocale`, `isOpen()`, custom launcher via `data-ticketping-open` attribute | Intercom, Crisp                       | M                |
| 1.13 | i18n: wire `labels`; ship locale packs (start with about 10 languages); auto-detect from browser; RTL layout; locale-aware dates; per-language greeting text from the dashboard                                                                                                                   | Chatwoot 50+, Crisp                   | M (+BE S)        |
| 1.14 | Dashboard appearance with live preview: brand color, launcher icon/label, light/dark/auto, greeting title, "launch straight into conversation", "Powered by" removal (Enterprise only). `TeamSettings.theme` JSON already exists and is unused                                                    | Crisp 2026 customization UI, Intercom | M (+BE S, +FE M) |
| 1.15 | Security: allowed-domains list per team; bind anonymous sessions to a device token so a session ID alone isn't enough                                                                                                                                                                             | Chatwoot `allowed_domains`            | S (+BE S)        |

**1c. Conversation lifecycle and content**

| #    | Item                                                                                                                                                                                                       | Competitor reference | Effort    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------- |
| 1.16 | Ticket status in list and thread (Open, Waiting on you, Resolved), driven by the existing `ticket_status_update` event; "Start a new conversation" after resolved; "We'll also reply by email to x@y" note | Intercom Tickets     | S         |
| 1.17 | CSAT card on resolve (5-point emoji or stars, optional comment); reporting in dashboard                                                                                                                    | Chatwoot, Intercom   | M (+BE M) |
| 1.18 | Markdown rendering for both sides (links autolinked, lists, bold, code blocks)                                                                                                                             | Intercom code blocks | S         |
| 1.19 | Attachments: multiple files, drag-and-drop, paste screenshot from clipboard, upload progress, preview before send with caption, config-driven type allowlist                                               | All three            | M         |
| 1.20 | Emoji picker (lazy-loaded)                                                                                                                                                                                 | Chatwoot, Crisp      | S         |

### Phase 2: Self-serve and AI

This is where the market is moving, and Ticketping already has the raw materials.

| #   | Item                                                                                                                                                                                                                                                                                                                                                | Competitor reference                   | Effort                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------- |
| 2.1 | **Help space** in the widget: search and read published help-docs articles (`apps/supdoc`) without leaving the page; suggested articles on Home; `showArticle(slug)` API                                                                                                                                                                            | Intercom Help space, Crisp helpdesk    | M (+BE S: public team article search) |
| 2.2 | **Deflection while typing**: suggest matching articles before the first message is sent                                                                                                                                                                                                                                                             | Intercom, Crisp                        | S                                     |
| 2.3 | **AI agent v2**: retrieval over help docs + AI knowledge (+ optionally resolved tickets); streamed answers over the socket; inline citations linking into the Help space; per-answer thumbs up/down; always-visible "Talk to a person"; AI disclosure; async LLM calls so the consumer isn't blocked; handoff summary posted to the agent and Slack | Fin, Hugo                              | L (mostly BE)                         |
| 2.4 | **Interactive messages**: buttons/quick replies, single-select picker, input field, cards. Used by AI, CSAT, email capture and agents (canned replies with buttons)                                                                                                                                                                                 | Crisp picker/field/carousel, Chatwoot  | M (+BE M)                             |
| 2.5 | **Special notice banner**: dashboard-set notice on Home and in the thread ("We're investigating delayed emails"), with expiry and per-language text                                                                                                                                                                                                 | Intercom special notices, Crisp status | S (+BE S, +FE S)                      |
| 2.6 | **Tickets space**: all of the customer's tickets with status, including ones created by email; `showTicket(id)`                                                                                                                                                                                                                                     | Intercom Tickets space                 | M (+BE S)                             |
| 2.7 | AI-generated conversation titles in the list (replace "Ticket #123" / "Support Chat")                                                                                                                                                                                                                                                               | Intercom                               | S (BE)                                |

### Phase 3: Differentiators

| #   | Item                                                                                                                                                                                                                                                     | Why it matters                                                                                                | Effort           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- |
| 3.1 | **Technical context capture (opt-in by host)**: recent console errors, failed network requests (URL and status only), app version, feature flags, custom metadata via `setContext()`, attached to the ticket and shown to agents and in the Slack thread | B2B SaaS support spends its first replies asking for this. Competitors need Jam, LogRocket or similar add-ons | M (+BE S)        |
| 3.2 | **Screenshot + annotate** button in the composer (capture the visible page, mask inputs, draw/highlight)                                                                                                                                                 | Same audience; strong demo moment                                                                             | M                |
| 3.3 | **Session replay link** hooks (`setReplayUrl` or integrations for PostHog, Sentry, LogRocket)                                                                                                                                                            | Turns a ticket into a reproducible bug report                                                                 | S                |
| 3.4 | **Honest response-time expectations** computed from actual first-response times during working hours ("Usually replies in 6 min") instead of a hardcoded "within minutes"                                                                                | Credibility; Slack-speed is a selling point, so show it                                                       | S (+BE S)        |
| 3.5 | **Headless client** (`@ticketping/chat-core`) plus a documented protocol, for teams that want their own UI or an in-app support page                                                                                                                     | Developer-friendly wedge; Intercom's closed UI is a common complaint                                          | M                |
| 3.6 | **Auto-translation** both ways (visitor writes in Spanish, agent reads English in Slack, reply goes back in Spanish)                                                                                                                                     | Crisp has it; an LLM makes it cheap; Slack-side agents benefit most                                           | M (BE)           |
| 3.7 | **Widget analytics**: opens, conversations started, AI resolution rate, deflection, CSAT, time to first response. `track()` is already stubbed                                                                                                           | Lets teams justify the widget and tune the AI                                                                 | M (+BE M, +FE M) |

### Phase 4: Later, if demand shows up

- Proactive messages and triggers (URL rules, time on page, custom events), Chatwoot-style "ongoing campaigns".
- Mobile: React Native / WebView bridge first, native iOS/Android SDKs only with clear demand.
- Voice notes, message search, multiple widgets/brands per team.

### Not planned

| Feature                                | Reason                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Co-browsing (Crisp MagicBrowse)        | Heavy, fragile across CSP and privacy settings; screenshot + context capture covers most of the value |
| Video/audio calls                      | Teams already use Zoom/Meet links; low leverage                                                       |
| Product tours, checklists, news feed   | Onboarding/marketing product, not support                                                             |
| Outbound campaigns and email marketing | Pulls the product toward Intercom's pricing and positioning                                           |

---

## 7. Suggested order

1. **Phase 0** in full. It's small and removes real risk (identity mix-up, XSS, silent message loss).
2. **Decisions 5.1 to 5.4**, then **Phase 1a** (trust and real-time feel). This is the biggest perceived-quality jump.
3. **Phase 1b and 1c** in parallel with **2.1 Help space**, which is mostly frontend on top of existing help docs.
4. **2.3 AI agent v2** with **2.4 interactive messages** (they share the protocol work).
5. **Phase 3**, starting with **3.1 and 3.2** (technical context and screenshot) as the headline differentiator, plus **3.4** because it's cheap.

---

## 8. Open questions

1. Who's the primary buyer: B2B SaaS teams (Phase 3 is the right bet) or broader SMB/e-commerce (proactive triggers move up)?
2. Should "Powered by Ticketping" removal, CSAT and AI v2 be plan-gated?
3. Is a native mobile SDK on the roadmap for any current customer, or can it wait for WebView?
4. Should the AI agent learn from resolved tickets, or only from published content? This has privacy and accuracy implications.
5. How much backend change can each phase carry? Roughly half of Phase 1 needs protocol and model changes in `ChatConsumer` and `ChatSession`.
