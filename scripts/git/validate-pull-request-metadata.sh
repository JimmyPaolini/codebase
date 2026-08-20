#!/usr/bin/env bash

set -euo pipefail

# Validates that a pull request's labels and assignees agree with its title:
# exactly one type: label matching the title type, exactly the scope: labels
# named by the title scopes, no do-not-merge label, at least one assignee,
# and exactly one source: label declaring who opened it.
#
# Two input modes. With a pull request number it reads the metadata live
# through gh pr view, which is the local development mode. With no argument
# it reads PULL_REQUEST_TITLE, PULL_REQUEST_LABELS, and
# PULL_REQUEST_ASSIGNEES from the environment, which is the workflow mode: a
# pure function of its inputs, needing no network, no token, and no write
# permission.
#
# Reports every failure rather than only the first, followed by the gh pr
# edit commands that fix them, and mirrors the whole report to
# GITHUB_STEP_SUMMARY when it is set.
#
# Exits 0 when every check passes and 1 when any check fails or the input is
# unusable. Every external command is guarded, so a missing binary, a bad
# pull request number, or malformed JSON is reported with a clear message
# rather than aborting silently.

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

fail_with_message() {
  append_to_report "$1"
  write_report_to_step_summary
  exit 1
}

fail_with_usage_error() {
  append_to_report "$1"
  append_to_report ""
  append_to_report "Usage: scripts/git/validate-pull-request-metadata.sh <pull-request-number>"
  append_to_report "   or: PULL_REQUEST_TITLE=… PULL_REQUEST_LABELS=… PULL_REQUEST_ASSIGNEES=… scripts/git/validate-pull-request-metadata.sh"
  write_report_to_step_summary
  exit 1
}

# Label names, scope names, and logins are all single words, so a
# space-delimited string is a faithful set representation here. It keeps
# every membership test free of external commands and free of empty-array
# expansion, which bash rejects under `set -u` before 4.4 — including the
# bash 3.2 that macOS ships.
contains_name() {
  local name_list=" $1 "
  local wanted_name="$2"
  [[ "${name_list}" == *" ${wanted_name} "* ]]
}

count_names() {
  local counted_names=0
  local name
  for name in $1; do
    counted_names=$((counted_names + 1))
  done
  echo "${counted_names}"
}

# 📥 Input resolution

if [[ "$#" -gt 1 ]]; then
  fail_with_usage_error "❌ Expected at most one argument, the pull request number"
fi

pull_request_json=''
pull_request_number="${PULL_REQUEST_NUMBER:-}"

if [[ "$#" -eq 1 ]]; then
  if [[ ! "$1" =~ ^[0-9]+$ ]]; then
    fail_with_usage_error "❌ Not a pull request number: $1"
  fi

  pull_request_number="$1"

  if ! command -v gh > /dev/null 2>&1; then
    fail_with_usage_error "❌ Unable to read pull request ${pull_request_number}: gh is not available"
  fi

  # gh writes its own notices — a new-release announcement, for one — to
  # standard error even when the call succeeds, so its standard error is kept
  # in a separate file rather than merged into the captured document. Merging
  # them would leave a valid pull request with metadata that no longer parses
  # as JSON, which in a blocking gate is a false failure.
  if ! gh_error_file="$(mktemp 2>&1)"; then
    fail_with_usage_error "❌ Unable to read pull request ${pull_request_number}: mktemp failed (${gh_error_file})"
  fi

  trap 'rm -f "${gh_error_file}" > /dev/null 2>&1 || true' EXIT

  if ! pull_request_json="$(gh pr view "${pull_request_number}" --json assignees,labels,title 2> "${gh_error_file}")"; then
    if ! gh_error_output="$(< "${gh_error_file}")"; then
      gh_error_output='the error output could not be read'
    fi
    fail_with_usage_error "❌ Unable to read pull request ${pull_request_number}: gh pr view failed (${gh_error_output})"
  fi
elif [[ -z "${PULL_REQUEST_TITLE:-}" || -z "${PULL_REQUEST_LABELS:-}" || -z "${PULL_REQUEST_ASSIGNEES:-}" ]]; then
  fail_with_usage_error "❌ Expected a pull request number, or PULL_REQUEST_TITLE, PULL_REQUEST_LABELS, and PULL_REQUEST_ASSIGNEES in the environment"
fi

# The remediation commands need a number to name. The workflow supplies
# PULL_REQUEST_NUMBER; without it the commands stay printable by naming a
# placeholder rather than an empty string.
if [[ -z "${pull_request_number}" ]]; then
  pull_request_number='<number>'
fi

# 🧩 Metadata parsing

if ! command -v node > /dev/null 2>&1; then
  fail_with_message "❌ Unable to validate pull request metadata: node is not available"
fi

