#!/usr/bin/env bash
# Keeps only the newest Nx task database, warning when there was more than
# one.
#
# `adopt-task-database.sh` renames the restored database to this machine's id,
# so Nx should have written into that one file. A second database means Nx
# opened a name of its own again (a changed naming scheme or machine-id
# source) and every hit was lost, which deserves a warning rather than a quiet
# return to zero hits. The newest holds this job's results, so it is the one
# kept, and a saved tarball never carries more than one.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/task-database.sh"

databases=()
while IFS= read -r datastore; do
  databases+=("${datastore}")
done < <(list_task_databases)
if ((${#databases[@]} <= 1)); then
  exit 0
fi

newest="$(newest_task_database "${databases[@]}")"
echo "::warning::Nx wrote a database beside the adopted one;" \
  "keeping ${newest##*/} of: ${databases[*]##*/}"
discard_other_task_databases "${newest}" "${databases[@]}"
