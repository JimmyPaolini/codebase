# CodometerCli

NestJS command-line application scaffold generated with `conformetry:nestjs-command-project`.

`@codometer/cli` measures a git repository and reports what it found.

- It counts TypeScript, JavaScript, Python, JSON, and markdown files, and the
  constructs inside them, over the files `git ls-files` reports.
- Jupyter notebooks are measured by composition rather than by a fourth parser:
  the document is handed to the JSON analyzer, its code cells to the Python
  analyzer, and its markdown cells to the markdown analyzer, leaving only cells,
  outputs, and executions for the notebook analyzer itself to count.
- It knows nothing about any particular repository. Which paths to skip, where
  the output goes, and how Python is reached all come from
  `@codometer/configuration`.
- Output goes to a markdown report, a JSON report, or both — or to stdout when
  neither is configured.
- The markdown report is rendered as badges under one `###` heading per
  language and spliced between anchor markers, unless the configuration
  supplies its own `render` or `write` function; see
  [@codometer/configuration](../codometer-configuration/README.md#markdown-output).

## Usage

```bash
codometer --directory . --config configuration/codometer.config.ts
```

| Flag | Purpose |
| ---- | ------- |
| `--check` | Report whether the outputs are current, write nothing, exit non-zero when stale |
| `--config [path]` | Configuration file to read; searched for when omitted |
| `-d, --directory [path]` | Directory to measure; defaults to the current one |
| `--json [path]` | Write the JSON report here, overriding the configured path |
| `-m, --markdown [path]` | Write the badge block here, overriding the configured path |

With no markdown or JSON destination — from either the configuration or the
flags — the statistics are written to stdout instead.

## Start

```bash
nx run codometer-cli:start
```

## Test

```bash
nx run codometer-cli:test
```
