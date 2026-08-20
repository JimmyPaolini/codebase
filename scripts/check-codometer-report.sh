#!/bin/sh

# 📊 Fail when a codometer run left no report behind
#
# The pull request's `## 🎒 Bundles` section is rendered from these reports, and
# the renderer tolerates a missing one on purpose: a project the run never
# rebuilt contributes no rows. That tolerance is also the failure mode — a
# target wired to the wrong path, or missing `--json` or `--write`, sends its
# report to the console, contributes no rows either, and the section comes out
# looking exactly like a pull request that changed nothing.
#
# So the run that was supposed to write the report fails here instead, naming
# the file nobody wrote. Invoked after the measurement rather than instead of
# it, so a breached limit still fails on its own terms.

set -e

REPORT_PATH="$1"

if [ -z "$REPORT_PATH" ]; then
  printf '📊 check-codometer-report.sh needs the path of the report to verify.\n' >&2
  exit 1
fi

if [ ! -f "$REPORT_PATH" ]; then
  printf '📊 Measured nothing into %s\n' "$REPORT_PATH" >&2
  printf '   The codometer run reported success and wrote no report, so the\n' >&2
  printf '   🎒 Bundles section would render without this project rather than\n' >&2
  printf '   saying anything was wrong. Check that the target passes both\n' >&2
  printf '   --json and --write, and that --directory names this project.\n' >&2
  exit 1
fi
