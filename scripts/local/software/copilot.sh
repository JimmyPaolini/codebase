#!/bin/bash
# copilot.sh — Configure GitHub Copilot CLI plugins for local development.
#
# This module is intentionally non-blocking: if Copilot CLI is not installed,
# unauthenticated, or temporarily unavailable, setup continues with a warning.

superpowers_marketplace="obra/superpowers-marketplace"
superpowers_plugin="superpowers@superpowers-marketplace"

if ! command -v copilot &> /dev/null; then
  echo "⚠️  Copilot CLI not found. Skipping Superpowers plugin setup."
  echo "   Install Copilot CLI and rerun setup to enable Superpowers automatically."
  if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    return 0
  else
    exit 0
  fi
fi

echo "🔍 Configuring Copilot plugin marketplace..."
marketplace_output="$(copilot plugin marketplace add "$superpowers_marketplace" 2>&1)"
marketplace_exit_code=$?

if [ $marketplace_exit_code -eq 0 ]; then
  echo "✅ Added Copilot marketplace: $superpowers_marketplace"
elif echo "$marketplace_output" | grep -qi "already"; then
  echo "👍 Copilot marketplace already configured: $superpowers_marketplace"
else
  echo "⚠️  Could not add Copilot marketplace: $superpowers_marketplace"
  echo "   Copilot output: $marketplace_output"
fi

echo "🔍 Ensuring Superpowers plugin is installed..."
plugin_output="$(copilot plugin install "$superpowers_plugin" 2>&1)"
plugin_exit_code=$?

if [ $plugin_exit_code -eq 0 ]; then
  echo "✅ Installed Copilot plugin: $superpowers_plugin"
elif echo "$plugin_output" | grep -qi "already"; then
  echo "👍 Copilot plugin already installed: $superpowers_plugin"
else
  echo "⚠️  Could not install Copilot plugin: $superpowers_plugin"
  echo "   Copilot output: $plugin_output"
fi
