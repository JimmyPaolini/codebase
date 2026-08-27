# 🔀 `--check` versus `--write`

What `--check` reports, what `--write` acts on, the command line codependix asks about, and the one it refuses outright.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

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

`--check` and `--write` are mutually exclusive and one is required. At a terminal, a command line naming neither is asked which was meant, as a two-item menu. Where stdin is not a terminal the run fails with this instead — `prompts` would otherwise draw a menu nobody can answer, never resolve, and let the process exit 0 having written nothing.

```text
A run mode (--check or --write) is required, and stdin is not a terminal so it cannot be asked for.
```

## A command line naming both modes

Refused outright rather than asked about — nothing selects a run mode when two are named, so there is no question to put.

```text
Only one of --check or --write may be given.
```

## One project failing names itself and stops nothing

[container-rooting](../container-rooting) shows the same guarantee acting on three real containers, one of which refuses to load.

`MapService.run` attempts every project regardless of whether an earlier one failed, collecting each failure as a `ProjectRunFailure` rather than aborting the loop. `MapCommand.reportOutcome` then reports the failures and the stale exports together, and fails the run if either list is non-empty. That is the whole of the guarantee: `--write` either fully succeeds, or names exactly which projects failed while still completing every other one.

## Next

[refusals](../refusals/README.md).
