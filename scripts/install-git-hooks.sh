#!/bin/bash

# Install pre-commit hook to check for sensitive data

HOOK_SOURCE="scripts/pre-commit-hook.sh"
HOOK_DEST=".git/hooks/pre-commit"

if [ ! -f "$HOOK_SOURCE" ]; then
  echo "❌ Hook source not found: $HOOK_SOURCE"
  exit 1
fi

echo "📦 Installing pre-commit hook..."

# Copy the hook
cp "$HOOK_SOURCE" "$HOOK_DEST"
chmod +x "$HOOK_DEST"

echo "✅ Pre-commit hook installed!"
echo ""
echo "The hook will check for:"
echo "  • AWS Account IDs (12-digit numbers)"
echo "  • ARNs with account IDs"
echo "  • Bucket names with account suffixes"
echo "  • Cognito User Pool IDs"
echo "  • Cognito Identity Pool IDs"
echo "  • Job ID timestamps"
echo ""
echo "To bypass the hook (not recommended):"
echo "  git commit --no-verify"
