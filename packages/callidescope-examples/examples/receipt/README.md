# 🧾 Receipt

**The other half of [`misplaced-callable`](../misplaced-callable)**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `## Possibly misplaced` table in [`output/report.md`](../../output/report.md), whose `Called from` column names this module.

Both callers of `formatCurrency` live here, and none live where it is declared.
Two callers is the configured minimum for judging placement at all, and both of
them being in one module is the whole of the majority the finding needs.

This directory exists as a separate example folder because each folder under
`examples/` is one **module** in callidescope's sense — which is the unit module
spread and misplacement are measured against. Putting these callers beside the
callable would erase the finding.

## Next

[frame annotations](../frame-annotations/README.md).
