# 9. Embedding the graph builders directly

The graph builders are injectable services with no command line and no configuration file between them and a caller. This whole package is the proof.

## The six collaborators a host injects

Every one of them comes from `@codependix/nx`, `@codependix/nestjs`, or `@codependix/imports`. None comes from `@codependix/cli`.

```ts
constructor(
  private readonly moduleGraphService: ModuleGraphService,
  private readonly neighborhoodService: NeighborhoodService,
  private readonly nestjsProjectService: NestjsProjectService,
  private readonly pythonService: PythonService,
  private readonly typescriptService: TypescriptService,
  private readonly workspaceGraphService: WorkspaceGraphService,
) {}
```

## The one method that reads the process working directory

This is the constraint that decided this package's shape — see the README's `Why the fixtures are not a nested workspace`.

`NeighborhoodService.readProjectGraph` is the only method in any of the three packages that reaches for a live workspace — it calls `createProjectGraphAsync()`, which resolves the Nx workspace from the process working directory and takes no directory argument. `--directory` supplies only the root that export paths are resolved against. Every other method is handed the graph, the project, or the program it works on, which is what lets this package graph fixtures at all.

## What the command line adds

The split is why this package can render every diagram in these examples without a `codependix.config.ts` anywhere near it.

`@codependix/cli` adds three things and nothing else: a command line with exactly two modes, `ConfigurationService` resolving where each project's export goes, and `DeliveryService` turning that into file I/O. A host wanting a graph in memory needs none of them.
