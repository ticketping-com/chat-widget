# SpendCrypto → widget v2

Internal playbook for putting [SpendCrypto](https://spendcrypto.com) on `@ticketping/chat-widget` **2.0.0-beta.5**. Public docs: [Migrate from v1](https://ticketping.com/docs/migrate-from-v1), [Django identity](https://ticketping.com/docs/identity-django), [JavaScript API](https://ticketping.com/docs/widget-api).

SpendCrypto is the only known production v1 install. The app is **Svelte 5** with a **Django** backend. They ship **`1.12.0` from npm** (`TicketpingChat`, `appId` + `teamSlug`), not the unpkg script. Nobody uses v1 widget auth (`userJWT`, `GET /api/v1/jwt/auth/`). Signed-in identity starts with v2. Old widget tickets stay in the inbox and Slack. The widget list does not include those v1 threads. See [Auth](#2-auth-signed-in-users).

Do **not** wait for `/v2/loader.js`. That URL is unpublished until a stable `2.0.0`. Pin the beta (CDN) or install `@next` (npm). Help center (`support.spendcrypto.com`) stays on v1.

## Recommended path

Use **npm `@next`** on the Svelte 5 app, because that is how v1 is installed today. Sign tokens in **Django** (`POST /api/ticketping-token`). Do not add a SvelteKit token route. Configure the widget in the Ticketping dashboard (appearance, AI, domains, verified identity). SpendCrypto has no staging. Roll out localhost → production. Keep v1 on production until localhost looks right.

Pinned CDN is the fallback if they want a script tag and SRI instead of a package bump. Same `pk_` and the same Django route either way.

| Channel | What to do |
| --- | --- |
| SpendCrypto app / site | Cut over to v2 (this doc) |
| `support.spendcrypto.com` | Leave on v1 |
| ticketping.com dashboard chat | Already on `2.0.0-beta.5` |

## 1. Dashboard (Ticketping, SpendCrypto team)

Do this before any SpendCrypto deploy.

1. Open [Settings → Widgets](https://ticketping.com/dashboard/settings/widgets). Use the migrated default widget, or create one named for production (for example `SpendCrypto`).
2. Copy the publishable key (`pk_…`). It is public. It only works on allowed domains (and always on localhost).
3. **Appearance.** v1 baked a SpendCrypto theme into the package. v2 does not. Set accent, light/dark, position, and launcher to match the site. Code can override these later; dashboard is enough if the site is one brand.
4. **Texts.** Greeting title/body, composer placeholder, reply-time hint.
5. **Features.** Turn **AI answers** on only if they want the bot first. Attachments on. Email capture on (anonymous visitors). GIFs off unless they accept GIPHY seeing visitor IPs. Emoji can stay on.
6. **Routing.** Slack channel for widget tickets (or team default).
7. **Security**
   - Allowed domains: production hosts (`spendcrypto.com`, `www.spendcrypto.com`, app host if different). Localhost is always allowed and always TEST.
   - If v1 used `authOnlyTickets`, turn on **Identified users only** and set the login URL.
   - Turn on **Require verified identity** before production so `identify` without a signed token is rejected.
8. [Settings → API → Identity secret](https://ticketping.com/dashboard/settings/api-keys): generate `TICKETPING_IDENTITY_SECRET` (`tpis_…`) if the team has none. If create returns 409, rotate and use the new value. Nothing in production depends on the old secret. v1 widget auth has no callers, so rotation does not break a live login. Same secret in every SpendCrypto environment. Show-once. Never put it in the browser bundle.

Install detection: load the widget on localhost and the dashboard should show something like `Detected on localhost`.

## 2. Auth signed-in users

v1 widget auth is unused. No install sends `userJWT` or calls `GET /api/v1/jwt/auth/`. Those checks only exist for a logged-in v1 widget. After SpendCrypto's app is on v2, remove them (see [After it is live](#7-after-it-is-live)). Do not keep them working through the cutover.

The help center stays on the v1 widget, unsigned. That does not need `userJWT`.

### What to build for v2

This is new on the SpendCrypto app, not a port of a live signer. The widget calls `getToken()` and Django returns a **fresh HS256 token** (`sub`, `exp` ≤ 10 minutes; use 5). Each token is single-use. Full copy-paste: [Django identity](https://ticketping.com/docs/identity-django). Canonical files: `chat-widget/examples/token-routes/django/`.

`sub` is the stable SpendCrypto user id (`str(user.pk)`, or a public id they will never change). v2 stores it on `Customer.external_id` and looks the person up by that, not by email. If a leftover `userJWT` helper exists, delete it. Do not send that JWT to the widget.

Checklist:

1. `pip install PyJWT` (no `crypto` extra) if it is not already installed.
2. `TICKETPING_IDENTITY_SECRET` in env and `settings.py` (`os.environ["TICKETPING_IDENTITY_SECRET"]`, fail at boot if missing).
3. View `POST /api/ticketping-token`:
   - 401 if not authenticated
   - claims `{ sub, exp: now+300 }`, plus `email` / `name` only when non-empty
   - body is **plain text**, not JSON
4. CSRF: the Svelte app's `getToken` POSTs to this Django route. Send the same `X-CSRFToken` header the rest of the app already uses. If the Svelte app is on another origin, add CORS and `CSRF_TRUSTED_ORIGINS` as in the Django doc.
5. On logout, the frontend must call `Ticketping.logout()` (or `Ticketping('logout')`) so the next person on the same device is not the previous user.
6. Paste a token from localhost into the dashboard **token validator** before trusting production.

If the API is DRF, use `examples/token-routes/django/ticketping/views_drf.py` (`IsAuthenticated`) instead of the session view.

`sub` must stay stable forever. Changing it later creates a second customer.

### What a logged-in user sees

Logging in does **not** put old widget threads back in the widget. v2 lists sessions with a `phase`, and a verified user only sees sessions whose `customer` FK is theirs. v1 sessions leave `phase` empty, so they are skipped.

The old threads are still in the same tables. SpendCrypto's are the anonymous path: the address they typed is on `ChatSession.email` and `Ticket.email`, and there is usually no `customer` FK. Those rows are not migrated. Matching them by email would let someone file a ticket under another person's address. See [V1_WIDGET_BACKEND.md](./V1_WIDGET_BACKEND.md).

In v2, a ticket opened in a browser and then identified in that same browser is linked to the customer, ticket included. A different browser that only shares the email is not.

Until a migration runs, a returning user opens v2, sees an empty history, and starts a new conversation. Later v2 conversations for that same `sub` show up on every device. Old threads stay in the inbox and Slack.

## 3. Frontend: Svelte 5

### npm (preferred)

On the Svelte 5 app, from a branch that still has v1:

```bash
npm install @ticketping/chat-widget@next
```

That resolves to **`2.0.0-beta.5`**. npm `latest` stays `1.12.0`. The v2 Svelte adapter needs Svelte 5, which this app already is. Do not use `@ticketping/chat-widget/react`.

Remove:

- `TicketpingChat`, the v1 Svelte wrapper, and any React `TicketpingChat` if it is still imported
- `appId`, `teamSlug`, any `userJWT` config or `identify({ userJWT })` if it is still in the tree (it is unused), `apiBase` / `wsBase` unless they are talking to a **local** Ticketping backend
- Extra CSS import (`@ticketping/chat-widget/style` / unpkg CSS). v2 styles live in the shadow root.
- `window.ticketpingConfig`

Mount `<Ticketping>` once, in the root layout, from `@ticketping/chat-widget/svelte`. Pass the signed-in user the app already has. `null` means signed out: the component logs the widget out. Do not also call `Ticketping.logout()` from `@ticketping/chat-widget`. That import is a different instance and does not control this component.

`getToken` POSTs to the Django route on every call. Do not cache the JWT. Each token is single-use. Use the CSRF header the app already sends on other POSTs.

```svelte
<script lang="ts">
  import { Ticketping } from '@ticketping/chat-widget/svelte'

  let { user } = $props()

  async function getToken() {
    const res = await fetch('/api/ticketping-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': csrfToken } // the token this app already sends on POST
    })
    if (!res.ok) throw new Error(`Ticketping token request failed (${res.status})`)
    return res.text()
  }
</script>

<Ticketping
  publishableKey="pk_..."
  user={user ? { id: user.id, email: user.email, name: user.name } : null}
  {getToken}
/>
```

`user` may be `{ id, email, name }` or `{ userId, email, name }`. The component renders nothing on the server.

Theme: set it in the dashboard first. Only pass `appearance` if the app toggles dark mode or accent. `hideLauncher` is the prop when they open chat from their own button. There is no `Ticketping.open()` for this component. The launcher is the open control.

### Pinned CDN (if they drop npm)

`/v2/loader.js` is 404 until stable `2.0.0`. Pin beta.5 and SRI from the manifest:

```
https://widget.ticketping.com/v2/2.0.0-beta.5/widget.js
sha384-6DTg9GIZcF2QCFEfLkbfuA6CXA13XuozGh29+SjydijCeuL6bemIQAm5GjT4gAw8
```

Manifest: `https://widget.ticketping.com/v2/2.0.0-beta.5/manifest.json` (`integrity["widget.js"]`).

```html
<script>
  window.Ticketping ||= (...args) => (Ticketping.q ||= []).push(args)
  Ticketping('init', { publishableKey: 'pk_...' })
</script>
<script
  src="https://widget.ticketping.com/v2/2.0.0-beta.5/widget.js"
  integrity="sha384-6DTg9GIZcF2QCFEfLkbfuA6CXA13XuozGh29+SjydijCeuL6bemIQAm5GjT4gAw8"
  crossorigin="anonymous"
  async
></script>
```

No `data-key` on this tag (the loader is what reads `data-key`). Identify signed-in users the same way as the Django template example.

Versioned CDN files are immutable. A later beta needs a new URL and a new hash.

## 4. Verify on localhost

Localhost conversations are **TEST**: tagged in the inbox, `[TEST]` in Slack, excluded from reports, deleted after 30 days.

1. Signed-out visitor: launcher, greeting, can send (unless identified-only). Email capture if enabled.
2. Signed-in user: identify runs, inbox shows a **Verified** customer for that `sub`. Token validator accepts a console-fetched token. Widget history is empty. Old tickets are still only in the inbox.
3. Slack: message lands in the widget channel; a reply appears in the widget.
4. AI on: connecting bubble, then a reply or handoff. AI off: no handoff pill, goes to the team.
5. Logout: `Ticketping.logout()`, then a second account does not see the first's threads.

A logged-in user with v1 tickets sees those tickets in the inbox, not in the widget. That is expected.

## 5. Production cutover

1. Localhost checklist above is done. There is no staging soak.
2. Lock allowed domains (learning mode off).
3. **Require verified identity** on.
4. Deploy the Django route and `TICKETPING_IDENTITY_SECRET` first. Harmless until the new widget calls it. Rotating the identity secret is fine. v1 widget auth has no callers.
5. Deploy the frontend that inits v2 and identify via `getToken`. Remove the v1 mount from the app in the **same** release so two widgets do not both sit on the page. Delete any `userJWT` code in that release too.
6. Smoke on production: anonymous + logged-in + Slack round-trip.
7. Watch Ticketping inbox for untagged (non-TEST) tickets from SpendCrypto.

Rollback: revert the frontend to `1.12.0` / `TicketpingChat`. v1 keys and endpoints stay up. Do not delete the v2 widget config. SECRET can stay in env.

## 6. What not to do

- Do not publish or wait on `/v2/loader.js` for this cutover.
- Do not `npm i @ticketping/chat-widget` without `@next` or `2.0.0-beta.5`; `latest` is still **1.12.0**.
- Do not reuse v1 `appId` / `teamSlug`. Do not wire up `userJWT`. It has no users.
- Do not put `TICKETPING_IDENTITY_SECRET` in the Svelte app (`$env/static/public`, `$env/dynamic/public`, `VITE_`, `PUBLIC_`). It stays in Django settings.
- Do not switch `support.spendcrypto.com` to v2 as part of this (help center is still v1).
- Do not tag a stable `2.0.0` until SpendCrypto (and ticketping.com) have run on the beta and you explicitly want every unpinned `/v2/loader.js` site to move.

## 7. After it is live

- Keep `package.json` on `@ticketping/chat-widget@2.0.0-beta.5` (or `@next`) until `2.0.0` is `latest`.
- When you cut stable `2.0.0`, they can move to `latest` and, if they want the mutable loader, to `https://widget.ticketping.com/v2/loader.js`.
- v1 hotfixes, if any, stay on the `v1` branch / `1.12.x` until the help center moves. The app no longer needs them.
- Remove v1 widget auth once the SpendCrypto app is on v2 and production has been checked. It only served a logged-in v1 widget, and nobody uses that. Delete `GET /api/v1/jwt/auth/` (`apps/customer/views.py` `auth_jwt`) and the chat-socket rule that a session with a customer requires the v1 customer JWT (`ChatConsumer._load_and_authorize_chat_session`, `_attach_customer_from_jwt`). Leave `support-portal/chat-jwt/` and the identity-secret table. The help portal and v2 both still need those. The help center widget can stay on v1 unsigned.

## Agent prompt (paste into SpendCrypto’s coding agent)

Use the Django page prompt as the base, and add:

```
SpendCrypto is a Svelte 5 app with a Django backend.
It currently ships @ticketping/chat-widget 1.12.0 (TicketpingChat, appId + teamSlug).
Nobody uses v1 widget auth. Do not port userJWT or GET /api/v1/jwt/auth/.
If that code is in the tree, delete it.
Replace the widget with @ticketping/chat-widget@next (2.0.0-beta.5). Do not use /v2/loader.js.
Do not add a SvelteKit token route or use the React adapter.
Keep support.spendcrypto.com unchanged.

1. Django: POST /api/ticketping-token as https://ticketping.com/docs/identity-django.md
   sub is the stable SpendCrypto user id (str(user.pk) unless they already have a public id).
   TICKETPING_IDENTITY_SECRET comes from me. Do not invent it. Do not put it in the Svelte app.
2. Svelte 5: mount <Ticketping> from '@ticketping/chat-widget/svelte' once in the root layout.
   user={signedIn ? { id, email, name } : null}. getToken POSTs to /api/ticketping-token
   with the app's existing CSRF header and returns res.text(). Throw if !res.ok.
   Passing user={null} logs the widget out. Do not call Ticketping.logout() from
   '@ticketping/chat-widget'; that is a different instance.
3. Remove the v1 Svelte wrapper, ticketpingConfig, userJWT, appId, teamSlug, and the v1 CSS import.
4. Publishable key comes from me.
5. Old tickets stay in the Ticketping inbox. The widget history starts empty.
   Do not try to load v1 threads into the v2 widget.
```
