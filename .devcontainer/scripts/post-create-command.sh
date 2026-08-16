#!/usr/bin/env bash

set -euo pipefail

echo "� Installing PostgreSQL 18 Client tools..."
. /etc/os-release
echo "deb http://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg || true
apt-get update
apt-get install -y postgresql-client-18
echo "✅ PostgreSQL 18 Client tools installed: $(pg_dump --version)"

echo "�🔑 Installing Gitleaks v${GITLEAKS_VERSION}..."
curl -sSfL \
  "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
  | tar -xzC /usr/local/bin gitleaks
echo "✅ Gitleaks installed: $(gitleaks version)"

# Trivy backs `nx run codebase:trivy-config`, which the security gate runs in
# CI and which should behave identically here.
echo "🏗 Installing Trivy v${TRIVY_VERSION}..."
curl -sSfL \
  "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz" \
  | tar -xzC /usr/local/bin trivy
echo "✅ Trivy installed: $(trivy --version)"

echo "🔎 Checking for .env file..."
if [ ! -f ".env" ]; then
  if [ -f ".env.default" ]; then
    cp .env.default .env
    echo "✅ .env file created from .env.default"
  else
    echo "⚠️  .env.default not found. Skipping .env creation."
  fi
else
  echo "👍 .env file already exists"
fi


echo "�📦 Installing dependencies with pnpm..."
pnpm install --frozen-lockfile
echo "✅ Dependencies installed"

echo "🦭 Resetting Nx cache..."
pnpm exec nx reset
echo "✅ Nx cache reset"

echo "🕸️ Generating Nx project graph..."
pnpm exec nx graph --file=.nx/graph.json 2>/dev/null
echo "✅ Nx project graph generated"

echo "⚙️ Syncing VSCode settings..."
pnpm exec tsx .devcontainer/scripts/sync-vscode-settings.ts write
echo "✅ VSCode settings synced"
