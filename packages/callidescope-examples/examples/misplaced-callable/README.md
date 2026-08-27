# 📦 Misplaced callable

**`formatCurrency` is declared here, and both its callers live in `receipt`**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `## Possibly misplaced` table in [`output/report.md`](../../output/report.md).

```text
formatCurrency | declared in …:misplaced-callable | called from …:receipt | 2/2
```

The report names the move rather than describing a smell. Move the file, or fold
the helper into its one caller.

## Why it stays quiet about shared utilities

Two thresholds keep this finding from firing on genuinely shared code:

| Threshold | Default | Effect |
| --------- | ------- | ------ |
| `minimumCallers` | 2 | One caller is not evidence of anything |
| `callerMajorityRatio` | 0.8 | The callers must nearly all be in **one** foreign module |

[`shared-tail`](../shared-tail) is the control: `roundToCents` also has two
callers, but they sit in two different modules, so the majority is 50% and
nothing is reported.

The callers are in [`receipt`](../receipt).

## Next

[receipt](../receipt/README.md).
