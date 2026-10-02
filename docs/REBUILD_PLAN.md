# Chat Widget v2: Rebuild Plan

Rewrite the widget from scratch. The only production user is SpendCrypto (on `1.12.0` from npm), so v2 makes no backward-compatibility promises. v2.0 ships when its full scope is done; there's no rush to cut over.

**Audience:** teams that handle support from Slack. That means mainly B2B SaaS, plus small B2C product teams. E-commerce is out of scope for now.

**Priorities, in order:** security, then easy installation on any framework, then a great first-setup experience.

**Core requirement: Resend/Vercel-level simplicity for developers.** Every piece of setup has to justify itself. A developer handles exactly two values: one publishable key in the snippet, and one identity secret on their server, the same in every environment. Security comes from the server enforcing strict rules (short-lived, single-use, signed tokens; origin checks), not from asking developers for more configuration.

Related: `FEATURES.md` (v1 inventory), `COMPETITIVE_GAP_PLAN.md` (gaps vs Intercom, Chatwoot, Crisp).

---

## 1. Decisions so far

| Topic                   | Decision                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI framework            | Svelte 5, compiled into the bundle, rendered inside a Shadow DOM                                                                                                                                                                                                                                         |
| CDN                     | `widget.ticketping.com`                                                                                                                                                                                                                                                                                  |
| npm package             | Keep `@ticketping/chat-widget` (v2.0.0)                                                                                                                                                                                                                                                                  |
| Browser global          | `window.Ticketping`                                                                                                                                                                                                                                                                                      |
| Install key             | One rotatable publishable key per widget (`pk_...`). No separate test and live keys                                                                                                                                                                                                                      |
| Identity secret         | One per team (`TICKETPING_IDENTITY_SECRET`), the same in every environment. Rotation keeps the old secret working for 24 hours, so no `kid` is needed                                                                                                                                                    |
| Domains                 | The key works on listed domains (learn-then-lock) plus localhost, which is always allowed so local setup needs nothing. Blocked origins are surfaced in the dashboard as one-click "allow" suggestions                                                                                                   |
| Test data               | Conversations from localhost (or a domain marked as test, like staging) are flagged as test automatically                                                                                                                                                                                                |
| Widget configs          | A team can have several (for example "Marketing site" and "Product app"); each key maps to one config. Free: 1 widget. Pro: 5 widgets. Enterprise: custom                                                                                                                                                |
| "Powered by Ticketping" | Always shown on Free and Pro. Removal is Enterprise only                                                                                                                                                                                                                                                 |
| Slack routing           | Per widget config, falling back to the team's first connected Slack channel. If Slack isn't connected, no Slack message is sent (tickets still appear in the dashboard)                                                                                                                                  |
| Host identity           | Short-lived signed token fetched through a `getToken` callback                                                                                                                                                                                                                                           |
| Unverified identify     | Allowed in a "getting started" mode: flagged to agents, never reveals history. Teams switch on "require verified identity" before going live                                                                                                                                                             |
| History                 | Identified (verified) users get server history across devices. Anonymous visitors see this browser's conversations only                                                                                                                                                                                  |
| Email capture           | Asked only when the host hasn't identified the visitor, and used only for reply notifications                                                                                                                                                                                                            |
| Config source           | Code beats the dashboard, which beats built-in defaults. Appearance and texts are fully overridable; features can only be switched off from code; security, branding, Slack routing and domains are dashboard-only. See protocol 3.1.1                                                                   |
| Consent                 | `init({ consent: 'pending' })` stores nothing and opens no socket until consent                                                                                                                                                                                                                          |
| Launch integrations     | HTML script tag, Next.js, React (Vite), TanStack Start/Router, SvelteKit, Vue/Nuxt, React Router v7, Astro, Google Tag Manager                                                                                                                                                                           |
| Server token signing    | No server packages. The token is a standard HS256 JWT, so teams sign it with the JWT library they already use. We ship per-stack docs (copy-paste route code) and a "copy prompt for your AI coding agent" for each, verified by the dashboard token validator. **Django docs come first** (SpendCrypto) |
| First setup             | Dashboard wizard, "copy prompt for your AI coding agent", Ticketping MCP server (docs + setup tools)                                                                                                                                                                                                     |
| MCP server              | A Django app in `ticketping-backend` (shares models), run as its own process on the same API server                                                                                                                                                                                                      |
| Languages               | English only at launch. The i18n catalog and RTL support are still built in, so adding languages later is content work only                                                                                                                                                                              |
| Data retention          | See section 2.6                                                                                                                                                                                                                                                                                          |
| AI at launch            | Today's behavior, made async, with its own `AI` sender and an always-visible "Talk to a person"                                                                                                                                                                                                          |
| Help portal identity    | Stays separate; same `Customer` record matched by `external_id`                                                                                                                                                                                                                                          |

