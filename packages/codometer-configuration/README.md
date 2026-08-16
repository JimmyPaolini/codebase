# CodometerConfiguration

NestJS service package scaffold generated with `conformetry:nestjs-service-project`.

`@codometer/configuration` reads a repository's `codometer.config.ts` and hands
back a fully defaulted configuration object. It is the only package that knows
anything about a particular repository; `@codometer/cli` measures whatever the
configuration describes.

## Configuration File

Any of `codometer.config.{ts,mts,cts,js,mjs,cjs,json,jsonc}` is read from the
directory being measured, or from any directory above it. Every field is
optional — a repository with no configuration file at all is measured with the
defaults.

```ts
import { type CodometerConfiguration } from "@codometer/configuration";

const codometerConfiguration: CodometerConfiguration = {
  // Appended to the built-in exclusions (node_modules, dist, build, coverage,
  // .nx), matched against repository-relative paths with `path.matchesGlob`.
  exclude: ["notepads/**", "**/templates/**"],
  // Ignore files in gitignore syntax, whose patterns exclude as well.
  excludeFrom: ["configuration/.codometerignore"],
  output: {
    // Omit a destination to leave that file unwritten.
    json: { indentation: 2, path: "output/codometer.json" },
    markdown: {
      description: "Measured on every push.",
      endMarker: "<!-- CODE_STATISTICS_END -->",
      path: "README.md",
      startMarker: "<!-- CODE_STATISTICS_START -->",
    },
  },
  // Interpreter used for Python analysis; defaults to `python3`.
  python: { command: "uv run python" },
};

export default codometerConfiguration;
```

Output paths are resolved relative to the directory being measured, not to the
configuration file, so a configuration kept in a `configuration/` folder still
writes to the repository root.

## What Gets Measured

Discovery enumerates through `git ls-files`, so **`.gitignore` is already in
force**: an ignored file is an untracked file, and no exclusion has to name it.
What the two exclusion options are for is the opposite case — files that are
committed but nobody wrote.

| Option | Syntax | Use it for |
| ------ | ------ | ---------- |
| `exclude` | Globs, matched with `path.matchesGlob` | A handful of paths named inline, appended to the built-in defaults |
| `excludeFrom` | Paths to ignore files, in gitignore syntax | Lockfiles, vendored bundles, generated documentation — the list a repository would rather keep in a file |

`excludeFrom` matching is done by git itself (`git ls-files --ignored
--exclude-from`), so negations, anchoring, and directory patterns behave exactly
as they do in a `.gitignore`, and pointing codometer at a file another tool
already reads gives the same answer that tool gets.

One caution when reusing an existing ignore file: most are written for one
tool's concerns, not for measurement. A `.prettierignore` typically ignores all
markdown because a markdown linter handles it — point codometer at that and the
prose metrics vanish. A dedicated `.codometerignore` is usually the better
answer.

## Markdown Output

The default markdown report is a `description` paragraph followed by shields.io
badges under one `###` heading per language, spliced between the two anchor
markers. Both halves of that behavior are replaceable on their own.

**`render`** turns the statistics into markdown. It is handed the configured
description, the statistics, and `renderBadges()` — the built-in rendering of
those same statistics, so a renderer can add to the default report instead of
replacing it.

```ts
markdown: {
  path: "README.md",
  render: ({ renderBadges, statistics }) =>
    `Lines of code: ${statistics.linesOfCode}\n\n${renderBadges()}`,
}
```

**`write`** decides which file the rendered markdown lands in and how. It is
handed the rendered `content`, the configured `path`, whether this is a check
run, and `anchors` — the marker mechanics, so choosing a different file does
not mean reimplementing the splice:

| Helper | Does |
| ------ | ---- |
| `anchors.syncAnchoredBlock({ content?, path? })` | Splices the block into a file, appending when the markers are absent and creating the file when it is missing. In check mode it compares instead of writing and returns whether the file is current. |
| `anchors.wrapInAnchors(content?)` | Returns the content wrapped in the markers, for a writer placing it somewhere itself. |
| `anchors.startMarker` / `anchors.endMarker` | The configured markers. |

```ts
markdown: {
  // `path` may be left out entirely when the writer picks the file.
  write: ({ anchors, statistics }) =>
    anchors.syncAnchoredBlock({
      path: statistics.python.files > 0 ? "docs/polyglot.md" : "README.md",
    }),
}
```

A `write` function returns `false` to report its destination as stale, which is
what fails a `--check` run; anything else counts as up to date. Markdown output
needs a `path`, a `write` function, or both — a destination naming neither is
rejected when the configuration loads.

## Start

```bash
nx run codometer-configuration:start
```

## Test

```bash
nx run codometer-configuration:test
```
