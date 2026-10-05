# Dashboard API for widget v2

The contract between `ticketping.com` (dashboard) and `ticketping-backend` for everything the dashboard needs to manage widget v2. The widget's own API is `protocol.md`; this file is the team side.

## Conventions

- Base path `/api/v1/team/`. Auth and team selection exactly like the other team endpoints: the staff token plus the `x-team-slug` header (`apps.team.utils.get_team`).
- JSON is camelCase. The widget, identity-secret and GIF endpoints build camelCase keys themselves and use the plain JSON renderer and parser, not the camel-case ones, so values the host controls (`attributes`, `claims`, `texts` keys, `appearance`) are never rewritten, in either direction. The ticket additions at the end use the existing ticket endpoints and their camel-case renderer.
- Errors: `{ "error": { "code", "message", "details"? } }`, same codes as `protocol.md` 1.1 where they apply, plus `forbidden` (403, role too low), `plan_limit` (403, `details.limit`) and `conflict` (409). Field errors put `invalid`, `too_long`, `required` or `unknown` in `details.fields`, keyed by path (for example `appearance.accentColor`).
- A missing or invalid staff token, or a token sent with the slug of a team the user isn't in, gets the existing `401 { "detail": "..." }` from the auth layer, like every other team endpoint.
- Roles: any active member may read. `OWNER` and `ADMIN` may create, edit, rotate and revoke.
- Times are ISO 8601 UTC.

## Widgets

### `GET /api/v1/team/widgets/`

`{ "widgets": [Widget], "limit": 5 }`. `limit` is the number of widgets the team's plan allows. There's no plan model yet, so the backend returns 5 for every team.

### `POST /api/v1/team/widgets/`

Body `{ "name": "Product app", "slackChannelId"?: "C123", "aiEnabled"?: bool }`. Creates the config and its first publishable key. `201 { "widget": Widget }`. At the limit: `403 plan_limit`.

### `GET | PATCH | DELETE /api/v1/team/widgets/{id}/`

`Widget`:

```json
{
  "id": "wc_...",
  "name": "Product app",
  "createdAt": "...",
  "appearance": {
    "accentColor": "#171717",
    "colorMode": "auto",
    "position": "bottom-right",
    "launcher": { "icon": "chat", "label": null, "hideWhenOpen": false }
  },
  "texts": {
    "greetingTitle": "...",
    "greetingBody": "...",
    "composerPlaceholder": "...",
    "conversationStarter": "...",
    "replyTimeHint": "..."
  },
  "features": {
    "ai": false,
    "attachments": true,
    "emailCapture": true,
    "emoji": true,
    "gifs": false
  },
  "gifRating": "g",
  "security": { "requireVerifiedIdentity": false, "identifiedOnly": false, "loginUrl": null },
  "allowLocalhost": true,
  "domainsLocked": false,
  "slackChannelId": null,
  "keys": [{ "key": "pk_...", "createdAt": "...", "expiresAt": null }],
  "domains": [{ "id": 12, "host": "app.acme.com", "isTest": false }],
  "originSightings": [
    { "origin": "https://www.acme.com", "lastSeenAt": "...", "seenCount": 40, "blockedCount": 0 }
  ],
  "install": {
    "lastSeenOrigin": "http://localhost:5173",
    "version": "2.0.0",
    "integration": "react",
    "lastSeenAt": "..."
  }
}
```

- `id` is the config's opaque `sid` (no `wc_` prefix).
- `appearance` and `texts` are the **effective** values (stored overrides merged over the defaults in `apps/widget/serializers.py`). `PATCH` accepts partial objects and stores only keys that differ from the defaults. `null` (or an empty text) resets a key to its default. `texts.replyTimeHint` defaults to `null`; the widget gets it as `team.replyTimeHint`.
- `PATCH` accepts `name`, `appearance`, `texts`, `features`, `gifRating`, `security`, `allowLocalhost`, `domainsLocked` and `slackChannelId`, and ignores other top-level fields. Unknown keys inside `appearance`, `texts`, `features` or `security` are `400`.
- Validation: `name` is 1 to 128 characters; `accentColor` is `#RRGGBB` (stored upper-case); `colorMode` is `auto`, `light` or `dark`; `position` is `bottom-right` or `bottom-left`; `launcher.icon` is `chat`, `help` or `none`; `launcher.label` is at most 64 characters or `null`; `launcher.hideWhenOpen` is a boolean (default `false`; when `true` the panel opens in the corner and the launcher is hidden until it closes); each text is at most 256 characters; feature and security flags are booleans; `gifRating` is `g`, `pg` or `pg-13`; `loginUrl` is `https://` (or `http://localhost`), at most 512 characters, or `null`; `slackChannelId` is a Slack channel ID (upper-case letters and digits) or `null`.
- `keys` lists active keys only (an old key during its 24-hour rotation grace has `expiresAt`). Keys are publishable, so they're returned in full.
- `originSightings`: the 20 most recent origins not on the allowed list.
- `install` fields are `null` until the widget first boots.
- `DELETE` deletes the config, its keys, domains and visitors. Conversations stay, with `widget_config` set to null.

