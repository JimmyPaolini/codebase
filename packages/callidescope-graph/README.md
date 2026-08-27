# 🔭 Callidescope Graph

**Builds the call graph from traced TypeScript source and measures its depth, breadth, and cohesion.**

This package is the leaf of the
[`@callidescope/cli`](../callidescope-cli/README.md) package graph: it depends
only on [`@callidescope/configuration`](../callidescope-configuration/README.md)
and `@codebase/logger`, and nothing here reaches into
[`@callidescope/output`](../callidescope-output/README.md).

```bash
npm install --save-dev @callidescope/graph
```

## What This Package Owns

- **`program`** — compiles the traced TypeScript projects
- **`workspace`** — resolves which projects and files are in scope
- **`callables`** — discovers the callable declarations
- **`entry-points`** — resolves configured entry points
- **`class-hierarchy`** — resolves interface members to concrete implementations
- **`signatures`** — reads callable signatures
- **`documentation`** — reads a callable's documentation comment
- **`edges`** — resolves call sites to callee declarations
- **`graph`** — assembles the above into `CallGraph`/`CondensedGraph` and measures depth and breadth over it
- **`cohesion`** — misplaced-callable and module-spread detection, since both are graph-analysis over an already-built graph rather than rendering concerns

## Test

```bash
nx run callidescope-graph:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/callidescope-graph`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 192 |
| Files | 63 |
| Calls traced | 160 |
| Call stacks | 6 |
| Deepest stack | 5 |
| Stacks through recursion | 0 |
| Unfollowable calls | 2 |

### Call stacks (depth)

**1. `CallablesService.visit`** — depth 5 · orphan-root

```text
🚀 CallablesService.visit(node: ts.Node): void [packages/callidescope-graph/src/modules/callables/callables.service.ts:49]
  └─> CallablesService.describe(args: DescribeCallableArguments): DiscoveredCallable [packages/callidescope-graph/src/modules/callables/callables.service.ts:116]
     ↳ Turns one declaration into a fully described node.
    └─> CallableIdentityService.readDisplayName(declaration: CallableDeclaration): string [packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:117]
       ↳ Builds the qualified name a report prints for a callable.
      └─> CallableIdentityService.readMemberName(declaration: CallableDeclaration): string [packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:179]
         ↳ Reads the member name, falling back to the shape it was written in.
        └─> CallableIdentityService.readBindingName(node: ts.Node): string | undefined [packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:50]
           ↳ Reads the name a property, variable, or parameter declaration binds.
```

**2. `AddressDepthService.toStack`** — depth 4 · orphan-root

```text
🚀 AddressDepthService.toStack(…): CallAddressStack [packages/callidescope-graph/src/modules/graph/address-depth.service.ts:105]
   ↳ Turns one raw id path into the frames a report can print.
  └─> PathsService.buildFrame(args: { callable: DiscoveredCallable; isCycle: boolean; }): StackFrame [packages/callidescope-graph/src/modules/graph/paths.service.ts:103]
     ↳ Turns one callable into a frame a report can print.
    └─> DocumentationService.read(args: ReadDocumentationArguments): CallableDocumentation | undefined [packages/callidescope-graph/src/modules/documentation/documentation.service.ts:78]
       ↳ Reads the documentation comment, if the callable has one.
      └─> DocumentationService.readSymbol(args: ReadDocumentationArguments): ts.Symbol | undefined [packages/callidescope-graph/src/modules/documentation/documentation.service.ts:51]
         ↳ Resolves the symbol a declaration's documentation hangs off.
```

**3. `CallSitesService.visit`** — depth 3 · orphan-root

```text
🚀 CallSitesService.visit(node: ts.Node): void [packages/callidescope-graph/src/modules/edges/call-sites.service.ts:62]
  └─> CallSitesService.readFunctionArguments(expression: ts.CallExpression | ts.NewExpression): ts.SignatureDeclaration[] [packages/callidescope-graph/src/modules/edges/call-sites.service.ts:42]
     ↳ Collects the function literals passed as arguments to one call.
    └─> CallSitesService.filter(…)(argument: ts.Expression): argument is ts.Expression & ts.SignatureDeclaration [packages/callidescope-graph/src/modules/edges/call-sites.service.ts:46]
```

<details>
<summary>3 more call stacks</summary>

**4. `WorkspaceService.isExcluded`** — depth 2 · orphan-root

```text
🚀 WorkspaceService.isExcluded(workspaceRelativePath: string): boolean [packages/callidescope-graph/src/modules/workspace/workspace.service.ts:187]
  └─> WorkspaceService.some(…)(glob: string): boolean [packages/callidescope-graph/src/modules/workspace/workspace.service.ts:189]
```

**5. `ClassesService.readMemberDeclarations`** — depth 2 · orphan-root

```text
🚀 ClassesService.readMemberDeclarations(…): Declaration[] [packages/callidescope-graph/src/modules/classes/classes.service.ts:149]
   ↳ Reads one member's concrete declarations off a candidate class.
  └─> ClassesService.filter(…)(member: ts.PropertyDeclaration | ts.MethodDeclaration): boolean [packages/callidescope-graph/src/modules/classes/classes.service.ts:163]
```

**6. `EdgesService.resolveCallableId`** — depth 2 · orphan-root

```text
🚀 EdgesService.resolveCallableId(…): string | undefined [packages/callidescope-graph/src/modules/edges/edges.service.ts:202]
   ↳ Maps a resolved declaration to the callable it belongs to.
  └─> WorkspaceService.toWorkspaceRelative(args: { absolutePath: string; workspaceRoot: string; }): string [packages/callidescope-graph/src/modules/workspace/workspace.service.ts:294]
     ↳ Rewrites an absolute path as workspace-relative with POSIX separators.
```

