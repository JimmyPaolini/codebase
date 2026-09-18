#!/bin/bash
if [[ "$BRANCH" == agents/* ]]; then
  NEW_BRANCH="chore/JimmyPaolini-${BRANCH#agents/}"
  git branch -m "$NEW_BRANCH"
  CONTEXT="🚨 Branch auto-renamed from $BRANCH to $NEW_BRANCH to comply with repository conventions."
  printf '%s' "$CONTEXT" | bash "$SCRIPT_DIRECTORY/emit-session-hook-context.sh"
  exit 0
fi
