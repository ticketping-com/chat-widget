# Ticketping Chat Widget

The chat widget for [Ticketping](https://ticketping.com): customers chat on your site, your team answers from Slack.

> **This is the `v2` branch, a from-scratch rebuild in progress.** It isn't published yet. The released widget (`1.12.0`) lives on the `v1` branch and is tagged `v1.12.0`. The plan is in [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md) and the wire contract in [`spec/protocol.md`](spec/protocol.md).

## Layout

| Path              | What it is                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `packages/core`   | Internal. State, events and (soon) transport, API client and identity. No DOM, no framework     |
| `packages/ui`     | Internal. Svelte 5 UI rendered inside a Shadow DOM                                              |
| `packages/widget` | Published as `@ticketping/chat-widget`. Builds the CDN loader, the CDN bundle and the npm entry |
| `apps/playground` | Dev harness, including a hostile-CSS host page                                                  |
| `spec`            | Protocol spec, host token rules, generated token test vectors and a reference verifier          |
| `docs`            | Planning documents                                                                              |

## Development

Requires Node 22.18 or newer (the spec scripts run TypeScript directly).

```bash
npm install
npm run dev          # playground on http://localhost:5180
npm test             # unit tests (core, ui, widget, spec)
npm run typecheck
npm run lint         # ESLint + Prettier check
npm run size         # build all targets and check size budgets
npm run spec:vectors # regenerate spec/token-test-vectors.json
```

Builds land in `packages/widget/dist`:

| Output                        | Served as                                                  | Budget (gzip) |
| ----------------------------- | ---------------------------------------------------------- | ------------- |
| `cdn/loader.js`               | `widget.ticketping.com/v2/loader.js`                       | 2 KB          |
| `cdn/<version>/widget.js`     | `widget.ticketping.com/v2/<version>/widget.js` (immutable) | 45 KB         |
| `npm/index.js` + `index.d.ts` | `@ticketping/chat-widget`                                  | -             |

Use `npm run changeset` to record user-facing changes.

## License

MIT