</details>

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `CallablesService.describe` | 9 | `CallableIdentityService.readDisplayName`, `CallableIdentityService.readEnclosingTypeName`, `CallableIdentityService.buildId`, `CallableIdentityService.isExported`, `CallableIdentityService.readKind`, `CallableIdentityService.readLocation`, `CallableIdentityService.readMemberName`, `WorkspaceService.resolveModuleId`, `CallableIdentityService.countStatements` | `packages/callidescope-graph/src/modules/callables/callables.service.ts:116` |
| `EdgesService.buildSiteEdges` | 7 | `EdgesService.collectCallbackEdges`, `EdgesService.resolveSite`, `EdgesService.filter(…)`, `EdgesService.filter(…)`, `EdgesService.map(…)`, `EdgesService.filter(…)`, `EdgesService.readLocation` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:59` |
| `SymbolResolutionService.resolveSymbol` | 6 | `SymbolResolutionService.unwrapAlias`, `SymbolResolutionService.every(…)`, `SymbolResolutionService.readBodied`, `SymbolResolutionService.readResolution`, `SymbolResolutionService.find(…)`, `SymbolResolutionService.resolveThroughHierarchy` | `packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:165` |

<details>
<summary>72 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GraphAssemblyService.assemble` | 6 | `GraphService.assemble`, `EdgesService.build`, `ComponentsService.condense`, `GraphAssemblyService.map(…)`, `BreadthService.measure`, `GraphDepthService.measure` | `packages/callidescope-graph/src/modules/graph/graph-assembly.service.ts:44` |
| `AddressService.resolve` | 4 | `AddressService.parseAddress`, `AddressService.describeInvalidAddress`, `AddressService.findMatches`, `AddressService.toCandidates` | `packages/callidescope-graph/src/modules/callables/address.service.ts:138` |
| `ClassesService.resolveImplementations` | 4 | `ClassesService.collectDerived`, `ClassesService.filter(…)`, `ClassesService.filterAssignable`, `ClassesService.flatMap(…)` | `packages/callidescope-graph/src/modules/classes/classes.service.ts:207` |
| `CohesionService.findModuleSpreads` | 4 | `CohesionService.isSpreadAllowed`, `CohesionService.readDepth`, `CohesionService.readDirectModuleIds`, `CohesionService.toSorted(…)` | `packages/callidescope-graph/src/modules/cohesion/cohesion.service.ts:202` |
| `DocumentationService.read` | 4 | `DocumentationService.readSymbol`, `DocumentationService.readSummary`, `DocumentationService.filter(…)`, `DocumentationService.map(…)` | `packages/callidescope-graph/src/modules/documentation/documentation.service.ts:78` |
| `WorkspaceService.discoverProjects` | 3 | `WorkspaceService.map(…)`, `WorkspaceService.findAllProjectDirectories`, `WorkspaceService.toSorted(…)` | `packages/callidescope-graph/src/modules/workspace/workspace.service.ts:214` |
| `ProgramService.buildProgram` | 3 | `ProgramService.parseConfiguration`, `CompilerHostService.createHost`, `ProgramService.map(…)` | `packages/callidescope-graph/src/modules/program/program.service.ts:70` |
| `ProgramService.parseConfiguration` | 3 | `ProgramService.readJsonConfigFile(…)`, `ProgramConfigurationError.constructor`, `ProgramService.map(…)` | `packages/callidescope-graph/src/modules/program/program.service.ts:102` |
| `CallablesService.collectFromProgram` | 3 | `CallablesService.readOwnedPath`, `WorkspaceService.isTestFile`, `CallablesService.collectFromFile` | `packages/callidescope-graph/src/modules/callables/callables.service.ts:77` |
| `ClassesService.indexProgram` | 3 | `ExternalService.isExternal`, `ClassesService.indexMembers`, `ClassesService.indexHeritage` | `packages/callidescope-graph/src/modules/classes/classes.service.ts:181` |
| `CohesionService.summarizeTypeDepths` | 3 | `CohesionService.readDepth`, `CohesionService.extendTypeSummary`, `CohesionService.toSorted(…)` | `packages/callidescope-graph/src/modules/cohesion/cohesion.service.ts:256` |
| `EdgesService.collectCallbackEdges` | 3 | `EdgesService.map(…)`, `EdgesService.filter(…)`, `EdgesService.map(…)` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:127` |
| `EntriesService.classify` | 3 | `EntriesService.hasConfiguredDecorator`, `EntriesService.isCommandRunnerMethod`, `EntriesService.isBootstrapFunction` | `packages/callidescope-graph/src/modules/entries/entries.service.ts:49` |
| `ComponentsService.condense` | 3 | `ComponentsService.openNode`, `ComponentsService.step`, `ComponentsService.buildSuccessors` | `packages/callidescope-graph/src/modules/graph/components.service.ts:183` |
| `GraphDepthService.measure` | 3 | `GraphDepthService.combine`, `GraphDepthService.readOwnModules`, `GraphDepthService.hasUnresolved` | `packages/callidescope-graph/src/modules/graph/graph-depth.service.ts:132` |
| `AddressService.parseAddress` | 2 | `AddressService.parseSymbolPath`, `AddressService.toWorkspaceRelative` | `packages/callidescope-graph/src/modules/callables/address.service.ts:70` |
| `CallableIdentityService.readDisplayName` | 2 | `CallableIdentityService.readMemberName`, `CallableIdentityService.readEnclosingTypeName` | `packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:117` |
| `CallableIdentityService.readMemberName` | 2 | `CallableIdentityService.readBindingName`, `CallableIdentityService.describeCallbackArgument` | `packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:179` |
| `WorkspaceService.findProjectDirectories` | 2 | `WorkspaceService.toWorkspaceRelative`, `WorkspaceService.isExcludedFromScan` | `packages/callidescope-graph/src/modules/workspace/workspace.service.ts:76` |
| `ProgramService.buildPrograms` | 2 | `ProgramService.buildProgram`, `ProgramService.assignOwnership` | `packages/callidescope-graph/src/modules/program/program.service.ts:138` |
| `CallablesService.visit` | 2 | `CallablesService.isCallableDeclaration`, `CallablesService.describe` | `packages/callidescope-graph/src/modules/callables/callables.service.ts:49` |
| `CallablesService.readOwnedPath` | 2 | `ProgramService.toRealPath`, `WorkspaceService.toWorkspaceRelative` | `packages/callidescope-graph/src/modules/callables/callables.service.ts:162` |
| `ClassesService.readMemberDeclarations` | 2 | `ClassesService.filter(…)`, `ClassesService.filter(…)` | `packages/callidescope-graph/src/modules/classes/classes.service.ts:149` |
| `CohesionService.findMisplacedCallables` | 2 | `CohesionService.readCallerDistribution`, `CohesionService.toSorted(…)` | `packages/callidescope-graph/src/modules/cohesion/cohesion.service.ts:161` |
| `CallSitesService.visit` | 2 | `CallSitesService.isNestedBody`, `CallSitesService.readFunctionArguments` | `packages/callidescope-graph/src/modules/edges/call-sites.service.ts:62` |
| `SymbolResolutionService.resolveThroughHierarchy` | 2 | `SymbolResolutionService.readOwner`, `ClassesService.resolveImplementations` | `packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:217` |
| `SymbolResolutionService.resolve` | 2 | `SymbolResolutionService.readCalleeName`, `SymbolResolutionService.resolveSymbol` | `packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:267` |
| `EdgesService.readLocation` | 2 | `WorkspaceService.toWorkspaceRelative`, `ProgramService.toRealPath` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:176` |
| `EdgesService.resolveCallableId` | 2 | `WorkspaceService.toWorkspaceRelative`, `ProgramService.toRealPath` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:202` |
| `EdgesService.resolveSite` | 2 | `SymbolResolutionService.resolveConstructor`, `SymbolResolutionService.resolve` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:226` |
| `EdgesService.build` | 2 | `CallSitesService.collect`, `EdgesService.buildSiteEdges` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:251` |
| `EntriesService.hasConfiguredDecorator` | 2 | `EntriesService.some(…)`, `EntriesService.readDecoratorNames` | `packages/callidescope-graph/src/modules/entries/entries.service.ts:85` |
| `PathsService.buildDeepestPath` | 2 | `PathsService.orderMembers`, `PathsService.buildFrame` | `packages/callidescope-graph/src/modules/graph/paths.service.ts:59` |
| `PathsService.buildFrame` | 2 | `DocumentationService.read`, `SignaturesService.read` | `packages/callidescope-graph/src/modules/graph/paths.service.ts:103` |
| `AddressDepthService.toStack` | 2 | `PathsService.buildFrame`, `AddressDepthService.isLowerBound` | `packages/callidescope-graph/src/modules/graph/address-depth.service.ts:105` |
| `AddressDepthService.buildDownwardStacks` | 2 | `AddressDepthService.traverse`, `AddressDepthService.map(…)` | `packages/callidescope-graph/src/modules/graph/address-depth.service.ts:172` |
| `AddressDepthService.buildUpwardStacks` | 2 | `AddressDepthService.traverse`, `AddressDepthService.map(…)` | `packages/callidescope-graph/src/modules/graph/address-depth.service.ts:195` |
| `ComponentsService.finishFrame` | 2 | `ComponentsService.closeNode`, `ComponentsService.liftLowLink` | `packages/callidescope-graph/src/modules/graph/components.service.ts:72` |
| `ComponentsService.step` | 2 | `ComponentsService.finishFrame`, `ComponentsService.visitSuccessor` | `packages/callidescope-graph/src/modules/graph/components.service.ts:116` |
| `ComponentsService.visitSuccessor` | 2 | `ComponentsService.openNode`, `ComponentsService.liftLowLink` | `packages/callidescope-graph/src/modules/graph/components.service.ts:139` |
| `GraphService.assemble` | 2 | `GraphService.append`, `GraphService.map(…)` | `packages/callidescope-graph/src/modules/graph/graph.service.ts:44` |
| `AddressService.toCandidates` | 1 | `AddressService.map(…)` | `packages/callidescope-graph/src/modules/callables/address.service.ts:113` |
| `CallableIdentityService.readEnclosingTypeName` | 1 | `CallableIdentityService.findAncestor(…)` | `packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:125` |
| `CallableIdentityService.readKind` | 1 | `CallableIdentityService.readBoundKind` | `packages/callidescope-graph/src/modules/callables/callable-identity.service.ts:138` |
| `WorkspaceService.findAllProjectDirectories` | 1 | `WorkspaceService.findProjectDirectories` | `packages/callidescope-graph/src/modules/workspace/workspace.service.ts:54` |
| `WorkspaceService.buildFileFilter` | 1 | `WorkspaceService.listIgnoredFiles` | `packages/callidescope-graph/src/modules/workspace/workspace.service.ts:163` |
| `WorkspaceService.isExcluded` | 1 | `WorkspaceService.some(…)` | `packages/callidescope-graph/src/modules/workspace/workspace.service.ts:187` |
| `CompilerHostService.resolveModuleCache` | 1 | `CompilerHostService.createModuleResolutionCache(…)` | `packages/callidescope-graph/src/modules/program/compiler-host.service.ts:40` |
| `CompilerHostService.createHost` | 1 | `CompilerHostService.resolveModuleCache` | `packages/callidescope-graph/src/modules/program/compiler-host.service.ts:76` |
| `CallablesService.collect` | 1 | `CallablesService.collectFromProgram` | `packages/callidescope-graph/src/modules/callables/callables.service.ts:189` |
| `ExternalService.isExternal` | 1 | `ExternalService.computeVerdict` | `packages/callidescope-graph/src/modules/classes/external.service.ts:64` |
| `ClassesService.filterAssignable` | 1 | `ClassesService.filter(…)` | `packages/callidescope-graph/src/modules/classes/classes.service.ts:87` |
| `ClassesService.build` | 1 | `ClassesService.indexProgram` | `packages/callidescope-graph/src/modules/classes/classes.service.ts:172` |
| `CohesionService.isSpreadAllowed` | 1 | `CohesionService.some(…)` | `packages/callidescope-graph/src/modules/cohesion/cohesion.service.ts:64` |
| `CallSitesService.readFunctionArguments` | 1 | `CallSitesService.filter(…)` | `packages/callidescope-graph/src/modules/edges/call-sites.service.ts:42` |
| `SymbolResolutionService.readBodied` | 1 | `SymbolResolutionService.filter(…)` | `packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:88` |
| `SymbolResolutionService.filter(…)` | 1 | `SymbolResolutionService.isBodyCarrying` | `packages/callidescope-graph/src/modules/edges/symbol-resolution.service.ts:91` |
| `EdgesService.filter(…)` | 1 | `ExternalService.isExternal` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:77` |
| `EdgesService.filter(…)` | 1 | `EdgesService.isIgnoredCallee` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:89` |
| `EdgesService.map(…)` | 1 | `EdgesService.readLocation` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:142` |
| `EdgesService.isIgnoredCallee` | 1 | `EdgesService.some(…)` | `packages/callidescope-graph/src/modules/edges/edges.service.ts:162` |
| `EntriesService.isCommandRunnerMethod` | 1 | `EntriesService.hasConfiguredDecorator` | `packages/callidescope-graph/src/modules/entries/entries.service.ts:103` |
| `EntriesService.readDecoratorNames` | 1 | `EntriesService.map(…)` | `packages/callidescope-graph/src/modules/entries/entries.service.ts:121` |
| `EntriesService.resolve` | 1 | `EntriesService.classify` | `packages/callidescope-graph/src/modules/entries/entries.service.ts:139` |
| `SignaturesService.read` | 1 | `SignaturesService.map(…)` | `packages/callidescope-graph/src/modules/signatures/signatures.service.ts:65` |
| `AddressDepthService.isLowerBound` | 1 | `AddressDepthService.some(…)` | `packages/callidescope-graph/src/modules/graph/address-depth.service.ts:71` |
| `AddressDepthService.step` | 1 | `AddressDepthService.follow` | `packages/callidescope-graph/src/modules/graph/address-depth.service.ts:79` |
| `AddressDepthService.traverse` | 1 | `AddressDepthService.step` | `packages/callidescope-graph/src/modules/graph/address-depth.service.ts:143` |
| `BreadthService.describeDirectCalls` | 1 | `BreadthService.toReferences` | `packages/callidescope-graph/src/modules/graph/breadth.service.ts:59` |
| `ComponentsService.buildSuccessors` | 1 | `ComponentsService.map(…)` | `packages/callidescope-graph/src/modules/graph/components.service.ts:160` |
| `GraphDepthService.combine` | 1 | `GraphDepthService.foldSuccessors` | `packages/callidescope-graph/src/modules/graph/graph-depth.service.ts:34` |
| `GraphDepthService.hasUnresolved` | 1 | `GraphDepthService.some(…)` | `packages/callidescope-graph/src/modules/graph/graph-depth.service.ts:102` |

