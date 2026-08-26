# 13. Every refusal, with its reproduction

Every way codependix refuses a configuration or a command line, each with the reproduction that produces it — because a refusal is where a reader gets stuck.

## A `both` target with no `json` destination

Reproduced by `codependixConfigurationSchema.parse({"defaults":{"nx":{"target":"both"}}})`.

```text
A "both" export target needs a json destination.
A "both" export target needs a markdown destination.
```

## A `json` target with no `json` destination

Reproduced by `codependixConfigurationSchema.parse({"defaults":{"nx":{"target":"json"}}})`.

```text
A "json" export target needs a json destination.
```

## A `both` target with no `markdown` destination

Reproduced by `codependixConfigurationSchema.parse({"defaults":{"nx":{"json":{"path":"graph.json"},"target":"both"}}})`.

```text
A "both" export target needs a markdown destination.
```

## A `markdown` target with no `markdown` destination

Reproduced by `codependixConfigurationSchema.parse({"defaults":{"nx":{"target":"markdown"}}})`.

```text
A "markdown" export target needs a markdown destination.
```

## A `markdown` destination naming neither an anchor nor a path

Reproduced by `codependixConfigurationSchema.parse({"defaults":{"nx":{"markdown":{},"target":"markdown"}}})`.

```text
A markdown destination needs an anchor, a path, or both — otherwise nothing names where the export goes.
```

## An explicitly named configuration file that does not exist

A path named on the command line must exist: a typo in a task runner's arguments should fail rather than quietly resolving every graph to `none`. A path that was _not_ named is searched for, and its absence is legal — see example 8.

```text
ConfigurationFileNotFoundError: Configuration file not found: <examples>/configuration/absent/codependix.config.missing.ts
```

## A configuration file the loader cannot read

`SUPPORTED_CONFIGURATION_EXTENSIONS` covers `.cjs`, `.cts`, `.js`, `.json`, `.mjs`, `.mts`, and `.ts`. Anything else raises `UnknownConfigurationFileTypeError`.

```text
UnknownConfigurationFileTypeError: Unsupported configuration file type: <examples>/configuration/unsupported-type/codependix.config.yaml
```
