# Publishing @ticketping/chat-widget

npm publishes from a local checkout. GitHub Actions never publishes. After the version is on npm, pushing the matching tag uploads the CDN bundle.

Publish the commit you tag. A dirty tree can put one set of files on npm and another on `widget.ticketping.com`, because the release job checks out the tag and builds again.

## 1. Commit the version

Work from a clean `v2` checkout that is already pushed.

Set `version` in `packages/widget/package.json` (`2.0.0-beta.1` for a beta, `2.0.0` for the stable release). Commit that change and push it. The tag later has to match this string exactly.

## 2. Publish from that commit

Log in locally (`npm login`). The account passkey is the publish check. There is no `NPM_TOKEN` in GitHub.

```bash
npm run build -w @ticketping/chat-widget
npm publish -w @ticketping/chat-widget --tag next
```

`publishConfig.tag` is `next`, so a beta is published as `next` either way. A stable release must say so, or `latest` will not move:

```bash
npm publish -w @ticketping/chat-widget --tag latest
```

Do not make another commit between this publish and the tag.

## 3. Tag that same commit

```bash
git tag @ticketping/chat-widget@2.0.0-beta.1
git push origin @ticketping/chat-widget@2.0.0-beta.1
```

Use the version you just published. The tag pattern the workflow accepts is `@ticketping/chat-widget@2.*`.

The `release` workflow runs on that tag, in the `production` environment. It stops before Cloudflare if this exact version is not on npm yet. Re-run the workflow after the local publish if the tag was pushed first. Then it uploads `v2/<version>/` to the `ticketping-widget` bucket.

- A version with a hyphen (`2.0.0-beta.1`) does not change `/v2/loader.js`. Test it at `https://widget.ticketping.com/v2/<version>/widget.js`.
- A stable version also copies the loader to `/v2/loader.js`. Sites pick that up within 5 minutes.
- Versioned files are never overwritten. Publishing the same version again skips them.

## If the loader is wrong

Tag a newer stable version, such as `2.0.1`, and publish that. There is no older v2 loader to roll back to. The bad version's files stay at their immutable URL.