</details>

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/JimmyPaolini/codebase/tree/main/packages/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx" -->
```mermaid
graph LR
  callidescope_cli["callidescope-cli"]
  callidescope_configuration["callidescope-configuration"]
  callidescope_graph["callidescope-graph"]
  callidescope_nx["callidescope-nx"]
  callidescope_output["callidescope-output"]
  logger["logger"]
  callidescope_cli --> callidescope_graph
  callidescope_graph --> callidescope_configuration
  callidescope_graph --> logger
  callidescope_nx --> callidescope_graph
  callidescope_output --> callidescope_graph
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class callidescope_graph subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  CallablesModule
  ClassesModule
  CohesionModule
  DocumentationModule
  EdgesModule
  EntriesModule
  GraphModule
  LoggerModule([LoggerModule])
  ProgramModule
  SignaturesModule
  WorkspaceModule
  CallablesModule --> ProgramModule
  CallablesModule --> WorkspaceModule
  EdgesModule --> CallablesModule
  EdgesModule --> ClassesModule
  EdgesModule --> ProgramModule
  EdgesModule --> WorkspaceModule
  GraphModule --> DocumentationModule
  GraphModule --> EdgesModule
  GraphModule --> SignaturesModule
  ProgramModule --> WorkspaceModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_callables_address_constants_ts["src/modules/callables/address.constants.ts"]
  file_src_modules_callables_address_service_ts["src/modules/callables/address.service.ts"]
  file_src_modules_callables_address_service_unit_test_ts["src/modules/callables/address.service.unit.test.ts"]
  file_src_modules_callables_address_types_ts["src/modules/callables/address.types.ts"]
  file_src_modules_callables_callable_identity_service_ts["src/modules/callables/callable-identity.service.ts"]
  file_src_modules_callables_callable_identity_service_unit_test_ts["src/modules/callables/callable-identity.service.unit.test.ts"]
  file_src_modules_callables_callables_constants_ts["src/modules/callables/callables.constants.ts"]
  file_src_modules_callables_callables_module_ts["src/modules/callables/callables.module.ts"]
  file_src_modules_callables_callables_service_ts["src/modules/callables/callables.service.ts"]
  file_src_modules_callables_callables_service_unit_test_ts["src/modules/callables/callables.service.unit.test.ts"]
  file_src_modules_callables_callables_types_ts["src/modules/callables/callables.types.ts"]
  file_src_modules_classes_classes_constants_ts["src/modules/classes/classes.constants.ts"]
  file_src_modules_classes_classes_module_ts["src/modules/classes/classes.module.ts"]
  file_src_modules_classes_classes_service_ts["src/modules/classes/classes.service.ts"]
  file_src_modules_classes_classes_service_unit_test_ts["src/modules/classes/classes.service.unit.test.ts"]
  file_src_modules_classes_classes_types_ts["src/modules/classes/classes.types.ts"]
  file_src_modules_classes_external_service_ts["src/modules/classes/external.service.ts"]
  file_src_modules_classes_external_service_unit_test_ts["src/modules/classes/external.service.unit.test.ts"]
  file_src_modules_cohesion_cohesion_constants_ts["src/modules/cohesion/cohesion.constants.ts"]
  file_src_modules_cohesion_cohesion_module_ts["src/modules/cohesion/cohesion.module.ts"]
  file_src_modules_cohesion_cohesion_service_ts["src/modules/cohesion/cohesion.service.ts"]
  file_src_modules_cohesion_cohesion_service_unit_test_ts["src/modules/cohesion/cohesion.service.unit.test.ts"]
  file_src_modules_cohesion_cohesion_types_ts["src/modules/cohesion/cohesion.types.ts"]
  file_src_modules_documentation_documentation_constants_ts["src/modules/documentation/documentation.constants.ts"]
  file_src_modules_documentation_documentation_module_ts["src/modules/documentation/documentation.module.ts"]
  file_src_modules_documentation_documentation_service_ts["src/modules/documentation/documentation.service.ts"]
  file_src_modules_documentation_documentation_service_unit_test_ts["src/modules/documentation/documentation.service.unit.test.ts"]
  file_src_modules_documentation_documentation_types_ts["src/modules/documentation/documentation.types.ts"]
  file_src_modules_edges_call_sites_service_ts["src/modules/edges/call-sites.service.ts"]
  file_src_modules_edges_call_sites_service_unit_test_ts["src/modules/edges/call-sites.service.unit.test.ts"]
  file_src_modules_edges_edges_constants_ts["src/modules/edges/edges.constants.ts"]
  file_src_modules_edges_edges_module_ts["src/modules/edges/edges.module.ts"]
  file_src_modules_edges_edges_service_ts["src/modules/edges/edges.service.ts"]
  file_src_modules_edges_edges_service_unit_test_ts["src/modules/edges/edges.service.unit.test.ts"]
  file_src_modules_edges_edges_types_ts["src/modules/edges/edges.types.ts"]
  file_src_modules_edges_symbol_resolution_service_ts["src/modules/edges/symbol-resolution.service.ts"]
  file_src_modules_edges_symbol_resolution_service_unit_test_ts["src/modules/edges/symbol-resolution.service.unit.test.ts"]
  file_src_modules_entries_entries_constants_ts["src/modules/entries/entries.constants.ts"]
  file_src_modules_entries_entries_module_ts["src/modules/entries/entries.module.ts"]
  file_src_modules_entries_entries_service_ts["src/modules/entries/entries.service.ts"]
  file_src_modules_entries_entries_service_unit_test_ts["src/modules/entries/entries.service.unit.test.ts"]
  file_src_modules_entries_entries_types_ts["src/modules/entries/entries.types.ts"]
  file_src_modules_graph_address_depth_constants_ts["src/modules/graph/address-depth.constants.ts"]
  file_src_modules_graph_address_depth_service_ts["src/modules/graph/address-depth.service.ts"]
  file_src_modules_graph_address_depth_service_unit_test_ts["src/modules/graph/address-depth.service.unit.test.ts"]
  file_src_modules_graph_address_depth_types_ts["src/modules/graph/address-depth.types.ts"]
  file_src_modules_graph_breadth_service_ts["src/modules/graph/breadth.service.ts"]
  file_src_modules_graph_breadth_service_unit_test_ts["src/modules/graph/breadth.service.unit.test.ts"]
  file_src_modules_graph_components_constants_ts["src/modules/graph/components.constants.ts"]
  file_src_modules_graph_components_service_ts["src/modules/graph/components.service.ts"]
  file_src_modules_graph_components_service_unit_test_ts["src/modules/graph/components.service.unit.test.ts"]
  file_src_modules_graph_components_types_ts["src/modules/graph/components.types.ts"]
  file_src_modules_graph_graph_assembly_service_ts["src/modules/graph/graph-assembly.service.ts"]
  file_src_modules_graph_graph_assembly_service_unit_test_ts["src/modules/graph/graph-assembly.service.unit.test.ts"]
  file_src_modules_graph_graph_assembly_types_ts["src/modules/graph/graph-assembly.types.ts"]
  file_src_modules_graph_graph_depth_service_ts["src/modules/graph/graph-depth.service.ts"]
  file_src_modules_graph_graph_depth_service_unit_test_ts["src/modules/graph/graph-depth.service.unit.test.ts"]
  file_src_modules_graph_graph_constants_ts["src/modules/graph/graph.constants.ts"]
  file_src_modules_graph_graph_module_ts["src/modules/graph/graph.module.ts"]
  file_src_modules_graph_graph_service_ts["src/modules/graph/graph.service.ts"]
  file_src_modules_graph_graph_service_unit_test_ts["src/modules/graph/graph.service.unit.test.ts"]
  file_src_modules_graph_graph_types_ts["src/modules/graph/graph.types.ts"]
  file_src_modules_graph_paths_service_ts["src/modules/graph/paths.service.ts"]
  file_src_modules_graph_paths_service_unit_test_ts["src/modules/graph/paths.service.unit.test.ts"]
  file_src_modules_program_compiler_host_service_ts["src/modules/program/compiler-host.service.ts"]
  file_src_modules_program_compiler_host_service_unit_test_ts["src/modules/program/compiler-host.service.unit.test.ts"]
  file_src_modules_program_program_constants_ts["src/modules/program/program.constants.ts"]
  file_src_modules_program_program_errors_ts["src/modules/program/program.errors.ts"]
  file_src_modules_program_program_module_ts["src/modules/program/program.module.ts"]
  file_src_modules_program_program_service_ts["src/modules/program/program.service.ts"]
  file_src_modules_program_program_service_unit_test_ts["src/modules/program/program.service.unit.test.ts"]
  file_src_modules_program_program_types_ts["src/modules/program/program.types.ts"]
  file_src_modules_signatures_signatures_constants_ts["src/modules/signatures/signatures.constants.ts"]
  file_src_modules_signatures_signatures_module_ts["src/modules/signatures/signatures.module.ts"]
  file_src_modules_signatures_signatures_service_ts["src/modules/signatures/signatures.service.ts"]
  file_src_modules_signatures_signatures_service_unit_test_ts["src/modules/signatures/signatures.service.unit.test.ts"]
  file_src_modules_signatures_signatures_types_ts["src/modules/signatures/signatures.types.ts"]
  file_src_modules_workspace_workspace_constants_ts["src/modules/workspace/workspace.constants.ts"]
  file_src_modules_workspace_workspace_module_ts["src/modules/workspace/workspace.module.ts"]
  file_src_modules_workspace_workspace_service_ts["src/modules/workspace/workspace.service.ts"]
  file_src_modules_workspace_workspace_service_unit_test_ts["src/modules/workspace/workspace.service.unit.test.ts"]
  file_src_modules_workspace_workspace_types_ts["src/modules/workspace/workspace.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_modules_ts["testing/modules.ts"]
  file_testing_programs_ts["testing/programs.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_callables_address_service_ts --> file_src_modules_callables_address_constants_ts
  file_src_modules_callables_address_service_ts --> file_src_modules_callables_address_types_ts
  file_src_modules_callables_address_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_callables_address_service_unit_test_ts --> file_src_modules_callables_address_service_ts
  file_src_modules_callables_address_service_unit_test_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_callables_address_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_callables_address_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_callables_address_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_callables_callable_identity_service_ts --> file_src_modules_callables_callables_constants_ts
  file_src_modules_callables_callable_identity_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_callables_callable_identity_service_unit_test_ts --> file_src_modules_callables_callable_identity_service_ts
  file_src_modules_callables_callable_identity_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_callables_callable_identity_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_callables_callables_module_ts --> file_src_modules_callables_address_service_ts
  file_src_modules_callables_callables_module_ts --> file_src_modules_callables_callable_identity_service_ts
  file_src_modules_callables_callables_module_ts --> file_src_modules_callables_callables_service_ts
  file_src_modules_callables_callables_module_ts --> file_src_modules_program_program_module_ts
  file_src_modules_callables_callables_module_ts --> file_src_modules_workspace_workspace_module_ts
  file_src_modules_callables_callables_service_ts --> file_src_modules_callables_callable_identity_service_ts
  file_src_modules_callables_callables_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_callables_callables_service_ts --> file_src_modules_program_program_service_ts
  file_src_modules_callables_callables_service_ts --> file_src_modules_program_program_types_ts
  file_src_modules_callables_callables_service_ts --> file_src_modules_workspace_workspace_service_ts
  file_src_modules_callables_callables_service_unit_test_ts --> file_src_modules_callables_callables_service_ts
  file_src_modules_callables_callables_service_unit_test_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_callables_callables_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_callables_callables_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_callables_callables_types_ts --> file_src_modules_program_program_types_ts
  file_src_modules_callables_callables_types_ts --> file_src_modules_workspace_workspace_types_ts
  file_src_modules_classes_classes_module_ts --> file_src_modules_classes_classes_service_ts
  file_src_modules_classes_classes_module_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_classes_classes_service_ts --> file_src_modules_classes_classes_types_ts
  file_src_modules_classes_classes_service_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_classes_classes_service_ts --> file_src_modules_program_program_types_ts
  file_src_modules_classes_classes_service_unit_test_ts --> file_src_modules_classes_classes_service_ts
  file_src_modules_classes_classes_service_unit_test_ts --> file_src_modules_classes_classes_types_ts
  file_src_modules_classes_classes_service_unit_test_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_classes_classes_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_classes_classes_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_classes_classes_types_ts --> file_src_modules_program_program_types_ts
  file_src_modules_classes_external_service_unit_test_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_classes_external_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_cohesion_cohesion_module_ts --> file_src_modules_cohesion_cohesion_service_ts
  file_src_modules_cohesion_cohesion_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_cohesion_cohesion_service_ts --> file_src_modules_cohesion_cohesion_types_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_src_modules_cohesion_cohesion_service_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_src_modules_cohesion_cohesion_types_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_src_modules_graph_graph_depth_service_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_cohesion_cohesion_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_cohesion_cohesion_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_cohesion_cohesion_types_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_documentation_documentation_module_ts --> file_src_modules_documentation_documentation_service_ts
  file_src_modules_documentation_documentation_service_ts --> file_src_modules_documentation_documentation_constants_ts
  file_src_modules_documentation_documentation_service_ts --> file_src_modules_documentation_documentation_types_ts
  file_src_modules_documentation_documentation_service_unit_test_ts --> file_src_modules_documentation_documentation_service_ts
  file_src_modules_documentation_documentation_service_unit_test_ts --> file_src_modules_documentation_documentation_types_ts
  file_src_modules_documentation_documentation_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_documentation_documentation_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_documentation_documentation_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_edges_call_sites_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_edges_call_sites_service_ts --> file_src_modules_edges_edges_types_ts
  file_src_modules_edges_call_sites_service_unit_test_ts --> file_src_modules_edges_call_sites_service_ts
  file_src_modules_edges_call_sites_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_edges_call_sites_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_edges_edges_constants_ts --> file_src_modules_edges_edges_types_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_callables_callables_module_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_classes_classes_module_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_edges_call_sites_service_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_edges_edges_service_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_edges_symbol_resolution_service_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_program_program_module_ts
  file_src_modules_edges_edges_module_ts --> file_src_modules_workspace_workspace_module_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_edges_call_sites_service_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_edges_edges_types_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_edges_symbol_resolution_service_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_program_program_service_ts
  file_src_modules_edges_edges_service_ts --> file_src_modules_workspace_workspace_service_ts
  file_src_modules_edges_edges_service_unit_test_ts --> file_src_modules_edges_call_sites_service_ts
  file_src_modules_edges_edges_service_unit_test_ts --> file_src_modules_edges_edges_service_ts
  file_src_modules_edges_edges_service_unit_test_ts --> file_src_modules_edges_symbol_resolution_service_ts
  file_src_modules_edges_edges_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_edges_edges_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_edges_edges_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_edges_symbol_resolution_service_ts --> file_src_modules_classes_classes_service_ts
  file_src_modules_edges_symbol_resolution_service_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_edges_symbol_resolution_service_ts --> file_src_modules_edges_edges_constants_ts
  file_src_modules_edges_symbol_resolution_service_ts --> file_src_modules_edges_edges_types_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_src_modules_classes_classes_service_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_src_modules_classes_external_service_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_src_modules_edges_edges_constants_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_src_modules_edges_edges_types_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_src_modules_edges_symbol_resolution_service_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_edges_symbol_resolution_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_entries_entries_module_ts --> file_src_modules_entries_entries_service_ts
  file_src_modules_entries_entries_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_entries_entries_service_ts --> file_src_modules_entries_entries_constants_ts
  file_src_modules_entries_entries_service_ts --> file_src_modules_entries_entries_types_ts
  file_src_modules_entries_entries_service_unit_test_ts --> file_src_modules_entries_entries_service_ts
  file_src_modules_entries_entries_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_entries_entries_service_unit_test_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_entries_entries_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_entries_entries_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_entries_entries_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_entries_entries_types_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_address_depth_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_address_depth_service_ts --> file_src_modules_graph_address_depth_constants_ts
  file_src_modules_graph_address_depth_service_ts --> file_src_modules_graph_address_depth_types_ts
  file_src_modules_graph_address_depth_service_ts --> file_src_modules_graph_paths_service_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_src_modules_documentation_documentation_service_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_src_modules_graph_address_depth_service_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_src_modules_graph_paths_service_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_src_modules_signatures_signatures_service_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_graph_address_depth_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_graph_address_depth_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_address_depth_types_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_breadth_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_breadth_service_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_breadth_service_unit_test_ts --> file_src_modules_graph_breadth_service_ts
  file_src_modules_graph_breadth_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_breadth_service_unit_test_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_breadth_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_graph_breadth_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_graph_components_service_ts --> file_src_modules_graph_components_constants_ts
  file_src_modules_graph_components_service_ts --> file_src_modules_graph_components_types_ts
  file_src_modules_graph_components_service_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_components_service_unit_test_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_graph_components_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_components_service_unit_test_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_components_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_graph_graph_assembly_service_ts --> file_src_modules_edges_edges_service_ts
  file_src_modules_graph_graph_assembly_service_ts --> file_src_modules_graph_breadth_service_ts
  file_src_modules_graph_graph_assembly_service_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_graph_graph_assembly_service_ts --> file_src_modules_graph_graph_assembly_types_ts
  file_src_modules_graph_graph_assembly_service_ts --> file_src_modules_graph_graph_depth_service_ts
  file_src_modules_graph_graph_assembly_service_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_src_modules_graph_breadth_service_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_src_modules_graph_graph_assembly_service_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_src_modules_graph_graph_assembly_types_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_src_modules_graph_graph_depth_service_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_graph_graph_assembly_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_graph_graph_assembly_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_graph_assembly_types_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_graph_depth_service_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_graph_depth_service_unit_test_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_graph_graph_depth_service_unit_test_ts --> file_src_modules_graph_graph_depth_service_ts
  file_src_modules_graph_graph_depth_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_graph_depth_service_unit_test_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_graph_depth_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_documentation_documentation_module_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_edges_edges_module_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_address_depth_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_breadth_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_graph_assembly_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_graph_depth_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_graph_paths_service_ts
  file_src_modules_graph_graph_module_ts --> file_src_modules_signatures_signatures_module_ts
  file_src_modules_graph_graph_service_ts --> file_src_modules_edges_edges_types_ts
  file_src_modules_graph_graph_service_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_graph_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_graph_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_graph_paths_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_paths_service_ts --> file_src_modules_documentation_documentation_service_ts
  file_src_modules_graph_paths_service_ts --> file_src_modules_graph_graph_types_ts
  file_src_modules_graph_paths_service_ts --> file_src_modules_signatures_signatures_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_documentation_documentation_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_graph_components_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_graph_graph_depth_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_graph_graph_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_graph_paths_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_src_modules_signatures_signatures_service_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_graph_paths_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_program_compiler_host_service_unit_test_ts --> file_src_modules_program_compiler_host_service_ts
  file_src_modules_program_compiler_host_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_program_program_module_ts --> file_src_modules_program_compiler_host_service_ts
  file_src_modules_program_program_module_ts --> file_src_modules_program_program_service_ts
  file_src_modules_program_program_module_ts --> file_src_modules_workspace_workspace_module_ts
  file_src_modules_program_program_service_ts --> file_src_modules_program_compiler_host_service_ts
  file_src_modules_program_program_service_ts --> file_src_modules_program_program_errors_ts
  file_src_modules_program_program_service_ts --> file_src_modules_program_program_types_ts
  file_src_modules_program_program_service_ts --> file_src_modules_workspace_workspace_types_ts
  file_src_modules_program_program_service_unit_test_ts --> file_src_modules_program_compiler_host_service_ts
  file_src_modules_program_program_service_unit_test_ts --> file_src_modules_program_program_errors_ts
  file_src_modules_program_program_service_unit_test_ts --> file_src_modules_program_program_service_ts
  file_src_modules_program_program_service_unit_test_ts --> file_src_modules_workspace_workspace_types_ts
  file_src_modules_program_program_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_program_program_types_ts --> file_src_modules_workspace_workspace_types_ts
  file_src_modules_signatures_signatures_module_ts --> file_src_modules_signatures_signatures_service_ts
  file_src_modules_signatures_signatures_service_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_signatures_signatures_service_ts --> file_src_modules_signatures_signatures_constants_ts
  file_src_modules_signatures_signatures_service_ts --> file_src_modules_signatures_signatures_types_ts
  file_src_modules_signatures_signatures_service_unit_test_ts --> file_src_modules_signatures_signatures_service_ts
  file_src_modules_signatures_signatures_service_unit_test_ts --> file_src_modules_signatures_signatures_types_ts
  file_src_modules_signatures_signatures_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_signatures_signatures_service_unit_test_ts --> file_testing_programs_ts
  file_src_modules_signatures_signatures_types_ts --> file_src_modules_callables_callables_types_ts
  file_src_modules_workspace_workspace_module_ts --> file_src_modules_workspace_workspace_service_ts
  file_src_modules_workspace_workspace_service_ts --> file_src_modules_workspace_workspace_constants_ts
  file_src_modules_workspace_workspace_service_ts --> file_src_modules_workspace_workspace_types_ts
  file_src_modules_workspace_workspace_service_unit_test_ts --> file_src_modules_workspace_workspace_service_ts
  file_src_modules_workspace_workspace_service_unit_test_ts --> file_src_modules_workspace_workspace_types_ts
  file_src_modules_workspace_workspace_service_unit_test_ts --> file_testing_modules_ts
  file_testing_mocks_ts --> file_src_modules_callables_callables_types_ts
  file_testing_modules_ts --> file_src_modules_callables_callables_module_ts
  file_testing_modules_ts --> file_src_modules_classes_classes_module_ts
  file_testing_modules_ts --> file_src_modules_cohesion_cohesion_module_ts
  file_testing_modules_ts --> file_src_modules_documentation_documentation_module_ts
  file_testing_modules_ts --> file_src_modules_edges_edges_module_ts
  file_testing_modules_ts --> file_src_modules_entries_entries_module_ts
  file_testing_modules_ts --> file_src_modules_graph_graph_module_ts
  file_testing_modules_ts --> file_src_modules_program_program_module_ts
  file_testing_modules_ts --> file_src_modules_signatures_signatures_module_ts
  file_testing_modules_ts --> file_src_modules_workspace_workspace_module_ts
  file_testing_programs_ts --> file_src_modules_callables_callable_identity_service_ts
  file_testing_programs_ts --> file_src_modules_callables_callables_service_ts
  file_testing_programs_ts --> file_src_modules_classes_classes_service_ts
  file_testing_programs_ts --> file_src_modules_classes_external_service_ts
  file_testing_programs_ts --> file_src_modules_edges_call_sites_service_ts
  file_testing_programs_ts --> file_src_modules_edges_edges_service_ts
  file_testing_programs_ts --> file_src_modules_edges_symbol_resolution_service_ts
  file_testing_programs_ts --> file_src_modules_program_compiler_host_service_ts
  file_testing_programs_ts --> file_src_modules_program_program_service_ts
  file_testing_programs_ts --> file_src_modules_program_program_types_ts
  file_testing_programs_ts --> file_src_modules_workspace_workspace_service_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-10659-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-329.24_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-13-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-90-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-48.00_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-90-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-48-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-1-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-32-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-270-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-22-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-12-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-33-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-486-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-170-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-607-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-49-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-652-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-426-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-116-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-488-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-920-475569?style=flat-square)
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

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-133-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-31-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-85-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-69-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-7-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-31-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-120-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-10-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-22-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-13-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-14-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-1-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-22-7c3aed?style=flat-square)
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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-222-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-12-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-45-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-11-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-73-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
