# Token routes

The server code from the identity verification docs, one folder per stack. Each route looks up the signed-in user, signs `{ sub, email, name, exp: now + 300 }` with HS256 and `TICKETPING_IDENTITY_SECRET`, and returns the token as text. The docs paste these files as they are, so edit them here first, then copy the changed files into `ticketping.com/src/lib/content/docs/token-routes`. The site build uses that copy, because production does not have this repository beside it.

| Folder           | Route file                                                                                               | Library            |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ------------------ |
| `django`         | `ticketping/views.py` (or `views_drf.py` for Django REST framework), `ticketping/urls.py`, `settings.py` | PyJWT              |
| `fastapi`        | `app/ticketping.py`                                                                                      | PyJWT              |
| `flask`          | `ticketping.py`                                                                                          | PyJWT              |
| `node`           | `ticketping-token.js` (Express)                                                                          | `jose`             |
| `nextjs`         | `app/api/ticketping-token/route.ts`                                                                      | `jose`             |
| `sveltekit`      | `src/routes/api/ticketping-token/+server.ts`                                                             | `jose`             |
| `nuxt`           | `server/api/ticketping-token.post.ts`                                                                    | `jose`             |
| `tanstack-start` | `src/routes/api/ticketping-token.ts`                                                                     | `jose`             |
| `react-router`   | `app/routes/api.ticketping-token.ts`                                                                     | `jose`             |
| `astro`          | `src/pages/api/ticketping-token.ts`                                                                      | `jose`             |
| `rails`          | `app/controllers/ticketping_tokens_controller.rb`                                                        | `jwt` gem          |
| `go`             | `ticketping.go`                                                                                          | `golang-jwt/jwt`   |
| `php`            | `routes/web.php`, `config/services.php` (Laravel)                                                        | `firebase/php-jwt` |

## Check

```bash
npm ci --prefix examples/token-routes
pip install -r examples/token-routes/requirements.txt   # optional: Django, FastAPI, Flask
gem install jwt                                          # optional: Rails
npm run examples:check
```

`check.ts` runs every route it can for a fixed test user, with the clock set to the vectors' `now` (Go and PHP use the real clock), and verifies the token with `spec/reference/verify-token.ts` against the vectors' current secret. For the JavaScript and Python routes, it also checks that a signed-out request is refused (`401` or `403`). Stacks whose language or packages aren't installed are skipped with a message. Framework modules and the app's own auth helpers are stubbed in `harness/`.
