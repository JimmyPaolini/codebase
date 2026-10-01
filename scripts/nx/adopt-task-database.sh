#!/usr/bin/env bash
# Renames the newest restored Nx task database to this machine's id, and
# discards the rest.
#
# Nx opens `<machine-id>-v<schema>.db`, with the id read from
# `/var/lib/dbus/machine-id` or `/etc/machine-id` on Linux. Every hosted
# runner is a fresh VM with a fresh id, so without this Nx opened an empty
# database of its own beside the restored one and never found a row: no CI log
# had a single `[local cache]` hit, however much the tarball carried.
#
# The others are earlier runners' leftovers, dropped so the tarball stops
# growing by one database per job. The schema suffix is kept as restored: a
# newer Nx ignores an older schema rather than misreading it.
#
# `MACHINE_ID_FILES` overrides where the id is read from, space separated and
# in priority order, so the script can be exercised against a fake id.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/task-database.sh"

databases=()
while IFS= read -r datastore; do
  databases+=("${datastore}")
done < <(list_task_databases)
if ((${#databases[@]} == 0)); then
  echo "🪪 No Nx cache database was restored"
  exit 0
fi

read -ra machine_id_files <<<"${MACHINE_ID_FILES:-/var/lib/dbus/machine-id /etc/machine-id}"
machine=""
for machine_id_file in "${machine_id_files[@]}"; do
  if [[ -r "${machine_id_file}" ]]; then
    machine="$(tr -d '[:space:]' <"${machine_id_file}")"
    if [[ -n "${machine}" ]]; then
      break
    fi
  fi
done
if [[ -z "${machine}" ]]; then
  echo "::warning::No machine id to adopt the Nx cache database under"
  exit 0
fi

newest="$(newest_task_database "${databases[@]}")"
if [[ "${newest##*/}" != *-v*.db ]]; then
  echo "::warning::Not adopting ${newest##*/}: no -v<schema> suffix to keep"
  exit 0
fi
adopted="$(task_database_directory)/${machine}-v${newest##*-v}"
discard_other_task_databases "${newest}" "${databases[@]}"
if [[ "${newest}" != "${adopted}" ]]; then
  for suffix in "" -wal -shm -journal; do
    if [[ -e "${newest}${suffix}" ]]; then
      mv "${newest}${suffix}" "${adopted}${suffix}"
    fi
  done
fi

rows="$(sqlite3 "${adopted}" 'SELECT count(*) FROM cache_outputs;' \
  2>/dev/null || echo "an unknown number of")"
echo "🪪 Adopted ${newest##*/} as ${adopted##*/} (${rows} cached results)"
