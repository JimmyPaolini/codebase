#!/usr/bin/env bash
# Discards every Nx task database that fails `PRAGMA integrity_check`.
#
# A cancellation can hit mid-write, leaving a file whose own header claims it
# is fine but whose pages are not; a plain file-exists check does not catch
# that. Nx fails outright querying such a file, and saving one is worse than
# saving none: every later job's `restore-keys` fallback inherits it. The whole
# database is discarded rather than repaired in place.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/task-database.sh"

while IFS= read -r datastore; do
  result="$(sqlite3 "${datastore}" 'PRAGMA integrity_check;' 2>&1 || true)"
  if [[ "${result}" != "ok" ]]; then
    echo "::warning::Discarding corrupt cache (${datastore}): ${result}"
    discard_task_database "${datastore}"
  fi
done < <(list_task_databases)
