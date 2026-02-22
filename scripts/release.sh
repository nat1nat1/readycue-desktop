#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Load Apple credentials for notarization
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
DMG="release/ReadyCue-${VERSION}-universal.dmg"
BLOCKMAP="release/ReadyCue-${VERSION}-universal.dmg.blockmap"
MANIFEST="release/latest-mac.yml"

echo "==> ReadyCue Desktop $TAG"
echo ""

# Pre-flight checks
if ! command -v gh &>/dev/null; then
  echo "✗ gh CLI not found. Install: https://cli.github.com"
  exit 1
fi

if gh release view "$TAG" --repo nat1nat1/readycue-desktop &>/dev/null; then
  echo "✗ Release $TAG already exists on GitHub."
  echo "  Bump the version in package.json first."
  exit 1
fi

if [[ -z "${APPLE_ID:-}" || -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
  echo "⚠ APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set — notarization will be skipped"
  echo "  Create a .env file with APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID"
  echo ""
fi

# 1. Compile TypeScript
echo "==> Compiling TypeScript..."
npm run build

# 2. Build DMG (no auto-publish)
echo "==> Building DMG..."
npm run dist:mac -- --publish never

# 3. Verify artifacts
for f in "$DMG" "$BLOCKMAP" "$MANIFEST"; do
  if [[ ! -f "$f" ]]; then
    echo "✗ Missing artifact: $f"
    exit 1
  fi
done

echo ""
echo "✓ Built $DMG ($(du -h "$DMG" | cut -f1 | xargs))"
echo ""

# 4. Confirm before publishing
read -rp "Publish $TAG to GitHub? [y/N] " confirm
if [[ "$confirm" != [yY] ]]; then
  echo "Aborted."
  exit 0
fi

# 5. Commit, tag, push
if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "$TAG release"
fi
git tag "$TAG"
git push origin main --tags

# 6. Create GitHub release and upload artifacts
gh release create "$TAG" \
  --repo nat1nat1/readycue-desktop \
  --title "ReadyCue Desktop $TAG" \
  --generate-notes \
  "$DMG" "$BLOCKMAP" "$MANIFEST"

echo ""
echo "✓ Published: https://github.com/nat1nat1/readycue-desktop/releases/tag/$TAG"
