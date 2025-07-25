# Publishing Guide

This guide covers how to publish the Ticketping Chat Widget to npm and distribute it for production use.

npm link: https://www.npmjs.com/package/@ticketping/chat-widget

## 📋 Pre-Publishing Checklist

Before publishing, ensure all these items are completed:

### Required Files
- ✅ `README.md` - Comprehensive documentation
- ✅ `LICENSE` - MIT license file
- ✅ `CHANGELOG.md` - Version history and release notes
- ✅ `package.json` - Properly configured with all metadata
- ✅ Source code in `src/` directory
- ✅ Build configuration in `vite.config.js`

### Code Quality
- [ ] All tests pass: `npm run test:run`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Bundle size is acceptable (< 50KB gzipped)

### Documentation
- [ ] README is up to date with latest features
- [ ] CHANGELOG includes new version details
- [ ] Examples are working and tested
- [ ] API documentation is accurate

### Configuration
- [ ] `package.json` version is correct
- [ ] Repository URL is correct
- [ ] Author and license information is accurate
- [ ] Keywords are relevant and complete

## 🚀 Publishing Steps

### 1. Prepare the Release

```bash
# Ensure you're on the master branch and it's clean
git status
git pull origin master

# Install dependencies
npm install

# Run full test suite
npm run test:run
npm run lint
```

### 2. Build the Distribution

```bash
# Clean and build
npm run build

# Verify build output
ls -la dist/
# Should contain:
# - widget.min.js (IIFE for browsers)
# - widget.esm.js (ES modules)
# - widget.umd.js (UMD build)
# - widget.css (Styles)
# - Source maps (.map files)
```

### 3. Test the Build Locally

```bash
# Test the built files
npm run preview

# Test with example
cd examples/vanilla
# Open index.html in browser and test functionality
```

### 4. Update Version and Changelog

```bash
# Update version (choose one):
npm version patch    # 1.0.0 → 1.0.1 (bug fixes)
npm version minor    # 1.0.0 → 1.1.0 (new features)
npm version major    # 1.0.0 → 2.0.0 (breaking changes)
```

Update `CHANGELOG.md` with the new version details:
```markdown
## [1.0.1] - 2024-01-XX
### Fixed
- Bug fixes and improvements
```

### 5. Login to npm

```bash
# Login to npm (one time setup)
npm login
# Enter your npm username, password, and email
```

### 6. Dry Run

```bash
# Test what will be published without actually publishing
npm publish --dry-run

# Review the output - should include:
# - dist/ directory contents
# - README.md, LICENSE, CHANGELOG.md
# - package.json
```

### 7. Publish to npm

```bash
# Option 1: Direct publish
npm publish

# Option 2: Use helper scripts (recommended)
npm run publish:patch  # Bumps patch version and publishes
npm run publish:minor  # Bumps minor version and publishes
npm run publish:major  # Bumps major version and publishes
```

### 8. Verify Publication

```bash
# Check if package is available
npm view @ticketping/chat-widget

# Test installation in a separate directory
mkdir test-install && cd test-install
npm init -y
npm install @ticketping/chat-widget
```

### 9. Create Git Tag and Push

```bash
# Commit any final changes
git add .
git commit -m "Release v1.0.1"

# Push changes including tags
git push origin main --follow-tags
```

### 10. Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose the tag that was created
4. Add release notes from CHANGELOG.md
5. Attach any additional assets if needed
6. Publish the release

## 📦 Distribution Channels

After publishing, your package will be available through:

### npm Registry
```bash
npm install @ticketping/chat-widget
```

### CDN Services
```html
<!-- unpkg -->
<script src="https://unpkg.com/@ticketping/chat-widget@latest/dist/widget.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ticketping/chat-widget@latest/dist/widget.css">

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@ticketping/chat-widget@latest/dist/widget.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ticketping/chat-widget@latest/dist/widget.css">
```

### Specific Version
```html
<!-- Always pin to specific version in production -->
<script src="https://unpkg.com/@ticketping/chat-widget@1.0.1/dist/widget.min.js"></script>
```

## 🔄 Release Types and Versioning

Following [Semantic Versioning](https://semver.org/):

### Patch Release (1.0.0 → 1.0.1)
- Bug fixes
- Performance improvements
- Documentation updates
- No breaking changes

```bash
npm run publish:patch
```

### Minor Release (1.0.0 → 1.1.0)
- New features
- New functionality
- Backward compatible changes

```bash
npm run publish:minor
```

### Major Release (1.0.0 → 2.0.0)
- Breaking changes
- API changes
- Removed features

```bash
npm run publish:major
```

## 🐛 Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

**Publishing fails with 403:**
```bash
# Check if you're logged in
npm whoami

# Check package name availability
npm view @ticketping/chat-widget
```

**Bundle size too large:**
```bash
# Analyze bundle
npm run analyze

# Check what's included in the package
npm run build && du -sh dist/*
```

### Rollback a Release

If you need to rollback:
```bash
# Unpublish a version (only within 72 hours)
npm unpublish @ticketping/chat-widget@1.0.1

# Or deprecate a version
npm deprecate @ticketping/chat-widget@1.0.1 "This version has critical bugs"
```

## 📊 Post-Publishing



### Monitor Package Usage
- Check npm download stats
- Monitor GitHub issues and discussions
- Watch for community feedback

### Update Documentation
- Update integration guides
- Create blog posts about new features
- Update examples and demos

### Continuous Improvement
- Set up automated testing with different Node versions
- Consider setting up automated publishing with GitHub Actions
- Monitor bundle size and performance metrics

## 🚦 Automated Publishing (Future Enhancement)

Consider setting up GitHub Actions for automated publishing:

```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  push:
    tags:
      - 'v*'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📞 Support

For publishing issues:
- npm support: https://www.npmjs.com/support
- GitHub issues: Create an issue in the repository
- Internal team: Contact the development team 