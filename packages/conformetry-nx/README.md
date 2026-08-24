# 👔 Conformetry Nx

The Nx host for [Conformetry](../conformetry-cli/README.md). It adds two things
the standalone CLI cannot offer: generators addressed by name through `nx g`,
and a cached validation target inferred onto every project that holds
instances.

```bash
npm install --save-dev @conformetry/nx
```

## Setup

Register the plugin in `nx.json` and wire the bootstrap into `postinstall`:

```json
{
  "plugins": [
    {
      "plugin": "@conformetry/nx",
      "options": {
        "configurationPath": "configuration/conformetry.config.ts",
        "validateTargetName": "conformetry-validate"
      }
    }
  ],
  "sync": { "globalGenerators": ["@conformetry/nx:sync"] }
}
```

```json
{ "scripts": { "postinstall": "conformetry-nx-bootstrap" } }
```

Then type your configuration as `ConformetryNxConfiguration` rather than
`ConformetryConfiguration`, so instance groups are checked against what Nx can
actually resolve:

```ts
import { type ConformetryNxConfiguration } from "@conformetry/nx";
```

## The emitted plugin

Which generators a workspace has is a property of its conformetry
configuration, so the plugin exposing them is **emitted rather than written**.
`conformetry-nx-bootstrap` derives it from your configuration, writes it to
`.conformetry/nx-generators` (gitignore that directory — it is a build
artifact), and links it into the root `node_modules` so
`nx g conformetry:<generator>` resolves. The link is what makes the plugin
addressable, since Nx resolves a generator's package prefix by requiring it by
name rather than by matching an Nx project.

| Default | Value |
| ------- | ----- |
| Output path | `.conformetry/nx-generators` |
| Package name | `conformetry` — so generators are `nx g conformetry:<name>` |

The bootstrap warns rather than exiting non-zero when the configuration cannot
be read, so a configuration mid-edit never blocks an unrelated install. Drift
is caught where it matters instead: every conformetry command compares the
emitted plugin against the configuration and refuses to run against a stale
one.

`@conformetry/nx` deliberately declares no generators of its own beyond `sync`.
`nx g @conformetry/nx:anything` resolves nothing by design — which generators
exist is a property of your configuration, not of this package.

## Generating

```bash
nx g conformetry:nestjs-service-module --name=billing --project=lexico
nx g conformetry:nsm --name=billing --project=lexico   # by alias
```

Nx prompts for missing inputs from the generator's own schema and writes
through its virtual `Tree`, so `--dry-run` works and the workspace formatter
runs over the result.

## Validating

The plugin infers a `conformetry-validate` target onto every project holding
instances, so validation is cached and participates in `nx affected`:

```bash
nx run <project>:conformetry-validate
nx run-many --target=conformetry-validate --all
nx affected --target=conformetry-validate --base=main
```

| Executor option | Purpose |
| --------------- | ------- |
| `configurationPath` | Configuration file, workspace-root relative |
| `languages` | Restrict the run to named validators; all run when omitted |

## Tag-scoped instances

The Nx host reads an instance group's `tags` as project tags, and resolves that
group's globs _inside_ each matching project — so where a generator belongs is
stated exactly once:

```ts
instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }];
```

The two group forms are told apart by `tags` alone. There is no second field
that could disagree with it: a separate scope that excluded a project the globs
reached narrowed validation silently, and validation cannot notice instances
it was never offered.

Omitting `patterns` selects the projects without locating anything in them,
which is what a template with no instances yet wants — `nx g` is still confined
to the projects the template suits.

## Exports

`runConformetryGenerator` for generator wrappers, `bootstrapPlugin` and
`runBootstrapCli` for the bootstrap, the `ConformetryNxConfiguration` and
instance-group types, and the NestJS services behind them (`PluginService`,
`AdapterService`, `InstancesService`, `ScopeService`, `OptionsService`).

## Test