---

## 2. Security and auth design

### 2.1 Problems in v1 this replaces

- Host tokens without `exp` never expire. Without `external_id`, the lookup matches an arbitrary customer (`external_id IS NULL`).
- The Ticketping chat JWT lasts 7 days, can't be revoked, sits in a script-readable cookie, is reused across user switches, and travels in WebSocket URLs (so it appears in logs).
- An anonymous chat is protected only by its session ID.
- Agent HTML is rendered unsanitized into the host page.
- Any site can embed any team's widget.

### 2.2 Keys and secrets

| Thing                             | Public?              | Purpose                                                                                                                               |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Publishable key `pk_...`          | Yes (in the snippet) | Selects the widget config. Rotatable. Origin-checked                                                                                  |
| Identity secret (`TeamJwtSecret`) | No, server only      | Host signs user tokens with it. One per team; during a rotation the old one keeps working for 24 hours and the server tries both      |
| Visitor token                     | Browser storage      | Opaque random 256-bit value, stored hashed server-side. Identifies an anonymous visitor for one widget config                         |
| Session tokens (access + refresh) | Browser storage      | Issued after verified identify. Access token lasts 15 minutes; the refresh token rotates on each use, lasts 30 days, and is revocable |

Tokens are stored in `localStorage` under keys namespaced by publishable key. Cookies are deliberately avoided: from a customer's site, a cookie on `api.ticketping.com` is third-party and is partitioned or blocked in Safari and Chrome. An XSS on the host could read the tokens, but such an attacker already controls the logged-in user's session there, and short lifetimes plus server-side revocation limit the damage.

### 2.3 Visitor lifecycle

```
boot(pk) ──> anonymous visitor (visitor token)
   │
   ├─ identify({ email, name })                       [only if config allows unverified]
   │     └─> same visitor, "Unverified" badge for agents, no extra history
   │
   └─ identify({ userId, ..., getToken })
         └─ widget calls getToken() ─> host server signs JWT ─> POST /v2/widget/identify
               └─> verified Customer (team, external_id = sub)
                   + this visitor's anonymous conversations merged in
                   + session tokens issued; server history available
```

