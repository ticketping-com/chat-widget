# Ticketping Chat Widget

The chat widget for [Ticketping](https://ticketping.com): customers chat on your site, your team answers from Slack.

> **This is the `v2` branch, a from-scratch rebuild in progress.** It isn't published yet. The released widget (`1.12.0`) lives on the `v1` branch and is tagged `v1.12.0`. The plan is in [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md) and the wire contract in [`spec/protocol.md`](spec/protocol.md).

## Layout

| Path                   | What it is                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `packages/core`        | Internal. State, transport, API client, sessions, outbox and i18n. No DOM, no framework                       |
| `packages/ui`          | Internal. Svelte 5 UI rendered inside a Shadow DOM                                                            |
| `packages/widget`      | Published as `@ticketping/chat-widget`. CDN loader, CDN bundle, npm entry, and React, Vue and Svelte adapters |
| `apps/playground`      | Dev harness with an in-memory mock API, plus a hostile-CSS host page                                          |
| `e2e`                  | Playwright smoke test: open the playground and send a message against the mock                                |
| `spec`                 | Protocol spec, host token rules, generated token test vectors and a reference verifier                        |
| `docs`                 | Planning documents                                                                                            |
| `deploy/cdn`           | Cloudflare Worker that serves published CDN bundles                                                           |
| `deploy/PUBLISHING.md` | How to publish npm locally, then tag the same commit for the CDN                                              |

## Development

Requires Node 22.18 or newer (the spec scripts run TypeScript directly).

```bash
npm install
npm run dev          # playground on http://127.0.0.1:5180
npm test             # unit tests (core, ui, widget, spec)
npm run typecheck
npm run lint         # ESLint + Prettier check
npm run test:e2e     # Playwright against the playground mock
npm run size         # build all targets and check size budgets
npm run spec:vectors # regenerate spec/token-test-vectors.json
```

`npm run dev` is the root script; `npm run dev -w @ticketping/playground` is the same server. The first Playwright run needs a browser: `npx playwright install chromium`.

### Mock API and a real backend

The playground boots the widget from source (`apps/playground/boot.ts` loads `packages/widget/src/cdn.ts`) and, by default, sets `apiUrl` to the page origin. The Vite dev server answers the widget protocol in memory: `POST /api/v2/widget/boot`, identify, conversations, messages, session refresh and logout, plus the socket at `/ws/v2/widget/`. Nothing is persisted. GIF search returns an empty page, and uploads are refused.

Open `http://127.0.0.1:5180/?api=http://localhost:7800&key=pk_...` to talk to a real backend instead. `hostile-css.html` uses the same `apiUrl` rule, so the launcher still mounts under hostile host CSS.

### Package entry points

`@ticketping/chat-widget` is the npm client (`Ticketping`, `createTicketping`). Framework adapters are separate entries, each with an optional peer dependency:

| Import                           | Export                                |
| -------------------------------- | ------------------------------------- |
| `@ticketping/chat-widget/react`  | `TicketpingProvider`, `useTicketping` |
| `@ticketping/chat-widget/vue`    | `TicketpingPlugin`, `useTicketping`   |
| `@ticketping/chat-widget/svelte` | `Ticketping` component                |

Builds land in `packages/widget/dist`:

| Output                        | Served as                                                  | Budget (gzip) |
| ----------------------------- | ---------------------------------------------------------- | ------------- |
| `cdn/loader.js`               | `widget.ticketping.com/v2/loader.js`                       | 2 KB          |
| `cdn/<version>/widget.js`     | `widget.ticketping.com/v2/<version>/widget.js` (immutable) | 45 KB         |
| `npm/index.js` + `index.d.ts` | `@ticketping/chat-widget`                                  | -             |

Use `npm run changeset` to record user-facing changes. Publishing steps are in [`deploy/PUBLISHING.md`](deploy/PUBLISHING.md).

## License

MIT
