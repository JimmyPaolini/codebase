#!/usr/bin/env bash

set -euo pipefail

# Ensures the pull request label vocabulary derived from
# configuration/conventional.config.cjs exists in the repository: every
# type:<name>, every lowercased scope:<name>, and the static do-not-merge,
# source:agent, and source:human labels. Missing labels are created and
# labels whose color or description drifted from the config are updated.
#
# Never deletes a label. Any existing type:/scope:/source: label that is not
# in the expected set is reported as stale, together with the gh label
# delete command that would remove it, so the repository owner can review
# and run it manually.
#
# Always exits 0: a missing or drifted label is a fact about the repository
# under review, not a defect in the pull request itself. A gh failure — a
# read-only token on a fork pull request, a network error — is reported as a
# warning rather than a script failure.

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/../.." && pwd)"

report_lines=()

append_to_report() {
  local report_line="$1"
  report_lines+=("${report_line}")
  echo "${report_line}"
}

write_report_to_step_summary() {
  if [[ -z "${GITHUB_STEP_SUMMARY:-}" ]]; then
    return 0
  fi

  if [[ "${#report_lines[@]}" -eq 0 ]]; then
    return 0
  fi

  printf '%s\n' "${report_lines[@]}" >> "${GITHUB_STEP_SUMMARY}"
}

# 📖 Expected label vocabulary

# configuration/conventional.config.cjs is the single source of truth for
# types and scopes. Read it fresh every run instead of duplicating the
# vocabulary here, so a config change never needs a matching script change.
expected_labels_table="$(cd "${repository_root}" && node -p "
const { types, scopes } = require('./configuration/conventional.config.cjs');
[
  ...types.map((type) => ['type:' + type.name, 'd93f0b', type.description].join('\t')),
  ...scopes.map((scope) => ['scope:' + scope.name.toLowerCase(), '1d76db', scope.description].join('\t')),
  'do-not-merge\tb60205\tDo not merge this pull request yet',
  'source:agent\te99695\tOpened by a coding agent',
  'source:human\te99695\tOpened by a human',
].join('\n')
")"

# 🔎 Current repository labels

if ! current_labels_json="$(gh label list --limit 500 --json name,color,description 2>&1)"; then
  append_to_report "⚠️ Unable to reconcile labels: gh label list failed (${current_labels_json})"
  write_report_to_step_summary
  exit 0
fi

# 🔁 Reconcile expected labels

expected_label_names=()

while IFS=$'\t' read -r label_name label_color label_description; do
  if [[ -z "${label_name}" ]]; then
    continue
  fi
  expected_label_names+=("${label_name}")

  current_label_fields="$(printf '%s' "${current_labels_json}" | jq -r --arg name "${label_name}" '.[] | select(.name == $name) | [.color, .description] | @tsv')"

  if [[ -z "${current_label_fields}" ]]; then
    if ! create_output="$(gh label create "${label_name}" --color "${label_color}" --description "${label_description}" 2>&1)"; then
      append_to_report "⚠️ Unable to reconcile labels: gh label create failed for ${label_name} (${create_output})"
      continue
    fi
    append_to_report "✅ Created label: ${label_name}"
    continue
  fi

  IFS=$'\t' read -r current_label_color current_label_description <<< "${current_label_fields}"

  if [[ "${current_label_color}" == "${label_color}" && "${current_label_description}" == "${label_description}" ]]; then
    continue
  fi

  if ! edit_output="$(gh label edit "${label_name}" --color "${label_color}" --description "${label_description}" 2>&1)"; then
    append_to_report "⚠️ Unable to reconcile labels: gh label edit failed for ${label_name} (${edit_output})"
    continue
  fi
  append_to_report "✅ Updated label: ${label_name}"
done <<< "${expected_labels_table}"

# 🕸️ Stale label report

while IFS= read -r existing_label_name; do
  if [[ -z "${existing_label_name}" ]]; then
    continue
  fi

  case "${existing_label_name}" in
  type:* | scope:* | source:*) ;;
  *) continue ;;
  esac

  is_expected_label='false'
  for expected_label_name in "${expected_label_names[@]}"; do
    if [[ "${existing_label_name}" == "${expected_label_name}" ]]; then
      is_expected_label='true'
      break
    fi
  done

  if [[ "${is_expected_label}" == 'false' ]]; then
    append_to_report "⚠️ Stale label (not in conventional.config.cjs): ${existing_label_name} — remove with: gh label delete \"${existing_label_name}\""
  fi
done < <(printf '%s' "${current_labels_json}" | jq -r '.[].name')

# 📋 Summary

write_report_to_step_summary

exit 0