- **Verified token rules** (enforced server-side):
  - `sub` (the host's user ID) is required.
  - `exp` is required and at most 10 minutes away. `iat`, `nbf` and `aud` are optional and checked when present.
  - HS256 only. No `kid`, `jti` or `aud` needed.
  - Single use: the server remembers each accepted token's signature until it expires.
  - Signed claims (email, name, company, attributes) override anything passed unsigned.
- **Customer lookup:** only by `(team, external_id = sub)`, never by email or a null ID. A new customer record is created if there's no match.
- **Merge:** only the conversations of the presenting visitor token are merged, never "all conversations with this email".
- **User switch:** if `identify` is called with a different `userId`, the widget drops session tokens and local conversation state before continuing.
- **Logout:** `Ticketping('logout')` revokes the refresh token server-side, clears storage, and starts a fresh anonymous visitor.
- **Token refresh:** the widget refreshes access tokens silently. If refresh fails, it calls `getToken()` again; if that fails, it falls back to anonymous mode and fires an `error` event (it never fails silently).

### 2.4 Per-widget-config security settings

- **Require verified identity:** unsigned `identify()` is rejected (the dashboard nudges this on before go-live).
- **Identified users only:** anonymous visitors see a "Log in to chat" call to action pointing at `login_url`. This replaces `authOnlyTickets`.
- **Allowed domains:** exact host or `*.acme.com` wildcard. Checked at boot and socket connect against `Origin`. This is defense in depth (non-browser clients can spoof `Origin`); the real protection is identity tokens and visitor binding.
- **Test conversations:** conversations from localhost or a domain marked as test are flagged `is_test`, shown with a TEST badge in the dashboard and a `[TEST]` prefix in Slack, kept out of reports, and never listed in a user's history on real domains. They follow the same Slack routing as real conversations (widget channel, else the team's first connected channel, else no Slack message).

### 2.5 Transport and content hardening

- No tokens in URLs. The socket authenticates with its first frame, and the server closes it if auth doesn't arrive within 5 seconds.
- HTML from agents or email is sanitized server-side and again client-side (DOMPurify allowlist). Markdown is rendered to a safe subset.
- Attachments: served with `Content-Disposition: attachment`, except a safe image allowlist. SVG and HTML are never rendered inline. Size and type are checked server-side.
- Rate limits per visitor, IP and widget config on boot, identify, send and upload. Cloudflare Turnstile (already used on ticketping.com) is an escalation path for abusive anonymous traffic.
- Shadow DOM isolates styles. The widget never writes to the host's `document.documentElement` or global CSS.
- Published Content Security Policy guidance (`script-src widget.ticketping.com`; `connect-src` for the API and `wss:`; `img-src` for attachments), tested in the playground under a strict CSP page.
- Optional pinned install: versioned bundle URLs with Subresource Integrity hashes, for teams that won't accept a mutable loader.

### 2.6 Data retention

Today nothing is deleted. v1 also creates a chat session when "Send us a message" is clicked, even if nothing is sent. v2 policy, run as a daily django-cron job (the backend already uses `runcrons`):

| Data                                                | Rule                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Empty conversations                                 | Not created in the first place: v2 creates the conversation on the first visitor message                                             |
| Conversations that became tickets                   | Kept with the ticket, as today. Ticket deletion and export are the team's controls                                                   |
| Anonymous, non-ticket conversations (AI-only chats) | Deleted after 12 months without activity. Kept until then for AI quality review                                                      |
| Anonymous visitors                                  | Visitor record and token expire after 12 months without activity; their remaining non-ticket conversations go with them              |
| Test conversations (localhost, test domains)        | Deleted after 30 days                                                                                                                |
| Revoked or expired session tokens                   | Deleted after 30 days                                                                                                                |
| Visitor context (IP, user agent, page URLs)         | IP not stored on the visitor; user agent reduced to browser/OS/device; page context kept with the conversation, under the same rules |

The 12-month window can become a per-team setting later if customers ask for it, for example for GDPR policies.

---

## 3. Repo strategy and layout

Rebuild in this repo on a `v2` branch:

1. Keep `master` (the default branch, with all history). Delete the stale `main`, which only holds the initial commit.
2. Tag the current code `v1.12.0` (tags stop at `v1.0.9`) and create a `v1` branch for SpendCrypto hotfixes.
3. On `v2`, delete v1 code and scaffold the layout below.
4. Publish `2.0.0-beta.N` under the npm `next` dist-tag.
5. Merge to `master` at `2.0.0`.

