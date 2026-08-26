# 13. `--check` versus `--write`

What `--check` reports, what `--write` acts on, and the two command lines codependix refuses outright.

## A current export, and the same export after it drifts

The first result is what `--check` reports for an export nothing has moved. The second names the exact paths that went stale, which is what a reader is given to act on.

```json
[
  {
    "isCurrent": true,
    "projectName": "atlas-service",
    "stalePaths": []
  },
  {
    "isCurrent": false,
    "projectName": "atlas-service",
    "stalePaths": [
      "README.md"
    ]
  }
]
```

## A command line naming neither mode

`--check` and `--write` are mutually exclusive and one is required. A command line naming neither prints `USAGE_MESSAGE` and exits non-zero rather than silently defaulting to a write nobody asked for.

```text
💡 Usage: codependix --check (or codependix --write)
```

## A command line naming both modes

Rejected outright as well, and with a different reason — nothing selects a run mode when two are named.

```text
Only one of --check or --write may be given
```

## One project failing names itself and stops nothing

Example 5 shows the same guarantee acting on three real containers, one of which refuses to load.

`CodependixService.run` attempts every project regardless of whether an earlier one failed, collecting each failure as a `ProjectRunFailure` rather than aborting the loop. `CodependixCommand.reportOutcome` then reports the failures and the stale exports together, and fails the run if either list is non-empty. That is the whole of the guarantee: `--write` either fully succeeds, or names exactly which projects failed while still completing every other one.
