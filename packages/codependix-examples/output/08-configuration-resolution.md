# 8. Configuration resolution, field by field

Every configuration field, resolved by the real loader — including the two a reader is most likely to assume wrongly.

## `defaults`, a per-project override, and the two glob lists

`atlas-core` names an `nx` override, and it **replaces** the default outright rather than merging into it — its `markdown` destination is gone, not inherited. `atlas-application` matches `exclude`, so it resolves to `none` no matter what either configuration would otherwise say. `unrelated` matches no `include` glob at all.

| Project | Root | Resolved target | Destination |
| ------- | ---- | --------------- | ----------- |
| `atlas-service` | `packages/atlas-service` | `markdown` | markdown `README.md` anchor `example-nx` |
| `atlas-core` | `packages/atlas-core` | `json` | json `graph.json` |
| `atlas-application` | `applications/atlas-application` | `none` | _none_ |
| `unrelated` | `tools/unrelated` | `none` | _none_ |

## `include` and `exclude` match a name or a root

Both lists are matched against a project's name **and** its workspace-relative root. `atlas-service` matches no glob by name and matches `packages/*` by root, so a caller that knows the root gets a different answer from one that does not — which is why `projectRoot` is optional rather than absent.

```text
include: ["packages/*", "codependix-*"]

atlas-service, name only                        → false
atlas-service, name and packages/atlas-service  → true
codependix-examples, name only                  → true
```

## The Workspace Graph ignores both glob lists

It is exported once for the repository rather than once per project, so it carries no per-project override and `include`/`exclude` never apply to it.

```json
{
  "markdown": {
    "anchor": "example-workspace",
    "path": "README.md"
  },
  "target": "markdown"
}
```

## Why the field is `defaults` and not `default`

The one naming decision in the whole configuration surface that looks arbitrary and is not.

`ConfigurationService.readDefaultExport` unwraps a configuration module's default export **by name**. A configuration field also called `default` would collide with that unwrapping, which is why the field is `defaults`.

## A workspace carrying two configuration files

`examples/configuration/precedence/` holds both a `codependix.config.ts` and a `codependix.config.json`. `CONFIGURATION_FILE_NAMES` is searched in order, so the TypeScript one wins — the anchor here is the one it declares.

```json
{
  "nx": {
    "markdown": {
      "anchor": "example-nx"
    },
    "target": "markdown"
  }
}
```

## The upward search reaches past a nested `package.json`

The search started inside `packages/atlas-service/`, which carries its own `package.json`, and still found the configuration at the workspace root — the root every path in that configuration was written relative to.

```json
{
  "atlas-service": {
    "nx": {
      "json": {
        "path": "codependix-nx-graph.json"
      },
      "target": "json"
    }
  }
}
```

## No configuration file at all

A workspace that never wrote one resolves every graph to `target: "none"` and produces nothing, rather than being told to write one. The absence of an unnamed configuration file is legal.

```json
{
  "target": "none"
}
```

## An unknown field is stripped, not rejected

The configuration declares a `graphqlSchemas` field no codependix has an opinion about. Zod strips unknown keys, so a configuration written for a newer codependix still loads under an older one.

```json
{
  "nx": {
    "markdown": {
      "anchor": "example-nx"
    },
    "target": "markdown"
  }
}
```