```
chat-widget/
  packages/
    core/          # internal: transport, API client, store, identity, events, i18n (no DOM, no framework)
    ui/            # internal: Svelte 5 UI in a Shadow DOM
    widget/        # published: @ticketping/chat-widget
      src/
        index.ts         # npm entry: Ticketping
        loader.ts        # CDN snippet: queue stub + lazy load (<2KB)
        react/           # /react: <TicketpingProvider>, useTicketping()
        vue/             # /vue: plugin + useTicketping()
        svelte/          # /svelte: <Ticketping />, store
  spec/
    protocol.md            # socket + REST contract (v2)
    token-test-vectors.json  # valid/invalid tokens; drives backend tests and checks every docs snippet in CI
  examples/                # one runnable app per supported framework, smoke-built in CI
    html/ nextjs/ react-vite/ tanstack-start/ sveltekit/ nuxt/ vue-vite/ react-router/ astro/
    token-routes/          # the docs' signing snippets as runnable files: django/ fastapi/ flask/ node/ rails/ go/ php/
  apps/
    playground/            # dev harness: hostile-CSS host, strict-CSP host, RTL, mobile; mock or local backend
  e2e/                     # Playwright against the playground and selected examples
  docs/
```

There are no server packages to install. Signing is about 10 lines with a JWT library the team already has, so each stack gets a docs page and a matching AI-agent prompt:

| Stack                                                                  | Library used in the docs |
| ---------------------------------------------------------------------- | ------------------------ |
| Django (first, for SpendCrypto), FastAPI, Flask                        | PyJWT                    |
| Next.js, TanStack Start, React Router, SvelteKit, Nuxt, Astro, Express | `jose`                   |
| Rails                                                                  | `jwt` gem                |
| Go                                                                     | `golang-jwt/jwt`         |
| Laravel / PHP                                                          | `firebase/php-jwt`       |

Every page signs the same small token (`sub`, `exp` of 5 minutes, plus optional `email` and `name`), one line in any library, and reads the secret from a single environment variable, `TICKETPING_IDENTITY_SECRET`. The snippets are kept as runnable files in `examples/` and checked in CI against `spec/token-test-vectors.json`, so the docs can't silently drift from what the backend accepts.

---

## 4. Installation experience

### 4.1 Script tag (HTML, Webflow, Framer, WordPress, Astro static)

```html
<script src="https://widget.ticketping.com/v2/loader.js" data-key="pk_xxx" async></script>
```

Identify from any page script; calls queue until the bundle loads:

```html
<script>
  Ticketping('identify', {
    userId: 'u_123',
    email: 'ada@acme.com',
    name: 'Ada',
    getToken: () => fetch('/api/ticketping-token', { method: 'POST' }).then((r) => r.text())
  })
</script>
```

### 4.2 npm and framework adapters

```bash
npm i @ticketping/chat-widget
```

| Framework               | Client                                                                    | Token route (from the docs, using `jose`)      |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| Next.js App Router      | `<TicketpingProvider publishableKey user getToken>` in a client component | `app/api/ticketping-token/route.ts`            |
| React (Vite)            | `@ticketping/chat-widget/react`                                           | the team's own backend (any stack's docs page) |
| TanStack Start / Router | `/react` provider in the root route                                       | Start server route                             |
| React Router v7         | `/react` provider in `root.tsx`                                           | route `action`                                 |
| SvelteKit               | `/svelte` `<Ticketping>` in `+layout.svelte`                              | `src/routes/api/ticketping-token/+server.ts`   |
| Vue / Nuxt              | `/vue` plugin / Nuxt plugin                                               | `server/api/ticketping-token.post.ts`          |
| Astro                   | script tag, or a framework island                                         | Astro endpoint                                 |
| Google Tag Manager      | community template (key field, optional identify variables)               | n/a (unverified identify or anonymous)         |

The token route is the only server code a team writes: look up the logged-in user, sign the claims from section 3, return the token as text. Each docs page shows it complete for that framework's routing and session conventions.

The adapters expose a reactive `unreadCount`, `isOpen`, `open()` and `showNewMessage()`, and identity changes follow the `user` prop automatically (log in, log out, switch user).

### 4.3 First-setup flow (dashboard wizard)

