# widget.ticketping.com

A Worker in front of the R2 bucket `ticketping-widget`. It serves only:

| Path              | Cache                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| `/v2/loader.js`   | 5 minutes, then revalidate (the snippet every site uses)                           |
| `/v2/<version>/*` | 1 year, `immutable` (the bundle, its lazy chunks, `manifest.json` with SRI hashes) |

Everything else is a 404. All responses allow cross-origin loading and send `X-Content-Type-Options: nosniff`.

## One-time setup

Steps 1 and 2 were done on 2026-10-03 in the `Ivarojha@gmail.com's Account` account (`627174d26492441eddefd87f2b3b9acb`). The bucket's location is APAC; the Worker's edge cache makes that matter only on a cold cache.

1. Create the bucket: `npx wrangler@4 r2 bucket create ticketping-widget`.
2. Deploy the Worker (this also attaches the `widget.ticketping.com` custom domain, since the zone is on Cloudflare): `npx wrangler@4 deploy --config deploy/cdn/wrangler.jsonc`.
3. In GitHub, add the `CLOUDFLARE_API_TOKEN` (Workers R2 Storage edit) and `CLOUDFLARE_ACCOUNT_ID` secrets on the `production` environment. npm is not published from GitHub.

## Releasing

Follow [PUBLISHING.md](../PUBLISHING.md). npm is published locally. The matching tag then runs `node deploy/cdn/upload.ts`.

- Versioned files are never overwritten. Re-running a release for an existing version skips them.
- Prereleases (`2.0.0-beta.1`) upload their versioned files but don't move `/v2/loader.js`, so production sites only change on a stable release. Test a prerelease by pinning `/v2/<version>/widget.js`.
- Rolling back the loader: re-run the release workflow for the previous stable tag. Sites pick it up within 5 minutes.

## Tests

`node --test deploy/cdn/src/headers.test.ts`
