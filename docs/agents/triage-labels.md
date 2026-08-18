# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repository's issue tracker.

This repository already prefixes workflow-state labels with `status:` (`status:todo`, `status:in-progress`, `status:done`), so four of the five roles map onto that convention rather than introducing a parallel vocabulary. `wontfix` already exists under its canonical name and is reused as-is.

| Label in mattpocock/skills | Label in our tracker     | Meaning                                        |
| -------------------------- | ------------------------ | ---------------------------------------------- |
| `needs-triage`             | `status:needs-triage`    | Maintainer needs to evaluate this issue        |
| `needs-info`               | `status:needs-info`      | Waiting on reporter for more information       |
| `ready-for-agent`          | `status:ready-for-agent` | Fully specified, ready for an unattended agent |
| `ready-for-human`          | `status:ready-for-human` | Requires human implementation                  |
| `wontfix`                  | `wontfix`                | Will not be worked on                          |

When a skill mentions a role (for example "apply the agent-ready triage label"), use the corresponding label string from the right-hand column.

## Labels that still need creating

Only `wontfix` exists today. Create the other four before the first `/triage` run:

```bash
gh label create status:needs-triage --description "Maintainer needs to evaluate this issue" --color fbca04
gh label create status:needs-info --description "Waiting on reporter for more information" --color fbca04
gh label create status:ready-for-agent --description "Fully specified, ready for an unattended agent" --color fbca04
gh label create status:ready-for-human --description "Requires human implementation" --color fbca04
```

The `fbca04` color matches the existing `status:` family.

## Related label families

`/triage` only reads the table above, but this repository carries three other label families that a triage agent should keep consistent when it touches an issue:

- `type:*` — mirrors the commit types in [AGENTS.md](../../AGENTS.md) (`type:feat`, `type:fix`, `type:docs`, and so on)
- `scope:*` — mirrors the commit scopes (`scope:codebase`, `scope:configuration`, `scope:documentation`, and so on)
- `source:*` — records where the work originated (`source:agent`)
