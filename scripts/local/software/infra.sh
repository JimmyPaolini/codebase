#!/bin/bash
# infra.sh — Install infrastructure / DevOps CLI tools and print version summary.
#
# gitleaks   — scans commits and staged changes for secrets, run by the pre-commit
#              hook and the scan-security workflow
# terraform  — manages Linode Kubernetes Engine (LKE) cluster (infrastructure/)
# trivy      — scans Docker images and infrastructure code for vulnerabilities
# supabase   — local Supabase stack + migrations for lexico
# jq         — JSON CLI utility used in CI scripts and Terraform output parsing
# gh         — GitHub CLI for PR/issue workflows and release automation
# helm       — Kubernetes package manager for caelundas chart deployments
# kubectl    — Kubernetes CLI for direct cluster inspection and management
#
# Depends on: brew.sh (brew_install_or_check must be defined)

brew_install_or_check "gitleaks"
brew_install_or_check "terraform"
brew_install_or_check "trivy"
brew_install_or_check "supabase" "supabase/tap/supabase"
brew_install_or_check "jq"
brew_install_or_check "gh"
brew_install_or_check "helm"
brew_install_or_check "kubectl" "kubernetes-cli"

echo ""
echo "📋 Installed tool versions:"
echo "   Node.js:     $(node --version)"
echo "   pnpm:        $(pnpm --version)"
echo "   Python:      $(python3 --version 2>&1)"
echo "   uv:          $(uv --version)"
echo "   Ollama:      $(ollama --version 2>&1)"
echo "   Gitleaks:    $(gitleaks version 2>&1 || echo 'not installed')"
echo "   Terraform:   $(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null || terraform version | head -n 1)"
echo "   Trivy:       $(trivy --version 2>&1 | head -n 1 | awk '{print $NF}')"
echo "   Supabase:    $(supabase --version 2>&1)"
echo "   Helm:        $(helm version --short 2>&1)"
echo "   kubectl:     $(kubectl version --client --short 2>/dev/null || kubectl version --client 2>&1 | head -n 1)"
echo "   Docker:      $(docker --version 2>&1 || echo 'not installed')"