```bash
nx run conformetry-nx:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `conformetry-nx`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 114 |
| Files | 42 |
| Calls traced | 134 |
| Call stacks | 8 |
| Deepest stack | 12 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Call stacks (depth)

**1. `runConformetryGenerator`** — depth ≥ 12 · exported-function

```text
🚀 runConformetryGenerator(…): Promise<string[]> [packages/conformetry-nx/src/index.ts:90]
   ↳ Runs one configured generator against an Nx tree.
  └─> PluginService.runGenerator(args: RunGeneratorArguments): Promise<string[]> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:337]
     ↳ Runs one configured generator against an Nx tree.
    └─> PluginService.assertPluginInSync(args: { configurationPath: string; workspaceRoot: string; }): Promise<void> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:125]
       ↳ Fails fast when the plugin would run against a stale or broken setup.
      └─> PluginService.assertEmittedPluginCurrent(args: { configurationPath: string; workspaceRoot: string; }): Promise<void> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:91]
         ↳ Fails when the emitted Nx plugin no longer matches the configuration. `generators.json` and its schemas are derived…
        └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/conformetry-nx/src/modules/generator/generator.service.ts:217]
           ↳ Returns every file the consumer's generator plugin consists of.
          └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/conformetry-nx/src/modules/generator/generator.service.ts:243]
            └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/conformetry-nx/src/modules/generator/generator.service.ts:185]
               ↳ The projects a generator's tagged groups admit, or nothing when it has none.
              └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/conformetry-nx/src/modules/scope/scope.service.ts:129]
                 ↳ The projects a generator's groups admit, by name and sorted.
                └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:142]
                  └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:143]
                    └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:47]
                       ↳ Returns whether a group applies to a project.
                      └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:34]
                         ↳ Whether a group locates its instances by project tag.
```

**2. `validateExecutor`** — depth ≥ 12 · orphan-root

```text
🚀 validateExecutor(…): Promise<{ success: boolean; }> [packages/conformetry-nx/src/executors/validate/executor.ts:16]
   ↳ Validates one project's instances against their conformetry templates.
  └─> PluginService.runValidation(args: RunValidationArguments): Promise<RunValidationResult> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:398]
     ↳ Validates one project's instances and renders the report.
    └─> PluginService.assertPluginInSync(args: { configurationPath: string; workspaceRoot: string; }): Promise<void> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:125]
       ↳ Fails fast when the plugin would run against a stale or broken setup.
      └─> PluginService.assertEmittedPluginCurrent(args: { configurationPath: string; workspaceRoot: string; }): Promise<void> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:91]
         ↳ Fails when the emitted Nx plugin no longer matches the configuration. `generators.json` and its schemas are derived…
        └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/conformetry-nx/src/modules/generator/generator.service.ts:217]
           ↳ Returns every file the consumer's generator plugin consists of.
          └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/conformetry-nx/src/modules/generator/generator.service.ts:243]
            └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/conformetry-nx/src/modules/generator/generator.service.ts:185]
               ↳ The projects a generator's tagged groups admit, or nothing when it has none.
              └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/conformetry-nx/src/modules/scope/scope.service.ts:129]
                 ↳ The projects a generator's groups admit, by name and sorted.
                └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:142]
                  └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:143]
                    └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:47]
                       ↳ Returns whether a group applies to a project.
                      └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:34]
                         ↳ Whether a group locates its instances by project tag.
```

**3. `runBootstrapCli`** — depth ≥ 10 · orphan-root

```text
🚀 runBootstrapCli(workspaceRoot: string): Promise<void> [packages/conformetry-nx/src/bootstrap.utilities.ts:73]
   ↳ Bootstraps the plugin, warning rather than failing the install.
  └─> bootstrapPlugin(workspaceRoot: string): Promise<EmittedFile[]> [packages/conformetry-nx/src/bootstrap.utilities.ts:38]
     ↳ Emits the generator plugin and puts it where Nx will find it.
    └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/conformetry-nx/src/modules/generator/generator.service.ts:217]
       ↳ Returns every file the consumer's generator plugin consists of.
      └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/conformetry-nx/src/modules/generator/generator.service.ts:243]
        └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/conformetry-nx/src/modules/generator/generator.service.ts:185]
           ↳ The projects a generator's tagged groups admit, or nothing when it has none.
          └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/conformetry-nx/src/modules/scope/scope.service.ts:129]
             ↳ The projects a generator's groups admit, by name and sorted.
            └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:142]
              └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:143]
                └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:47]
                   ↳ Returns whether a group applies to a project.
                  └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:34]
                     ↳ Whether a group locates its instances by project tag.
