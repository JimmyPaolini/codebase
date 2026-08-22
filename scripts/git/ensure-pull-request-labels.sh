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
# under review, not a defect in the pull request itself. A gh or node
# failure — a read-only token on a fork pull request, a network error, a
# missing node binary, a sparse checkout without the config file — is
# reported as a warning rather than a script failure.

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

# 🔎 Current repository labels

if ! current_labels_json="$(gh label list --limit 500 --json name,color,description 2>&1)"; then
  append_to_report "- ⚠️ Unable to reconcile labels: gh label list failed (${current_labels_json})"
  write_report_to_step_summary
  exit 0
fi

# 🧮 Reconciliation plan

# configuration/conventional.config.cjs is the single source of truth for
# types and scopes. Read it fresh every run instead of duplicating the
# vocabulary here, so a config change never needs a matching script change.
# The comparison against the repository's current labels also happens here,
# in node, rather than round-tripping values through jq: color and
# description equality stays a plain JavaScript string comparison, with no
# intermediate text encoding (such as jq's @tsv, which escapes tabs and
# newlines) that could make an identical value compare unequal. Node is
# already a hard dependency for reading the config, so this removes jq as a
# dependency rather than adding one.
if ! reconciliation_plan="$(
  cd "${repository_root}" \
    && printf '%s' "${current_labels_json}" | node -e "
const fieldSeparator = '\u001f';

const { types, scopes } = require('./configuration/conventional.config.cjs');

const expectedLabels = [
  ...types.map((type) => ({
    color: 'd93f0b',
    description: type.description,
    name: 'type:' + type.name,
  })),
  ...scopes.map((scope) => ({
    color: '1d76db',
    description: scope.description,
    name: 'scope:' + scope.name.toLowerCase(),
  })),
  {
    color: 'b60205',
    description: 'Do not merge this pull request yet',
    name: 'do-not-merge',
  },
  {
    color: 'e99695',
    description: 'Opened by a coding agent',
    name: 'source:agent',
  },
  {
    color: 'e99695',
    description: 'Opened by a human',
    name: 'source:human',
  },
];

const trackedPrefixes = ['type:', 'scope:', 'source:'];

const stdinChunks = [];
process.stdin.on('data', (chunk) => stdinChunks.push(chunk));
process.stdin.on('end', () => {
  const currentLabels = JSON.parse(Buffer.concat(stdinChunks).toString('utf8'));
  const currentLabelsByName = new Map(
    currentLabels.map((label) => [label.name, label]),
  );
  const expectedNames = new Set(expectedLabels.map((label) => label.name));

  const planLines = [];

  for (const expectedLabel of expectedLabels) {
    const currentLabel = currentLabelsByName.get(expectedLabel.name);
    if (!currentLabel) {
      planLines.push(
        ['CREATE', expectedLabel.name, expectedLabel.color, expectedLabel.description].join(fieldSeparator),
      );
      continue;
    }
    if (
      currentLabel.color !== expectedLabel.color
      || currentLabel.description !== expectedLabel.description
    ) {
      planLines.push(
        ['UPDATE', expectedLabel.name, expectedLabel.color, expectedLabel.description].join(fieldSeparator),
      );
    }
  }

  for (const currentLabel of currentLabels) {
    const hasTrackedPrefix = trackedPrefixes.some((prefix) => currentLabel.name.startsWith(prefix));
    if (hasTrackedPrefix && !expectedNames.has(currentLabel.name)) {
      planLines.push(['STALE', currentLabel.name].join(fieldSeparator));
    }
  }

  process.stdout.write(planLines.join('\n'));
});
" 2>&1
)"; then
  append_to_report "- ⚠️ Unable to reconcile labels: label comparison failed (${reconciliation_plan})"
  write_report_to_step_summary
  exit 0
fi

# 🔁 Create and update labels

# Processed as its own pass (rather than interleaved with the stale report
# below) so "nothing needed creating or updating" can be reported on its own
# — the two permanent stale labels in this repository mean the overall
# report is otherwise never fully empty, even on a perfectly reconciled run.
reconciliation_action_taken='false'

while IFS=$'\x1f' read -r plan_action label_name label_color label_description; do
  case "${plan_action}" in
  CREATE)
    reconciliation_action_taken='true'
    if ! create_output="$(gh label create "${label_name}" --color "${label_color}" --description "${label_description}" 2>&1)"; then
      append_to_report "- ⚠️ Unable to reconcile labels: gh label create failed for ${label_name} (${create_output})"
      continue
    fi
    append_to_report "- ✅ Created label: ${label_name}"
    ;;
  UPDATE)
    reconciliation_action_taken='true'
    if ! edit_output="$(gh label edit "${label_name}" --color "${label_color}" --description "${label_description}" 2>&1)"; then
      append_to_report "- ⚠️ Unable to reconcile labels: gh label edit failed for ${label_name} (${edit_output})"
      continue
    fi
    append_to_report "- ✅ Updated label: ${label_name}"
    ;;
  esac
done <<< "${reconciliation_plan}"

if [[ "${reconciliation_action_taken}" == 'false' ]]; then
  append_to_report "- ✅ All conventional labels are present and match the configuration"
fi

# 🕸️ Stale label report

while IFS=$'\x1f' read -r plan_action label_name; do
  if [[ "${plan_action}" == 'STALE' ]]; then
    append_to_report "- ⚠️ Stale label (not in conventional.config.cjs): ${label_name} — remove with: gh label delete \"${label_name}\""
  fi
done <<< "${reconciliation_plan}"

# 📋 Summary

write_report_to_step_summary

exit 0