1. **Create widget:** name it ("Product app"), pick the Slack channel, toggle AI.
2. **Pick framework:** the page renders the exact snippet and files with the widget's key filled in, plus a "Copy prompt for your AI coding agent" button containing the same steps.
3. **Live install check:** "Waiting for widget..." turns into "Detected on localhost:5173 (v2.0.3)" in real time, pushed from the boot call.
4. **Send a test message** from the dashboard. It appears in the widget and in the chosen Slack channel; reply in Slack and it shows up in the widget. This is the moment the product makes sense.
5. **Identify users (optional at this step):** generate the identity secret (shown once), add the token route, then paste a token into the **token validator**, which shows decoded claims and plain-language errors ("exp is 24h; maximum is 10 minutes").
6. **Go-live checklist:** no key or secret changes; confirm and lock allowed domains (detected origins suggested), turn on "Require verified identity", customize appearance with live preview.

### 4.4 AI coding agents

- `llms.txt` and per-framework Markdown docs on docs.ticketping.com.
- **Ticketping MCP server**:
  - Tools: docs search, list widget configs and keys, check install status, validate a user token, send a test message.
  - Authenticated with the team API key (the existing `HasTeamAPIKey` permission).
  - Built as a Django app (`apps/mcp`) using the official Python MCP SDK over streamable HTTP. It runs as a separate ASGI process on the same API server (its own port, routed as `mcp.ticketping.com`). It reuses Django models and services directly, and an MCP crash or restart can't take the main API down.
- The "Copy prompt" text in the wizard references the MCP server when it's available.

---

## 5. Widget architecture

| Area                        | Approach                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                    | TypeScript strict; types generated, not hand-written                                                                                                                |
| UI                          | Svelte 5 components; one host `<ticketping-widget>` element with an open shadow root; CSS injected into the shadow root                                             |
| Styling                     | Plain CSS with `--tp-*` tokens, scoped by Svelte. Tailwind v4 is avoided because its `@property` registrations don't apply inside shadow roots                      |
| State                       | `core` store (plain TypeScript with subscribe), wrapped in runes in the UI. `core` is testable without a DOM                                                        |
| Transport                   | One WebSocket per visitor, multiplexing all of their conversations. Reconnect with backoff + jitter, heartbeat, outgoing queue, client message IDs with server acks |
| i18n                        | Catalog in `core`; English bundled, other locales lazy-loaded; `Intl` dates; RTL via `dir`; per-locale texts from the dashboard                                     |
| Loader                      | Under 2KB: queue stub, reads `data-key`, loads the main bundle on idle or first interaction from versioned immutable paths                                          |
| Budgets (gzip, CI-enforced) | loader under 2KB; main chunk under 45KB including the Svelte runtime and sanitizer; lazy chunks for emoji, help center, locales, screenshot                         |
| Quality                     | Vitest (core + UI), Playwright (Chromium + WebKit), `size-limit`, ESLint/Prettier, Changesets; examples smoke-built in CI                                           |

### Public API

The same surface everywhere: queued `Ticketping('method', ...args)`, direct `Ticketping.method()` after load, and adapter hooks.

```
init({ publishableKey, locale?, hideLauncher?, consent?,
       appearance?, texts?, features? })    # code beats the dashboard; features can only be turned off
consent('granted' | 'denied')
identify({ userId?, email?, name?, company?, attributes?, getToken? })
update({ attributes?, page? })        # SPA route changes, attribute changes
logout()
open() / close() / toggle() / showLauncher() / hideLauncher()
showNewMessage(prefill?) / showConversation(id) / showSpace('home' | 'messages')
setLocale(locale) / setContext(obj) / trackEvent(name, meta?)
on(event, cb) / off(event, cb)        # ready, open, close, messageSent, messageReceived,
                                      # conversationStarted, unreadCountChange, identityChange, error
getUnreadCount() / isOpen() / destroy()
```

### v2.0 scope (in addition to the core loop: AI, handoff, ticket, Slack reply)