```

<details>
<summary>5 more call stacks</summary>

**4. `syncGenerator`** — depth ≥ 9 · orphan-root

```text
🚀 syncGenerator(…): Promise<{ outOfSyncMessage: string; }> [packages/conformetry-nx/src/generators/sync/generator.ts:26]
   ↳ Regenerates the workspace's conformetry generator plugin.
  └─> GeneratorService.emitPlugin(args: EmitPluginArguments): Promise<EmittedFile[]> [packages/conformetry-nx/src/modules/generator/generator.service.ts:217]
     ↳ Returns every file the consumer's generator plugin consists of.
    └─> GeneratorService.map(…)(…): { content: string; filePath: string; } [packages/conformetry-nx/src/modules/generator/generator.service.ts:243]
      └─> GeneratorService.resolveScopedProjectNames(…): string[] | undefined [packages/conformetry-nx/src/modules/generator/generator.service.ts:185]
         ↳ The projects a generator's tagged groups admit, or nothing when it has none.
        └─> ScopeService.resolveScopedProjectNames(…): string[] [packages/conformetry-nx/src/modules/scope/scope.service.ts:129]
           ↳ The projects a generator's groups admit, by name and sorted.
          └─> ScopeService.filter(…)(project: ProjectScope): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:142]
            └─> ScopeService.some(…)(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:143]
              └─> ScopeService.matchesProject(args: { group: ConformetryInstanceGroup; project: ProjectScope; }): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:47]
                 ↳ Returns whether a group applies to a project.
                └─> ScopeService.isProjectGroup(group: ConformetryInstanceGroup): boolean [packages/conformetry-nx/src/modules/scope/scope.service.ts:34]
                   ↳ Whether a group locates its instances by project tag.
```

**5. `anonymous`** — depth ≥ 8 · orphan-root

```text
🚀 anonymous(…): Promise<CreateNodesResultArray> [packages/conformetry-nx/src/index.ts:46]
  └─> PluginService.inferTargets(args: InferTargetsArguments): Promise<Map<string, InferredTargets>> [packages/conformetry-nx/src/modules/plugin/plugin.service.ts:272]
     ↳ Infers a validation target onto every project that holds at least one instance.
    └─> InstancesService.findProjectInstances(args: FindProjectInstancesArguments): Promise<Instance[]> [packages/conformetry-nx/src/modules/instances/instances.service.ts:74]
       ↳ Expands every instance group that applies to a project, keeping only the instances that live inside it.
      └─> InstancesService.flatMap(…)(this: undefined, group: ConformetryInstanceGroup): Instance[] [packages/conformetry-nx/src/modules/instances/instances.service.ts:90]
        └─> InstanceDiscoveryService.findInstances(args: FindInstancesArguments): Instance[] [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:87]
           ↳ Expands instance globs into the instances that exist.
          └─> InstanceDiscoveryLocatingService.findInstances(args: FindInstancesArguments): Instance[] [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:121]
             ↳ Expands every pattern and returns one instance per distinct path, name, and scope kind.
            └─> InstanceDiscoveryLocatingService.resolveGlobSuffix(pattern: string): string [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:73]
               ↳ Returns the literal filename suffix a pattern ends with, such as `.service.ts` for `**\/*.service.ts`, or `""` when the…
              └─> InstanceDiscoveryLocatingService.map(…)(character: string): number [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery-locating.service.ts:76]
```

**6. `AdapterService.listDirectory`** — depth 3 · orphan-root

```text
🚀 AdapterService.listDirectory(directoryPath: string): Promise<DirectoryEntry[]> [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:116]
  └─> AdapterService.listDirectory(…): Promise<DirectoryEntry[]> [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:44]
     ↳ Lists a directory through the tree when it is inside the workspace, and through the filesystem otherwise.
    └─> AdapterService.resolveTreePath(args: { directoryPath: string; workspaceRoot: string; }): string | undefined [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:91]
       ↳ Converts an absolute path to the workspace-relative form a `Tree` uses, or returns `undefined` when the path lies…
```

**7. `AdapterService.readFile`** — depth 3 · orphan-root

```text
🚀 AdapterService.readFile(filePath: string): Promise<string> [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:126]
  └─> AdapterService.readFile(…): Promise<string> [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:70]
     ↳ Reads a file through the tree when possible, the filesystem otherwise.
    └─> AdapterService.resolveTreePath(args: { directoryPath: string; workspaceRoot: string; }): string | undefined [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:91]
       ↳ Converts an absolute path to the workspace-relative form a `Tree` uses, or returns `undefined` when the path lies…
