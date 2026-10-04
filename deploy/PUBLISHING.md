# Publishing @ticketping/chat-widget

npm versions are immutable. GitHub Actions never publishes. A `403` that says you cannot publish over a previously published version means you skipped the bump and tried to reuse a version that is already on npm.

Do these steps in order. Do not skip the waits.

## 0. Confirm the next version is new

On a clean `v2` checkout, after feature work is already pushed:

```bash
node -p "require('./packages/widget/package.json').version"
npm view @ticketping/chat-widget version --tag next
```

If those two strings match, that version is already on npm. Pick the next one (`2.0.0-beta.4` → `2.0.0-beta.5`, or `2.0.0` for stable). Do not publish yet.

**Wait:** GitHub Actions **CI** on the feature commits is green.

## 1. Bump, commit, push

Set `version` in `packages/widget/package.json` (and the matching entry in `package-lock.json`). Commit only that bump. Push `v2`.

The git tag later must match this string exactly: `@ticketping/chat-widget@<version>`.

**Wait:** CI on the bump commit is green. Do not publish while it is running or red.

## 2. Publish that exact commit to npm

Human, local. `npm login` if this machine is not already logged in. There is no `NPM_TOKEN` in GitHub.

```bash
node -p "require('./packages/widget/package.json').version"   # must be the NEW version
npm view @ticketping/chat-widget@"$(node -p "require('./packages/widget/package.json').version")" version
# that last command should fail (404). If it prints the version, stop and bump again.

npm run build -w @ticketping/chat-widget
npm publish -w @ticketping/chat-widget --tag next
```

A stable release that should move `latest`:

```bash
npm publish -w @ticketping/chat-widget --tag latest
```

Do not make another commit between this publish and the tag.

## 3. Tag the same commit

```bash
version=$(node -p "require('./packages/widget/package.json').version")
git tag "@ticketping/chat-widget@$version"
git push origin "@ticketping/chat-widget@$version"
```

**Wait:** the **Release** workflow on that tag (GitHub `production` environment; it may need a manual approval). It checks that this version is already on npm, then uploads `v2/<version>/` to the CDN. If you tagged before publish, re-run the workflow after npm succeeds.

Beta (`2.0.0-beta.5`) does not change `/v2/loader.js`. Test:

`https://widget.ticketping.com/v2/<version>/widget.js`

Stable also copies the loader to `/v2/loader.js` (about 5 minutes). Versioned files are never overwritten.

## If the loader is wrong

Publish a newer version. There is no rollback of `/v2/loader.js`. The bad version's files stay at their immutable URL.