- Section 2 security in full.
- Delivery states, retry, reconnect banner. Unread count while closed for everyone (badge number, tab title, optional sound).
- Sender types `USER`, `AGENT`, `AI`, `SYSTEM`, with agent name and avatar, an AI label, a handoff divider and "Talk to a person".
- Typing in both directions. Ticket status in the list and thread.
- Inline email form (only when not identified). Page context capture and `setContext()`.
- Markdown; multiple attachments with drag-drop, paste and progress.
- GIFs (GIPHY) in both directions: widget, dashboard, Slack and email. See section 5.1.
- Emoji picker and `:` suggestions in the widget and dashboard composers; Slack shortcodes converted to Unicode (protocol 7.2).
- Accessibility (dialog, focus, Esc, live regions, IME-safe Enter); mobile polish.
- i18n: English only, but every string goes through the catalog and the layout supports RTL.
- Dashboard-driven appearance with live preview; light/dark/auto mode.

### 5.1 GIFs

GIFs work in every direction: widget, dashboard composer, Slack and email (protocol 3.5, 4.6.1 and 7.1).

- **Provider: GIPHY.** Tenor's API shut down on June 30, 2026. KLIPY is the fallback; `provider` is in every payload so a second provider is additive.
- **The backend proxies search** so the API key stays server-side, caches results, rate-limits per visitor and enforces the widget config's content rating (`g` by default).
- **Clients only send a GIPHY ID.** The server resolves it and stores the media URLs, so a visitor can't inject arbitrary image URLs into Slack, email or the dashboard.
- **Widget picker:** a lazy-loaded chunk (not in the 45 KB main budget) opened from a composer button. It has trending on open, debounced search, a keyboard-navigable grid, "Powered by GIPHY", and plays MP4 instead of GIF to save bandwidth. Reduced motion shows stills.
- **Off by default** for new widgets, because GIF media loads from GIPHY's CDN and exposes the visitor's IP to GIPHY. The dashboard toggle explains this in one sentence.

Deferred to v2.x (the protocol is designed for them now): help space, AI v2 (retrieval, streaming, citations), interactive messages, CSAT, screenshot and technical context capture, analytics.

---

## 6. Backend changes (ticketping-backend)

Everything is new under `v2`, alongside v1. v1 is removed after the SpendCrypto cutover.

**Models**

| Model                     | Fields (main)                                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WidgetConfig`            | team, name, appearance (JSON), texts per locale, ai_enabled, require_verified_identity, identified_only, login_url, slack_channel_id (falls back to team), default ticket channel, allowed_domains, last_seen_origin / version / at |
| `WidgetKey`               | widget_config, key, revoked_at (rotation keeps one old key working for 24 hours)                                                                                                                                                    |
| `Visitor`                 | widget_config, token_hash, customer (nullable), unverified email/name/attributes, context (JSON), first/last seen                                                                                                                   |
| `WidgetSession`           | visitor, customer, refresh_token_hash, expires_at, revoked_at, rotated_from                                                                                                                                                         |
| `ChatSession` (changed)   | + visitor, + widget_config, + context, + is_test                                                                                                                                                                                    |
| `TeamJwtSecret` (changed) | `env` dropped; rotation adds a second secret and expires the old one after 24 hours                                                                                                                                                 |

**Endpoints and socket**

| Endpoint                                         | Purpose                                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/v2/widget/boot`                       | Key + origin check. Returns config, texts, theme, visitor token (new or refreshed), identity state, conversations, unread count. Records install-check data  |
| `POST /api/v2/widget/identify`                   | Verifies the host token, upserts the customer by `external_id`, merges the visitor's conversations, issues session tokens (or records unverified attributes) |
| `POST /api/v2/widget/session/refresh`, `/logout` | Rotate or revoke                                                                                                                                             |
| `POST /api/v2/widget/uploads`                    | Authenticated by visitor/session; returns an attachment ID to reference in `message.send`                                                                    |
| `ws/v2/widget/`                                  | First-frame auth. Events specified in `spec/protocol.md`, each with a `v` field                                                                              |