```

**8. `AdapterService.writeFile`** — depth 2 · orphan-root

```text
🚀 AdapterService.writeFile(filePath: string, content: string): Promise<void> [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:133]
  └─> AdapterService.resolveTreePath(args: { directoryPath: string; workspaceRoot: string; }): string | undefined [packages/conformetry-nx/src/modules/adapter/adapter.service.ts:91]
     ↳ Converts an absolute path to the workspace-relative form a `Tree` uses, or returns `undefined` when the path lies…
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `PluginService.runValidation` | 16 | `conformetry-core:modules/reporting`, `conformetry-nx:modules/instances`, `conformetry-validation:modules/validation` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:398` |
| `PluginService.runGenerator` | 12 | `conformetry-configuration:modules/configuration`, `conformetry-generation:modules/generation`, `conformetry-nx:modules/adapter`, `conformetry-nx:modules/options`, `conformetry-nx:modules/paths` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:337` |
| `syncGenerator` | 7 | `conformetry-nx:modules/generator`, `conformetry-nx:modules/options`, `conformetry-nx:modules/projects`, `conformetry-nx:src` | `packages/conformetry-nx/src/generators/sync/generator.ts:26` |
| `bootstrapPlugin` | 6 | `conformetry-nx:modules/generator`, `conformetry-nx:modules/options`, `conformetry-nx:modules/projects` | `packages/conformetry-nx/src/bootstrap.utilities.ts:38` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `PluginService.runGenerator` | 9 | `PluginService.resolveOptions`, `PluginService.assertPluginInSync`, `ConfigurationService.loadConformetryConfiguration`, `PluginService.find(…)`, `PluginService.map(…)`, `AdapterService.createAdapters`, `OptionsService.resolveGeneratorInputs`, `GenerationService.runGenerator`, `PathsService.resolveGenerationPath` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:337` |
| `bootstrapPlugin` | 9 | `resolveGeneratorService`, `resolveOptionsService`, `resolveProjectsService`, `GeneratorService.emitPlugin`, `OptionsService.resolveConfigurationPath`, `readNxConfiguration`, `ProjectsService.listWorkspaceProjects`, `writePlugin`, `linkPlugin` | `packages/conformetry-nx/src/bootstrap.utilities.ts:38` |
| `syncGenerator` | 7 | `resolveGeneratorService`, `resolveOptionsService`, `resolveProjectsService`, `GeneratorService.emitPlugin`, `OptionsService.resolveConfigurationPath`, `readNxConfiguration`, `ProjectsService.listWorkspaceProjects` | `packages/conformetry-nx/src/generators/sync/generator.ts:26` |

<details>
<summary>53 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GeneratorService.emitPlugin` | 6 | `ConfigurationService.loadConformetryConfiguration`, `GeneratorService.toSorted(…)`, `GeneratorService.buildGeneratorsManifest`, `GeneratorService.map(…)`, `GeneratorService.map(…)`, `GeneratorService.stringify` | `packages/conformetry-nx/src/modules/generator/generator.service.ts:217` |
| `PluginService.runValidation` | 6 | `PluginService.resolveOptions`, `PluginService.assertPluginInSync`, `ValidationService.validate`, `InstancesService.findProjectInstances`, `PluginService.resolveTemplates`, `ReportingService.formatReport` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:398` |
| `InstancesService.findProjectInstances` | 5 | `ConfigurationService.loadConformetryConfiguration`, `InstancesService.filter(…)`, `InstancesService.flatMap(…)`, `InstancesService.flatMap(…)`, `InstancesService.flatMap(…)` | `packages/conformetry-nx/src/modules/instances/instances.service.ts:74` |
| `PathsService.resolveGenerationPath` | 5 | `PathsService.resolveNewProjectPath`, `InstancesService.findProjectInstances`, `PathsService.requireModulePath`, `PathsService.resolveScopedDirectory`, `PathsService.resolveModuleParentPath` | `packages/conformetry-nx/src/modules/paths/paths.service.ts:211` |
| `PluginService.inferTargets` | 5 | `PluginService.resolveOptions`, `PluginService.resolveTemplateInputs`, `PluginService.filter(…)`, `ProjectsService.readProjectScope`, `InstancesService.findProjectInstances` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:272` |
| `ScopeService.resolveScopedProjectNames` | 4 | `ScopeService.filter(…)`, `ScopeService.toSorted(…)`, `ScopeService.map(…)`, `ScopeService.filter(…)` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:129` |
| `ProjectsService.listWorkspaceProjects` | 4 | `ProjectsService.toSorted(…)`, `ProjectsService.map(…)`, `ProjectsService.listProjectConfigurationFiles`, `ProjectsService.readIgnoredPaths` | `packages/conformetry-nx/src/modules/projects/projects.service.ts:120` |
| `anonymous` | 4 | `resolvePluginService`, `PluginService.inferTargets`, `filter(…)`, `map(…)` | `packages/conformetry-nx/src/index.ts:46` |
| `ScopeService.resolveGroup` | 3 | `ScopeService.matchesProject`, `ScopeService.isProjectGroup`, `ScopeService.map(…)` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:69` |
| `AdapterService.listDirectory` | 3 | `AdapterService.resolveTreePath`, `AdapterService.map(…)`, `AdapterService.map(…)` | `packages/conformetry-nx/src/modules/adapter/adapter.service.ts:44` |
| `PathsService.resolveScopedDirectory` | 3 | `ConfigurationService.loadConformetryConfiguration`, `PathsService.find(…)`, `ScopeService.resolveScopedDirectory` | `packages/conformetry-nx/src/modules/paths/paths.service.ts:158` |
| `PluginService.resolveOptions` | 3 | `OptionsService.resolveConfigurationPath`, `PluginService.readNxConfiguration`, `OptionsService.resolvePluginOptions` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:196` |
| `PluginService.resolveTemplateInputs` | 3 | `ConfigurationService.loadConformetryConfiguration`, `PluginService.map(…)`, `PluginService.map(…)` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:226` |
| `ScopeService.matchesProject` | 2 | `ScopeService.isProjectGroup`, `ScopeService.some(…)` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:47` |
| `ScopeService.resolveScopedDirectory` | 2 | `ScopeService.find(…)`, `ScopeService.findIndex(…)` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:103` |
| `GeneratorService.buildSchema` | 2 | `GeneratorService.stringify`, `GeneratorService.buildSchemaProperties` | `packages/conformetry-nx/src/modules/generator/generator.service.ts:127` |
| `GeneratorService.map(…)` | 2 | `GeneratorService.buildSchema`, `GeneratorService.resolveScopedProjectNames` | `packages/conformetry-nx/src/modules/generator/generator.service.ts:243` |
| `OptionsService.readRegisteredConfigurationPath` | 2 | `OptionsService.isUnknownArray`, `OptionsService.readString` | `packages/conformetry-nx/src/modules/options/options.service.ts:40` |
| `OptionsService.resolveConfigurationPath` | 2 | `OptionsService.readRegisteredConfigurationPath`, `OptionsService.find(…)` | `packages/conformetry-nx/src/modules/options/options.service.ts:100` |
| `ProjectsService.readIgnoredPaths` | 2 | `ProjectsService.filter(…)`, `ProjectsService.map(…)` | `packages/conformetry-nx/src/modules/projects/projects.service.ts:99` |
| `ProjectsService.readProjectScope` | 2 | `ProjectsService.isUnknownArray`, `ProjectsService.filter(…)` | `packages/conformetry-nx/src/modules/projects/projects.service.ts:136` |
| `PluginService.assertEmittedPluginCurrent` | 2 | `GeneratorService.emitPlugin`, `ProjectsService.listWorkspaceProjects` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:91` |
| `PluginService.assertPluginInSync` | 2 | `PluginService.assertTemplatesExist`, `PluginService.assertEmittedPluginCurrent` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:125` |
| `PluginService.resolveTemplates` | 2 | `ConfigurationService.loadConformetryConfiguration`, `PluginService.map(…)` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:243` |
| `runConformetryGenerator` | 2 | `resolvePluginService`, `PluginService.runGenerator` | `packages/conformetry-nx/src/index.ts:90` |
| `validateExecutor` | 2 | `resolvePluginService`, `PluginService.runValidation` | `packages/conformetry-nx/src/executors/validate/executor.ts:16` |
| `ScopeService.filter(…)` | 1 | `ScopeService.isProjectGroup` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:133` |
| `ScopeService.filter(…)` | 1 | `ScopeService.some(…)` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:142` |
| `ScopeService.some(…)` | 1 | `ScopeService.matchesProject` | `packages/conformetry-nx/src/modules/scope/scope.service.ts:143` |
| `GeneratorService.buildGeneratorsManifest` | 1 | `GeneratorService.stringify` | `packages/conformetry-nx/src/modules/generator/generator.service.ts:88` |
| `GeneratorService.resolveScopedProjectNames` | 1 | `ScopeService.resolveScopedProjectNames` | `packages/conformetry-nx/src/modules/generator/generator.service.ts:185` |
| `GeneratorService.map(…)` | 1 | `GeneratorService.buildGeneratorModule` | `packages/conformetry-nx/src/modules/generator/generator.service.ts:234` |
| `AdapterService.readFile` | 1 | `AdapterService.resolveTreePath` | `packages/conformetry-nx/src/modules/adapter/adapter.service.ts:70` |
| `AdapterService.listDirectory` | 1 | `AdapterService.listDirectory` | `packages/conformetry-nx/src/modules/adapter/adapter.service.ts:116` |
| `AdapterService.readFile` | 1 | `AdapterService.readFile` | `packages/conformetry-nx/src/modules/adapter/adapter.service.ts:126` |
| `AdapterService.writeFile` | 1 | `AdapterService.resolveTreePath` | `packages/conformetry-nx/src/modules/adapter/adapter.service.ts:133` |
| `InstancesService.flatMap(…)` | 1 | `ScopeService.resolveGroup` | `packages/conformetry-nx/src/modules/instances/instances.service.ts:85` |
| `InstancesService.flatMap(…)` | 1 | `InstanceDiscoveryService.findInstances` | `packages/conformetry-nx/src/modules/instances/instances.service.ts:90` |
| `InstancesService.filter(…)` | 1 | `InstancesService.isInsideProject` | `packages/conformetry-nx/src/modules/instances/instances.service.ts:102` |
| `OptionsService.resolvePluginOptions` | 1 | `OptionsService.readString` | `packages/conformetry-nx/src/modules/options/options.service.ts:149` |
| `PathsService.requireModulePath` | 1 | `PathsService.resolveModulePath` | `packages/conformetry-nx/src/modules/paths/paths.service.ts:56` |
| `PathsService.resolveModuleParentPath` | 1 | `PathsService.toSorted(…)` | `packages/conformetry-nx/src/modules/paths/paths.service.ts:85` |
| `PathsService.resolveModulePath` | 1 | `PathsService.find(…)` | `packages/conformetry-nx/src/modules/paths/paths.service.ts:117` |
| `PathsService.resolveNewProjectPath` | 1 | `PathsService.resolveTypeDirectoryPath` | `packages/conformetry-nx/src/modules/paths/paths.service.ts:135` |
| `ProjectsService.map(…)` | 1 | `ProjectsService.readProjectScope` | `packages/conformetry-nx/src/modules/projects/projects.service.ts:126` |
| `PluginService.assertTemplatesExist` | 1 | `ConfigurationService.loadConformetryConfiguration` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:141` |
| `PluginService.map(…)` | 1 | `TemplateDiscoveryService.collectTemplate` | `packages/conformetry-nx/src/modules/plugin/plugin.service.ts:252` |
| `resolveGeneratorService` | 1 | `resolvePluginContext` | `packages/conformetry-nx/src/plugin-context.utilities.ts:17` |
| `resolveOptionsService` | 1 | `resolvePluginContext` | `packages/conformetry-nx/src/plugin-context.utilities.ts:24` |
| `resolvePluginService` | 1 | `resolvePluginContext` | `packages/conformetry-nx/src/plugin-context.utilities.ts:31` |
| `resolveProjectsService` | 1 | `resolvePluginContext` | `packages/conformetry-nx/src/plugin-context.utilities.ts:38` |
| `runBootstrapCli` | 1 | `bootstrapPlugin` | `packages/conformetry-nx/src/bootstrap.utilities.ts:73` |
| `linkPlugin` | 1 | `leadsTo` | `packages/conformetry-nx/src/bootstrap.utilities.ts:115` |

</details>

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5588-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-196.56_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-15-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-60-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-33.29_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-58-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-20-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-17-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-139-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-2-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-14-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-23-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-17-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-246-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-85-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-201-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-130-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-250-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-254-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-78-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-324-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-689-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-8-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-244-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-54-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-14-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-168-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-132-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-3-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-7-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-34-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-210-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-7-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-0-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-0-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-0-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-0-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-0-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-0-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-0-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-0-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-9-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-8-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-8-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-10-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-0-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-14-7c3aed?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-0284c7?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-16a34a?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-308-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-13-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-48-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-12-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-74-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
