# 🕸️ Module spread

**Reaches six modules, and calls five of them directly.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `## Module spread` table in [`output/report.md`](../../output/report.md).

A module-spread finding needs **both** halves:

| Condition | Threshold | This fixture |
| --------- | --------- | ------------ |
| Transitive reach | `spreadThreshold` (4) | 6 modules |
| Direct calls into other modules | `directSpreadThreshold` (3) | 5 modules |

Transitive reach alone would flag every entry point in a repository, because an
entry point legitimately reaches the whole program. Requiring direct breadth is
what isolates the callable _personally_ joining unrelated concerns.

See [`spread-near-miss`](../spread-near-miss) for the other half of that
argument: a callable with the reach and not the breadth, correctly silent.

## Acting on it

Look at the five direct calls and ask which of them belong to one another. A
method joining unrelated concerns is usually a dispatcher wearing the name of a
domain operation. The remedy is to give each concern its own caller — not to
inline anything.

## Next

[spread near miss](../spread-near-miss/README.md).
