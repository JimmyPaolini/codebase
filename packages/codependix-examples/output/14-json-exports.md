# 14. The JSON exports

The JSON shape of every graph type, committed so a reader sees it without running anything — and why one ESLint rule is switched off for exactly these files.

## Every graph type's JSON shape, committed

Each one is rendered by `DeliveryService.renderJson`, so it is byte-identical to what a real `codependix --write` would produce — two-space indentation and a trailing newline.

| Graph | Committed as |
| ----- | ------------ |
| Nx Neighborhood | `output/json/codependix-neighborhood-graph.json` |
| Nx Workspace Graph | `output/json/codependix-workspace-graph.json` |
| NestJS module graph | `output/json/codependix-module-graph.json` |
| TypeScript file imports | `output/json/codependix-imports-graph.json` |
| Python file imports | `output/json/codependix-python-imports-graph.json` |

## Why the sort rule is off for these files

The committed exports here are named to match that glob, so the carve-out covers them too rather than being described from a distance.

`configuration/eslint.config.ts` turns `jsonc/sort-array-values` **off** for `**/codependix-*graph.json`. These arrays come out of the Nx project graph, a NestJS container, or a `ts.Program`, in whichever order each source discovers its projects, modules, or files — not alphabetical order. Enforcing a sort would rewrite what codependix just wrote, and every `codependix --write` would immediately fail its own `--check`. It is the same reformatting-versus-drift conflict `configuration/.oxfmtignore` already solves for `.conformetry/**`.
