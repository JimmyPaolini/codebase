# 🔭 Callidescope Core

**The domain vocabulary every other Callidescope package speaks.**

This package is the contracts leaf of the Callidescope spine: it declares what a
run produces — call graphs, stacks, frames, findings — and depends on nothing.
It holds no service and no NestJS module, so importing a result type never drags
a configuration loader or a TypeScript program behind it.

```bash
npm install --save-dev @callidescope/core
```

## What This Package Owns

- **`call-graph`** — the result and finding vocabulary: `CallGraphResult`,
  `ProjectReport`, `CallStack`, `StackFrame`, `CallableNode`, `CallEdge`,
  `DeepStackFinding`, `WideCallableFinding`, and the identifiers and locations
  they are built from

The sharp test for what belongs here: a type describing **what the tool
produced** is core; a type describing **what the user wrote in
`callidescope.config.ts`** belongs in
[`@callidescope/configuration`](../callidescope-configuration/README.md).

## Test

```bash
nx run callidescope-core:vitest
```

## 👔 Conformetry

This project was generated from the [typescript-types-project](../../../../configuration/conformetry-templates/typescript-types-project) conformetry template.
