#!/bin/bash
# software.sh — Install and configure all developer tools required to work in this codebase.
#
# This is the orchestrator. Each concern is split into a focused module under
# scripts/local/software/. All modules are sourced (not executed) so that
# environment changes (nvm, PATH exports) carry through to subsequent modules
# and into the parent shell when setup.sh sources this file.
#
# Execution order matters:
#   1. brew.sh         — Homebrew presence check + brew_install_or_check helper
#   2. node.sh         — nvm, Node.js (.nvmrc), pnpm, nx, Husky init
#   3. shell-config.sh — Persist nvm/pnpm/GPG/NODE_OPTIONS to RC files
#   4. python.sh       — uv, Python 3.14+
#   5. ollama.sh       — Ollama daemon + default model pull
#   6. docker.sh       — Docker Desktop install + daemon start
#   7. gpg.sh          — GPG + pinentry-mac + git signing config
#   8. infra.sh        — terraform, supabase, jq, gh, helm, kubectl + version summary
#   9. database.sh     — squawk

source ./scripts/local/software/brew.sh
source ./scripts/local/software/node.sh
source ./scripts/local/software/shell-config.sh
source ./scripts/local/software/python.sh
source ./scripts/local/software/ollama.sh
source ./scripts/local/software/docker.sh
source ./scripts/local/software/gpg.sh
source ./scripts/local/software/infra.sh
source ./scripts/local/software/database.sh