# All parsing happens in this one guarded call: the title shape, the two JSON
# documents, and the scope segment that commitlint allows to name several
# scopes. Doing it here rather than in the shell keeps the JSON out of reach
# of word splitting, and keeps every value unescaped — nothing round-trips
# through an intermediate text encoding such as jq's @tsv, which escapes
# tabs and newlines and would make an identical value compare unequal. Node
# is already the workflow's runtime, so this adds no dependency.
if ! parsed_metadata="$(
  VALIDATE_ASSIGNEES="${PULL_REQUEST_ASSIGNEES:-[]}" \
    VALIDATE_LABELS="${PULL_REQUEST_LABELS:-[]}" \
    VALIDATE_PULL_REQUEST_JSON="${pull_request_json}" \
    VALIDATE_TITLE="${PULL_REQUEST_TITLE:-}" \
    node -e "
const fieldSeparator = '\u001f';

const failWithMessage = (message) => {
  process.stderr.write(message + '\n');
  process.exit(1);
};

const parseJsonArray = (documentText, description) => {
  let parsedDocument;
  try {
    parsedDocument = JSON.parse(documentText);
  } catch (error) {
    failWithMessage('❌ Unable to parse ' + description + ' as JSON: ' + error.message);
  }
  if (!Array.isArray(parsedDocument)) {
    failWithMessage('❌ Expected ' + description + ' to be a JSON array');
  }
  return parsedDocument;
};

const pullRequestJson = process.env.VALIDATE_PULL_REQUEST_JSON || '';

let title = process.env.VALIDATE_TITLE || '';
let labels = [];
let assignees = [];

if (pullRequestJson.length > 0) {
  let pullRequest;
  try {
    pullRequest = JSON.parse(pullRequestJson);
  } catch (error) {
    failWithMessage('❌ Unable to parse the gh pr view output: ' + error.message);
  }
  title = typeof pullRequest.title === 'string' ? pullRequest.title : '';
  labels = Array.isArray(pullRequest.labels) ? pullRequest.labels : [];
  assignees = Array.isArray(pullRequest.assignees) ? pullRequest.assignees : [];
} else {
  labels = parseJsonArray(process.env.VALIDATE_LABELS || '[]', 'PULL_REQUEST_LABELS');
  assignees = parseJsonArray(process.env.VALIDATE_ASSIGNEES || '[]', 'PULL_REQUEST_ASSIGNEES');
}

const nameOf = (entry, propertyName) => {
  if (typeof entry === 'string') {
    return entry.trim();
  }
  if (entry !== null && typeof entry === 'object' && typeof entry[propertyName] === 'string') {
    return entry[propertyName].trim();
  }
  return '';
};

// The scope group is optional here even though the convention requires a
// scope, because commitlint has no scope-empty rule: 'chore: 🔧 tidy' passes
// the title step and reaches this script. Matching it means the missing scope
// is reported as the missing scope it is, rather than as a malformed title.
// commitlint's scope-enum splits on both ',' and '/', so one title may also
// name several scopes, and each of them is expected to have its own label.
const titleMatch = /^([a-z][a-z-]*)(?:\(([^()]+)\))?!?:\s+(\S.*)\$/.exec(title.trim());

if (titleMatch === null) {
  failWithMessage('❌ Unable to parse type and scope from title: ' + title);
}

const titleScopes = [
  ...new Set(
    (titleMatch[2] || '')
      .split(/[,/]/)
      .map((titleScope) => titleScope.trim().toLowerCase())
      .filter((titleScope) => titleScope.length > 0),
  ),
];

const recordLines = [
  ['TITLE_TYPE', titleMatch[1]].join(fieldSeparator),
  ...(titleScopes.length === 0 ? [['TITLE_SCOPE_MISSING', ''].join(fieldSeparator)] : []),
  ...titleScopes.map((titleScope) => ['TITLE_SCOPE', titleScope].join(fieldSeparator)),
  ...labels
    .map((label) => nameOf(label, 'name'))
    .filter((labelName) => labelName.length > 0)
    .map((labelName) => ['LABEL', labelName].join(fieldSeparator)),
  ...assignees
    .map((assignee) => nameOf(assignee, 'login'))
    .filter((assigneeLogin) => assigneeLogin.length > 0)
    .map((assigneeLogin) => ['ASSIGNEE', assigneeLogin].join(fieldSeparator)),
];

process.stdout.write(recordLines.join('\n'));
" 2>&1
)"; then
  fail_with_message "${parsed_metadata}"
fi

# 🗂️ Metadata grouping

title_type=''
title_scopes=''
type_labels=''
scope_labels=''
source_labels=''
assignee_logins=''
do_not_merge_present='false'
title_scope_missing='false'

while IFS=$'\x1f' read -r record_kind record_value; do
  case "${record_kind}" in
  ASSIGNEE)
    assignee_logins="${assignee_logins} ${record_value}"
    ;;
  LABEL)
    case "${record_value}" in
    do-not-merge)
      do_not_merge_present='true'
      ;;
    scope:*)
      scope_labels="${scope_labels} ${record_value}"
      ;;
    source:*)
      source_labels="${source_labels} ${record_value}"
      ;;
    type:*)
      type_labels="${type_labels} ${record_value}"
      ;;
    esac
    ;;
  TITLE_SCOPE)
    title_scopes="${title_scopes} ${record_value}"
    ;;
  TITLE_SCOPE_MISSING)
    title_scope_missing='true'
    ;;
  TITLE_TYPE)
    title_type="${record_value}"
    ;;
  esac