**Behavior changes**

- The AI call moves off the consumer's sync path (Celery or an async client). AI messages get `sender: AI`.
- The dashboard composer's existing typing call also broadcasts to the widget.
- `post_ticket_to_slack` uses the widget config's channel when set. Tickets already store `slack_channel_id`, so threaded replies keep working.
- The ticket sidebar shows visitor context, attributes and the verified/unverified badge.
- Install-check events are pushed to the dashboard wizard over the existing team notification socket.
- GIFs: `GIPHY_API_KEY` setting; `ChatAttachment` gains `kind` and a `gif` JSON field; a GIPHY client with caching (widget and team-authenticated search endpoints); Slack outbound posts an `image` block; Slack inbound maps GIPHY app attachments and GIPHY links to `gif` attachments (uploaded `.gif` files keep going through `save_slack_files`); email notifications render `<img>`.
- Emoji: convert standard Slack shortcodes (including skin tones) to Unicode on inbound Slack messages, using a pinned shortcode map; leave custom workspace emoji as text.

**Dashboard (ticketping.com)**

Every widget v2 feature that needs a dashboard surface is tracked in `ticketping.com/plans/003-chat-widget-v2-dashboard.md`. Add to that plan whenever a widget feature is added here. In short:

- Widgets list and editor (appearance, texts, AI, GIFs, Slack channel, security toggles, domains with "allow" suggestions), with a live preview that shows dashboard values.
- Keys and the identity secret (rotate, revoke).
- Setup wizard, token validator, go-live checklist.
- Inbox: TEST, verified and unverified badges, visitor context, AI sender, GIF picker in the composer and GIF rendering in threads.

---

## 7. Milestones

| #   | Milestone           | Done when                                                                                                                                                                                                             |
| --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Scaffold            | Workspaces, three build targets, playground shows an empty shadow-DOM launcher, CI (types, lint, tests, size) green, repo housekeeping done                                                                           |
| M1  | Spec                | `spec/protocol.md` and the token rules + test vectors reviewed and agreed. This unblocks parallel work                                                                                                                |
| M2  | Backend foundation  | Models, boot, identify, refresh/logout, v2 socket with first-frame auth, async AI, Slack routing per config; tests                                                                                                    |
| M3  | Core + UI loop      | `core` against the mock server; Home, list, thread, composer, uploads, email form; AI, handoff, ticket, Slack reply works end to end on the local backend                                                             |
| M4  | v2.0 scope          | Everything in the section 5 scope list, plus security hardening and the strict-CSP / hostile-CSS playground pages passing                                                                                             |
| M5  | Install surface     | Loader on `widget.ticketping.com`, adapters, nine framework examples green in CI; token-route docs and AI-agent prompts for every stack (Django first), each checked against the test vectors; `llms.txt`             |
| M6  | Setup experience    | Dashboard widgets/keys/secrets (Free 1, Pro 5, Enterprise custom; "Powered by" removal Enterprise only), wizard with live detection and test message, token validator, go-live checklist, MCP service, retention cron |
| M7  | SpendCrypto cutover | SpendCrypto on the beta with the Django token view; a stable period; `2.0.0` published as `latest`; v1 endpoints removed                                                                                              |

SpendCrypto can start testing against the beta as soon as M3, and the Django token-route docs exist. The other stacks' docs don't block the cutover.

M2 and M3 run in parallel after M1. M5 and M6 can start once M2's endpoints are stable.

---

## 8. Status

- **M0 (scaffold):** done on the `v2` branch. Still to do by hand: push the `v1.12.0` tag and the `v1` and `v2` branches, and delete the remote `main`.
- **M1 (spec):** drafted in `spec/protocol.md`, with 45 generated token test vectors and a reference verifier. Waiting for review before M2 and M3 start.