### Domains

- `POST /api/v1/team/widgets/{id}/domains/` body `{ "host": "app.acme.com" | "*.acme.com", "isTest"?: bool }`. Lower-cases the host, drops a trailing dot and stores international names as punycode. Rejects schemes, paths, ports, IPs, `localhost`, single-label hosts and TLD wildcards like `*.com` with `400 invalid_request`. A host already on the list is `409 conflict`. At most 100 domains per widget. `201 { "domain": {...} }`.
- `PATCH /api/v1/team/widgets/{id}/domains/{domainId}/` body `{ "isTest": bool }`.
- `DELETE /api/v1/team/widgets/{id}/domains/{domainId}/`. `204`.
- Adding a domain removes the matching origin sightings.

### Keys

- `POST /api/v1/team/widgets/{id}/keys/rotate/`: new key; current keys keep working for 24 hours. `201 { "key": {...}, "keys": [...] }`.

## Identity secret

One per team (`TeamJwtSecret`), shown once.

- `GET /api/v1/team/identity-secret/` → `{ "current": { "createdAt", "preview": "tpis_…a1b2" } | null, "previous": { "createdAt", "expiresAt", "preview" } | null }`.
- `POST /api/v1/team/identity-secret/` → generates the first secret: `201 { "secret": "tpis_...", "current": {...} }`. If one exists: `409 conflict`; use rotate.
- `POST /api/v1/team/identity-secret/rotate/` → new secret; the old one expires in 24 hours (any older ones are revoked now). `201 { "secret": "tpis_...", "current": {...}, "previous": {...} }`. With no secret yet, it creates the first one and `previous` is `null`.
- `preview` is `tpis_…` plus the last 4 characters. A v1 secret (no prefix) shows `…` plus the last 4.
- `POST /api/v1/team/identity-secret/revoke-previous/` → `200 { "current": {...}, "previous": null }`.
- `POST /api/v1/team/identity-secret/validate/` body `{ "token": "..." }` → `200 { "valid": true, "claims": {...} }` or `200 { "valid": false, "reason": "token_expired", "claim"?: "exp", "message": "..." }`. Uses the team's active secrets and `apps.widget.identity`; never records the token as used, never creates customers. Any member may call it. Rate limited to 30 per minute per member. With no secret, the reason is `signature_invalid` and the message says to create one. A missing `token` is `400 invalid_request`.

## GIFs for the reply composer

- `GET /api/v1/team/gifs/trending/?offset=0&widget={id}` and `GET /api/v1/team/gifs/search/?q=...&offset=0&widget={id}`: same response as `protocol.md` 4.6.1, using that widget's rating (`g` when `widget` is omitted). An unknown `widget` is `404 not_found`. Any member may call them, 60 requests per minute per member. `503 gifs_unavailable` when `GIPHY_API_KEY` isn't set or GIPHY doesn't answer.

## Tickets and replies (additions to existing endpoints)

- Ticket detail (`chatMessages` and the ticket payload the inbox already loads) gains, for chat-widget tickets:
  - `chatSession`: `{ "id", "isTest", "phase", "widget": { "id", "name", "features": {...} } | null, "visitor": { "context": {...}, "unverifiedProfile": {...} | null, "contactEmail": ... } | null }`.
  - `customer` gains `verified` (true when created from a signed token, i.e. has `external_id` and a widget session) and `company`, `attributes`.
  - Each chat message gains `senderType` (`USER`, `AGENT`, `AI`, `SYSTEM`), `senderName`, `event` and `attachments: [Attachment]` using the protocol 3.5 shape (including `kind: "gif"`).
- Ticket lists gain `isTest` on chat-widget tickets, and accept `?includeTest=true`; by default test tickets are excluded.
- The existing team reply endpoint (`POST /api/v1/team-reply/create/` and the dashboard's reply call) accepts an optional `gif: { "provider": "giphy", "id" }`. Replies on a widget v2 ticket are delivered to the widget (socket `message.created`, sender `AGENT`) and to the Slack thread.
- Visitor messages sent after the ticket exists become ticket replies, so `chatMessages` leaves them out (no duplicates in the inbox).
- The team ticket socket sends `{ "customerTyping": true | false }` while the visitor types. `POST /api/v1/team-ticket/{id}/slack-typing/` also shows the agent typing in the widget.
- Dashboard ticket counts leave out test tickets.
