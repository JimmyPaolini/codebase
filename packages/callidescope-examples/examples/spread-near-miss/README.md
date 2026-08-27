# 🎯 Spread near miss

**All the reach, none of the breadth — and correctly silent.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `## Module spread` table in [`output/report.md`](../../output/report.md). This callable is deliberately absent from it.

This calls exactly one module directly and reaches everything
[`module-spread`](../module-spread) reaches. So it clears `spreadThreshold` on
transitive reach alone and is **not** reported, because it fails
`directSpreadThreshold`.

That is the fixture: a finding that does not happen, and the reason it does not.
Without the direct-breadth condition, this callable would be flagged — and so
would every entry point in the repository, since an entry point legitimately
reaches the whole program.

A rule that fires on everything says nothing.

## Next

[misplaced callable](../misplaced-callable/README.md).