done <<< "${parsed_metadata}"

failure_lines=()
remediation_lines=()

record_failure() {
  failure_lines+=("$1")
}

record_remediation() {
  remediation_lines+=("$1")
}

# 1️⃣ Exactly one type label, and it matches the title type

expected_type_label="type:${title_type}"
type_label_count="$(count_names "${type_labels}")"

if [[ "${type_label_count}" -ne 1 ]] || ! contains_name "${type_labels}" "${expected_type_label}"; then
  found_type_labels="${type_labels# }"
  if [[ -z "${found_type_labels}" ]]; then
    found_type_labels='none'
  fi
  record_failure "❌ Expected exactly one type label: ${expected_type_label} (found: ${found_type_labels})"

  for type_label in ${type_labels}; do
    if [[ "${type_label}" != "${expected_type_label}" ]]; then
      record_remediation "gh pr edit ${pull_request_number} --remove-label ${type_label}"
    fi
  done

  if ! contains_name "${type_labels}" "${expected_type_label}"; then
    record_remediation "gh pr edit ${pull_request_number} --add-label ${expected_type_label}"
  fi
fi

# 2️⃣ The scope labels are exactly the title scopes, in both directions

# A title with no scope names no expected labels, which would make both loops
# below vacuous: the forward one would find nothing missing and pass in
# silence, and the reverse one would denounce every scope label the pull
# request legitimately carries. So the missing scope is recorded as its own
# failure and the comparison is skipped entirely — there is nothing to
# compare against until the title is fixed.
if [[ "${title_scope_missing}" == 'true' ]]; then
  record_failure "❌ No scope in title: retitle as ${title_type}(<scope>): …"
else
  for title_scope in ${title_scopes}; do
    if ! contains_name "${scope_labels}" "scope:${title_scope}"; then
      record_failure "❌ Missing scope label: scope:${title_scope}"
      record_remediation "gh pr edit ${pull_request_number} --add-label scope:${title_scope}"
    fi
  done

  for scope_label in ${scope_labels}; do
    if ! contains_name "${title_scopes}" "${scope_label#scope:}"; then
      record_failure "❌ Unexpected scope label: ${scope_label}"
      record_remediation "gh pr edit ${pull_request_number} --remove-label ${scope_label}"
    fi
  done
fi

# 3️⃣ The do-not-merge label is absent

if [[ "${do_not_merge_present}" == 'true' ]]; then
  record_failure "❌ Blocked by the do-not-merge label"
  record_remediation "gh pr edit ${pull_request_number} --remove-label do-not-merge"
fi

# 4️⃣ At least one assignee

if [[ "$(count_names "${assignee_logins}")" -eq 0 ]]; then
  record_failure "❌ No assignee"
  record_remediation "gh pr edit ${pull_request_number} --add-assignee @me"
fi

# 5️⃣ Exactly one source label, either source:agent or source:human

# Unlike the type and scope labels there is nothing in the title to compare
# this against: the source declares who opened the pull request, so every
# other source: label is simply unexpected.
source_label_count="$(count_names "${source_labels}")"
source_label_is_valid='false'

if [[ "${source_label_count}" -eq 1 ]]; then
  if contains_name "${source_labels}" 'source:agent' || contains_name "${source_labels}" 'source:human'; then
    source_label_is_valid='true'
  fi
fi

if [[ "${source_label_is_valid}" == 'false' ]]; then
  found_source_labels="${source_labels# }"
  if [[ -z "${found_source_labels}" ]]; then
    found_source_labels='none'
  fi
  record_failure "❌ Expected exactly one source label: source:agent or source:human (found: ${found_source_labels})"

  for source_label in ${source_labels}; do
    record_remediation "gh pr edit ${pull_request_number} --remove-label ${source_label}"
  done

  record_remediation "add exactly one source label, either:"
  record_remediation "gh pr edit ${pull_request_number} --add-label source:agent"
  record_remediation "gh pr edit ${pull_request_number} --add-label source:human"
fi

# 📋 Report

if [[ "${#failure_lines[@]}" -eq 0 ]]; then
  append_to_report "✅ Pull request metadata is valid"
  write_report_to_step_summary
  exit 0
fi

append_to_report "❌ Pull request metadata is invalid"
append_to_report ""

for failure_line in "${failure_lines[@]}"; do
  append_to_report "- ${failure_line}"
done

if [[ "${#remediation_lines[@]}" -gt 0 ]]; then
  append_to_report ""
  append_to_report "🔧 Fix with:"
  append_to_report ""

  for remediation_line in "${remediation_lines[@]}"; do
    append_to_report "- ${remediation_line}"
  done
fi

write_report_to_step_summary

exit 1
