#!/bin/bash

echo "🫜 Validating codebase root directory..."
if [ "$(basename "$(pwd)")" != "codebase" ] || [ ! -f "package.json" ] || ! grep -q '"name": "codebase"' package.json 2>/dev/null; then
  echo "❌ Error: This script must be run from the codebase root directory"
  echo "📁 Current directory: $(pwd)"
  exit 1
fi

echo "🚪 Setting script to exit immediately on error..."
set -e

echo "🎛️  Exporting environment variables from .env file..."
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
else
  echo "⚠️  .env file not found (will be created by environment.sh)"
fi

echo "👟 Making all codebase scripts executable..."
find . -type f -name '*.sh' -print0 | xargs -0 chmod +x || true

get_git_commit_hash() {
  local commit
  commit=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "unknown")
  echo "🔖 Git Commit Hash (first 7 characters): $commit" >&2
  echo "$commit"
}

get_utc_timestamp() {
  local timestamp
  timestamp=$(date -u +"%Y%m%d-%H%M%S")
  echo "🕐 UTC Timestamp: $timestamp" >&2
  echo "$timestamp"
}
