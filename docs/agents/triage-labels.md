# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles onto the labels this repository's issue tracker actually carries.

**The tracker is the source of truth for what exists.** Nothing creates a
`status:*` label automatically — on an issue the `issue-labels` synchronizer
reconciles only the `type:` and `scope:` prefixes, and on a pull request
`pull-request-labels` creates and reconciles `type:`, `scope:`, and `source:`.
So the family below is whatever has been created by hand, and the tables here
are a reading of the tracker rather than a plan for it.

## The `status:` family

Five labels, all sharing the `fbca04` color so the family reads as one:

| Label                    | Meaning                                        |
| ------------------------ | ---------------------------------------------- |
| `status:needs-triage`    | Maintainer needs to evaluate this issue        |
| `status:needs-info`      | Waiting on reporter for more information       |
| `status:ready-for-agent` | Fully specified, ready for an unattended agent |
| `status:ready-for-human` | Requires human implementation                  |
| `status:in-progress`     | Issue is actively being implemented            |

`wontfix` sits outside the family, keeping the canonical name the skills and
GitHub's own default vocabulary both use, and GitHub's default `ffffff` with it.

Those six are the whole triage vocabulary. There is no `status:todo` and no
`status:done`: an open issue carrying no `status:` label is the backlog, and a
closed issue is the done signal.

Re-read the live set rather than trusting the table:

```bash
gh label list --limit 200 --json name,description \
  --jq '.[] | select(.name | test("^status:|^wontfix$")) | "\(.name)\t\(.description)"'
```

## Mapping the skills' triage roles

Every one of the five roles has a label, so a skill's instruction to apply one
always maps to a label that exists:

| Role in mattpocock/skills | Label in our tracker     |
| ------------------------- | ------------------------ |
| `needs-triage`            | `status:needs-triage`    |
| `needs-info`              | `status:needs-info`      |
| `ready-for-agent`         | `status:ready-for-agent` |
| `ready-for-human`         | `status:ready-for-human` |
| `wontfix`                 | `wontfix`                |

When a skill mentions a role (for example "apply the agent-ready triage label"),
use the corresponding label string from the right-hand column.

Two of the five carry an action beyond the label. `wontfix` is applied as the
issue is closed, and the close reason is worth setting alongside it — the label
records the decision, the reason records it in a form GitHub itself
understands, readable back through
`gh issue view <number> --json stateReason`:

```bash
gh issue edit <number> --add-label "wontfix"
gh issue close <number> --reason "not planned" --comment "..."
```

`status:needs-info` replaces `status:needs-triage` rather than joining it, and
goes on with the comment that says what is missing. It returns to
`status:needs-triage` once the reporter replies:

```bash
gh issue comment <number> --body "..."
gh issue edit <number> \
  --add-label "status:needs-info" --remove-label "status:needs-triage"
```

## `status:in-progress` and triage

`/triage` neither reads nor writes `status:in-progress`, which is why no triage
role maps onto it. It belongs to the implementation workflow, which applies it
to a spec, the parent issue for a pull request, and the sub-issue being worked
on — see
[Marking work in progress](./issue-tracker.md#marking-work-in-progress).

A triage agent that meets an in-progress issue should leave that label alone and
not add a `status:ready-for-*` label to it: the ticket has already been picked
up, so neither "ready for" role is true of it any more.

## Related label families

`/triage` only reads the tables above, but this repository carries three other
label families that a triage agent should keep consistent when it touches an
issue:

- `type:*` — mirrors the commit types in [AGENTS.md](../../AGENTS.md)
  (`type:feat`, `type:fix`, `type:docs`, and so on)
- `scope:*` — mirrors the commit scopes, lowercased (`scope:configuration`,
  `scope:documentation`, and `scope:jimmypaolini` for the `JimmyPaolini` scope)
- `source:*` — records who opened the work, exactly one of `source:agent` or
  `source:human`

The first two are reconciled onto an issue from its submitted form by the
`issue-labels` synchronizer; `source:*` is applied by hand by whoever or
whatever opens the issue. All three take their vocabulary from
`configuration/conventional.config.cjs` and the `pull-request-labels` constants
beside it, never from a list written out here.

Six `scope:*` labels in the tracker predate that vocabulary and no longer
correspond to any commit scope: `scope:applications`, `scope:codebase`,
`scope:entities`, `scope:logger`, `scope:packages`, and `scope:tools`. No title
can imply one, and the pull request metadata check fails a pull request carrying
a `scope:*` label its title does not name — so treat these six as retired rather
than as available.

## The rest of the tracker's labels

Everything else the tracker carries. Triage reads none of them, and this table
is here so a label met on an issue can be recognized rather than guessed at:

| Label          | Meaning                                     | Applied by                    |
| -------------- | ------------------------------------------- | ----------------------------- |
| `do-not-merge` | Blocks a pull request while present         | A human, by hand              |
| `automated`    | Opened by a scheduled workflow              | 🧑‍🚒 Upgrade Dependencies       |
| `dependencies` | Pull requests that update a dependency file | 🧑‍🚒 Upgrade Dependencies       |
| `javascript`   | Pull requests that update javascript code   | Nothing — a GitHub default    |
| `duplicate`    | This issue or pull request already exists   | A human, by hand              |
| `help wanted`  | Extra attention is needed                   | A human, by hand              |
| `invalid`      | This doesn't seem right                     | A human, by hand              |

`do-not-merge` is the only one with behavior attached: the pull request metadata
check reads it and fails while it is present. `duplicate`, `help wanted`, and
`invalid` are three of GitHub's default labels, kept because they cost nothing;
`gh issue close --duplicate-of <number>` records a duplicate more precisely than
the label does.
