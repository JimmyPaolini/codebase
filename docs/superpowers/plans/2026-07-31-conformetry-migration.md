# Conformetry Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `conformance` with publishable `conformetry` packages, switch to declarative generators, and split validators into pluggable language/content packages.

**Architecture:** Build a runtime-agnostic core package plus an Nx adapter package, then migrate generator and validator behavior into package-level contracts and plugins. Keep repository-specific generator metadata and templates in configuration files so new generators require only schema/templates/config entries. Rewire Nx directly to package exports and remove the old `tools/conformance` integration path.

**Tech Stack:** TypeScript, Nx 23, `@nx/devkit`, Nest Commander (only where still needed), Mustache, Zod, Vitest, pnpm, semantic-release/npm publish config.

## Global Constraints

- Fully switch to `conformetry` naming now; do not retain `conformance` aliases.
- Use npm scope `@jimmypaolini/*` for all publishable conformetry packages.
- Keep declarative repo config in `configuration/conformetry.config.ts`.
- Keep templates in `configuration/conformetry-templates/`.
- Adding a generator must require only schema + templates + config entry.
- Conformetry configuration must support optional pre/post generation hooks.
- `@jimmypaolini/conformetry-core` must not import `@nx/devkit`.
- `@jimmypaolini/conformetry-core` must only operate on filesystem paths and globs, not Nx project metadata filters.
- Scaffold all new conformetry package projects using the new `conformance:nestjs-service-application` generator (then customize per package responsibility).
- Split validators into dedicated packages: `conformetry-typescript`, `conformetry-python`, `conformetry-markdown`, `conformetry-json`, `conformetry-text`.
- Configure npm publishing in this implementation (metadata + CI release wiring + dry-run verification).
- Maintain strict TypeScript, lint, type-coverage, and analyze-code gates for touched projects.

---

### Task 1: Create `nestjs-service-application` generator

**Files:**
- Create: `tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.command.ts`
- Create: `tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.module.ts`
- Create: `tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.constants.ts`
- Create: `tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.types.ts`
- Create: `tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.command.unit.test.ts`
- Create: `tools/conformance/src/modules/nestjs-service-application/schema.json`
- Create: `tools/conformance/src/modules/nestjs-service-application/templates/**`
- Modify: `tools/conformance/src/main.ts`
- Modify: `tools/conformance/src/main.module.ts`
- Modify: `tools/conformance/src/modules/*.ts` exports and registry wiring

**Interfaces:**
- Consumes: the existing `nestjs-command-application` generator structure and template layout.
- Produces:
  - `generateNestjsServiceApplication(_tree: Tree, options?: NestjsServiceApplicationOptions): Promise<GeneratorCallback>`
  - `NestjsServiceApplicationOptions`
  - `NestjsServiceApplicationSubstitutions`

- [ ] **Step 1: Write failing generator test**

```ts
test("scaffolds a NestJS service application without nest-commander bootstrapping", async () => {
  const tree = createWorkspaceTree();
  await generateNestjsServiceApplication(tree, {
    name: "conformetry-core",
    type: "packages",
  });
  expect(tree.read("packages/conformetry-core/src/main.ts", "utf8")).toContain(
    "NestFactory.create",
  );
});
```

- [ ] **Step 2: Run the generator test to verify failure**

```bash
pnpm nx run conformance:test:unit --testFile=tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.command.unit.test.ts
```

Expected: FAIL because generator does not exist yet.

- [ ] **Step 3: Implement the service application generator**

```ts
export async function generateNestjsServiceApplication(
  _tree: Tree,
  options: NestjsServiceApplicationOptions = {},
): Promise<GeneratorCallback> {
  // bootstrap a normal Nest application instead of CommandFactory / nest-commander
}
```

- [ ] **Step 4: Re-run the generator test**

```bash
pnpm nx run conformance:test:unit --testFile=tools/conformance/src/modules/nestjs-service-application/nestjs-service-application.command.unit.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/conformance/src/modules/nestjs-service-application tools/conformance/src/main.ts tools/conformance/src/main.module.ts
git commit -m "feat(conformance): ✨ add nestjs service application generator"
```

### Task 2: Scaffold conformetry packages and workspace projects

**Files:**
- Create: `packages/conformetry-core/**`
- Create: `packages/conformetry-nx/**`
- Create: `packages/conformetry-typescript/**`
- Create: `packages/conformetry-python/**`
- Create: `packages/conformetry-markdown/**`
- Create: `packages/conformetry-json/**`
- Create: `packages/conformetry-text/**`
- Modify: `nx.json`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: the new `nestjs-service-application` generator from Task 1.
- Produces:
  - `conformetry-core` and `conformetry-nx` as command applications
  - validator packages as publishable service applications
  - package entrypoints:
    - `@jimmypaolini/conformetry-core`
    - `@jimmypaolini/conformetry-nx`
    - `@jimmypaolini/conformetry-typescript`
    - `@jimmypaolini/conformetry-python`
    - `@jimmypaolini/conformetry-markdown`
    - `@jimmypaolini/conformetry-json`
    - `@jimmypaolini/conformetry-text`

- [ ] **Step 1: Write failing workspace test/verification**

```bash
pnpm nx show projects | rg conformetry
```

Expected: no conformetry projects yet.

- [ ] **Step 2: Generate package projects with the service application generator**

```bash
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-core
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-nx
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-typescript
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-python
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-markdown
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-json
pnpm nx g conformance:nestjs-service-application --type=packages --name=conformetry-text
```

- [ ] **Step 3: Normalize package names and package metadata**

```json
{
  "name": "@jimmypaolini/conformetry-core",
  "type": "module",
  "version": "0.0.1"
}
```

Repeat for each conformetry package with correct scoped name.

- [ ] **Step 4: Run project discovery check**

```bash
pnpm nx show projects | rg conformetry
```

Expected: all seven conformetry projects listed.

- [ ] **Step 5: Commit**

```bash
git add packages/conformetry-* nx.json pnpm-workspace.yaml
git commit -m "feat(packages): ✨ scaffold conformetry package projects"
```

### Task 3: Implement `conformetry-core` generator contracts and runtime

**Files:**
- Create: `packages/conformetry-core/src/modules/generator/generator.types.ts`
- Create: `packages/conformetry-core/src/modules/generator/generator.service.ts`
- Create: `packages/conformetry-core/src/modules/generator/generator-hook.types.ts`
- Create: `packages/conformetry-core/src/modules/generator/generator-test-runtime.ts`
- Create: `packages/conformetry-core/src/modules/runtime/file-system-adapter.types.ts`
- Create: `packages/conformetry-core/src/modules/runtime/path-matcher.types.ts`
- Create: `packages/conformetry-core/src/modules/runtime/formatter-adapter.types.ts`
- Create: `packages/conformetry-core/src/modules/runtime/template-renderer.service.ts`
- Create: `packages/conformetry-core/src/modules/generator/generator.service.unit.test.ts`
- Modify: `packages/conformetry-core/src/index.ts`

**Interfaces:**
- Consumes: package scaffolding from Task 2.
- Produces:
  - `runGenerator(args: RunGeneratorArguments): Promise<RunGeneratorResult>`
  - `GeneratorDefinition`
  - `GeneratorContext`
  - `GeneratorHookContext`
  - `FileSystemAdapter`
  - `PathMatcher`

- [ ] **Step 1: Write failing runner test**

```ts
test("runs configured generator and writes rendered files", async () => {
  const result = await runGenerator({ /* test adapters + definition */ });
  expect(result.generatedFilePaths).toEqual(["applications/demo/src/modules/user/user.service.ts"]);
});

test("runs pre and post generation hooks", async () => {
  const preGenerationHook = vi.fn();
  const postGenerationHook = vi.fn();
  await runGenerator({
    definition: {
      name: "react-component",
      hooks: { postGenerate: [postGenerationHook], preGenerate: [preGenerationHook] },
      schemaPath: "configuration/conformetry-templates/react-component/schema.json",
      targetPathStrategy: () => "packages/demo/src/components",
      templateDirectoryPath: "configuration/conformetry-templates/react-component/templates",
    },
    options: { name: "user-card" },
    runtime: createGeneratorTestRuntime(),
  });
  expect(preGenerationHook).toHaveBeenCalledTimes(1);
  expect(postGenerationHook).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run core unit test to verify failure**

```bash
pnpm nx run conformetry-core:test:unit
```

Expected: FAIL because runner/contracts are missing.

- [ ] **Step 3: Implement minimal contracts and runner**

```ts
export interface GeneratorHooks {
  postGenerate?: readonly GeneratorHook[];
  preGenerate?: readonly GeneratorHook[];
}

export interface GeneratorDefinition {
  hooks?: GeneratorHooks;
  name: string;
  schemaPath: string;
  templateDirectoryPath: string;
  targetPathStrategy: (context: GeneratorContext) => string;
}

export type GeneratorHook = (context: GeneratorHookContext) => Promise<void> | void;

export async function runGenerator(
  arguments_: RunGeneratorArguments,
): Promise<RunGeneratorResult> {
  // run pre hooks -> validate -> resolve path -> render templates -> write files -> run post hooks
}
```

- [ ] **Step 4: Re-run core unit tests**

```bash
pnpm nx run conformetry-core:test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/conformetry-core
git commit -m "feat(packages): ✨ add conformetry core generator runtime"
```

### Task 4: Add repository declarative config and template relocation

**Files:**
- Create: `configuration/conformetry.config.ts`
- Create: `configuration/conformetry-templates/**` (migrated templates)
- Modify: template references from `tools/conformance/src/modules/*/templates` users
- Create: `configuration/conformetry.config.unit.test.ts` (in appropriate tested package or project)

**Interfaces:**
- Consumes: `GeneratorDefinition` from Task 3.
- Produces:
  - `export const conformetryConfiguration: ConformetryConfiguration`
  - generator definitions keyed by generator name with aliases/schema/template/path strategy/hooks
  - `formatGeneratedFilesWithNx` hook exported from `@jimmypaolini/conformetry-nx`

- [ ] **Step 1: Write failing config loading test**

```ts
test("loads generator definitions from conformetry config", () => {
  expect(conformetryConfiguration.generators["nestjs-service-module"]).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm nx run conformetry-core:test:unit --testFile=conformetry.config.unit.test.ts
```

Expected: FAIL because config file does not exist.

- [ ] **Step 3: Add config file and migrate template roots**

```ts
export const conformetryConfiguration = {
  generators: {
    "nestjs-service-module": {
      aliases: ["nsm"],
      description: "Generate a NestJS service module...",
      hooks: { postGenerate: [formatGeneratedFilesWithNx] },
      schemaPath: "configuration/conformetry-templates/nestjs-service-module/schema.json",
      templateDirectoryPath: "configuration/conformetry-templates/nestjs-service-module/templates",
    },
  },
} as const;
```

- [ ] **Step 4: Re-run targeted tests**

```bash
pnpm nx run conformetry-core:test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add configuration/conformetry.config.ts configuration/conformetry-templates
git commit -m "feat(configuration): ✨ add declarative conformetry generator config"
```

### Task 5: Implement `conformetry-nx` adapter and Nx generator exports

**Files:**
- Create: `packages/conformetry-nx/src/modules/nx-generator/nx-generator-adapter.service.ts`
- Create: `packages/conformetry-nx/src/modules/nx-project/nx-project-metadata-adapter.service.ts`
- Create: `packages/conformetry-nx/src/modules/nx-project/nx-project.types.ts`
- Create: `packages/conformetry-nx/src/modules/config/conformetry-config-loader.service.ts`
- Create: `packages/conformetry-nx/src/modules/nx-generator/generator-factory.service.ts`
- Create: `packages/conformetry-nx/src/modules/formatting/format-generated-files-with-nx.hook.ts`
- Create: `packages/conformetry-nx/generators.json`
- Create: `packages/conformetry-nx/src/index.ts` exports
- Create: `packages/conformetry-nx/src/modules/nx-generator/generator-factory.service.unit.test.ts`
- Create: `packages/conformetry-nx/src/modules/formatting/format-generated-files-with-nx.hook.unit.test.ts`

**Interfaces:**
- Consumes: `runGenerator` from `@jimmypaolini/conformetry-core`, repo config from Task 4.
- Produces:
  - `createNxGeneratorFactory(generatorName: string): (tree: Tree, options?: Record<string, unknown>) => Promise<GeneratorCallback>`
  - `resolveNxProjectMetadata(tree: Tree): NxWorkspaceProjectMetadata[]`
  - `filterProjectsForGenerator(metadata: NxWorkspaceProjectMetadata[], selector: GeneratorProjectSelector): NxWorkspaceProjectMetadata[]`
  - `formatGeneratedFilesWithNx(context: GeneratorHookContext): Promise<void>`

- [ ] **Step 1: Write failing nx factory unit test**

```ts
test("creates Nx generator factory from declarative config entry", async () => {
  const factory = createNxGeneratorFactory("react-component");
  expect(typeof factory).toBe("function");
});
```

- [ ] **Step 2: Run nx package tests to verify failure**

```bash
pnpm nx run conformetry-nx:test:unit
```

Expected: FAIL due to missing factory implementation.

- [ ] **Step 3: Implement adapter + factory + generators manifest**

```ts
export function createNxGeneratorFactory(generatorName: string) {
  return async (tree: Tree, options: Record<string, unknown> = {}) => {
    await runGenerator({ definition: resolveDefinition(generatorName), options, runtime: createNxRuntime(tree) });
    return async () => {};
  };
}
```

- [ ] **Step 4: Re-run nx adapter tests**

```bash
pnpm nx run conformetry-nx:test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/conformetry-nx
git commit -m "feat(packages): ✨ add conformetry nx adapter generators"
```

### Task 6: Implement validator plugin contracts in core

**Files:**
- Create: `packages/conformetry-core/src/modules/validator/validator-plugin.types.ts`
- Create: `packages/conformetry-core/src/modules/validator/validator.service.ts`
- Create: `packages/conformetry-core/src/modules/validator/validator.types.ts`
- Create: `packages/conformetry-core/src/modules/validator/validator.service.unit.test.ts`
- Modify: `packages/conformetry-core/src/index.ts`

**Interfaces:**
- Consumes: runtime adapters from Task 3.
- Produces:
  - `ConformetryValidatorPlugin`
  - `runValidation(arguments_: RunValidationArguments): Promise<ValidationResult>`
  - result JSON contract consumed by Nx task/CLI.

- [ ] **Step 1: Write failing validator runner test**

```ts
test("runs selected plugins and aggregates project rule results", async () => {
  const result = await runValidation({ plugins: [fakePlugin], candidateFilePaths: ["applications/lexico/src/main.ts"] });
  expect(result.passed).toBe(true);
});
```

- [ ] **Step 2: Run core tests to verify failure**

```bash
pnpm nx run conformetry-core:test:unit
```

Expected: FAIL for missing validation runner.

- [ ] **Step 3: Implement plugin contract + runner**

```ts
export interface ConformetryValidatorPlugin {
  name: string;
  fileGlobs: readonly string[];
  run(args: {
    candidateFilePaths: string[];
    fileSystemAdapter: FileSystemAdapter;
  }): Promise<PluginValidationRuleResult[]>;
}
```

- [ ] **Step 4: Re-run core tests**

```bash
pnpm nx run conformetry-core:test:unit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/conformetry-core/src/modules/validator packages/conformetry-core/src/index.ts
git commit -m "feat(packages): ✨ add conformetry core validator plugin runtime"
```

### Task 7: Migrate validator implementations into dedicated plugin packages

**Files:**
- Create/Modify: `packages/conformetry-typescript/src/**`
- Create/Modify: `packages/conformetry-python/src/**`
- Create/Modify: `packages/conformetry-markdown/src/**`
- Create/Modify: `packages/conformetry-json/src/**`
- Create/Modify: `packages/conformetry-text/src/**`
- Source migration references: `tools/conformance/src/modules/validator/**`
- Create: `packages/conformetry-typescript/src/modules/validator/validator.service.unit.test.ts`
- Create: `packages/conformetry-python/src/modules/validator/validator.service.unit.test.ts`
- Create: `packages/conformetry-markdown/src/modules/validator/validator.service.unit.test.ts`
- Create: `packages/conformetry-json/src/modules/validator/validator.service.unit.test.ts`
- Create: `packages/conformetry-text/src/modules/validator/validator.service.unit.test.ts`

**Interfaces:**
- Consumes: `ConformetryValidatorPlugin` from Task 6.
- Produces:
  - `createTypeScriptValidatorPlugin(): ConformetryValidatorPlugin`
  - `createPythonValidatorPlugin(): ConformetryValidatorPlugin`
  - `createMarkdownValidatorPlugin(): ConformetryValidatorPlugin`
  - `createJsonValidatorPlugin(): ConformetryValidatorPlugin`
  - `createTextValidatorPlugin(): ConformetryValidatorPlugin`

- [ ] **Step 1: Write failing tests in each plugin package**

```ts
test("typescript plugin reports conformance violations for missing structural nodes", async () => {
  const plugin = createTypeScriptValidatorPlugin();
  const results = await plugin.run({
    candidateFilePaths: ["packages/example/src/modules/example/example.service.ts"],
    fileSystemAdapter: {
      exists: () => true,
      list: () => [],
      readFile: () => "",
      writeFile: () => undefined,
    },
  });
  expect(results).toHaveLength(1);
});
```

- [ ] **Step 2: Run plugin package tests and confirm failures**

```bash
pnpm nx run-many --target=test:unit --projects=conformetry-typescript,conformetry-python,conformetry-markdown,conformetry-json,conformetry-text
```

Expected: FAIL in all packages before migration.

- [ ] **Step 3: Move validator logic by responsibility into each package**

```ts
export function createMarkdownValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    name: "markdown",
    fileGlobs: ["**/*.md", "**/*.mdx"],
    async run(args) { /* migrated markdown validation logic */ },
  };
}
```

- [ ] **Step 4: Re-run plugin tests**

```bash
pnpm nx run-many --target=test:unit --projects=conformetry-typescript,conformetry-python,conformetry-markdown,conformetry-json,conformetry-text
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/conformetry-typescript packages/conformetry-python packages/conformetry-markdown packages/conformetry-json packages/conformetry-text
git commit -m "feat(packages): ✨ split conformetry validators into plugin packages"
```

### Task 8: Rewire workspace from `conformance` to `conformetry`

**Files:**
- Modify: `AGENTS.md`
- Modify: `nx.json`
- Modify: `package.json` (workspace scripts if needed)
- Modify: docs and references currently pointing to `tools/conformance` and `conformance:*`
- Remove/replace: `tools/conformance/**` project integration paths
- Modify: any `project.json` or command examples referencing `conformance`

**Interfaces:**
- Consumes: Nx adapter exports from Task 5 and plugins from Task 7.
- Produces:
  - `nx g conformetry:<generator>`
  - `conformetry` validation command/task wiring

- [ ] **Step 1: Write failing integration expectation**

```bash
pnpm nx g conformetry:nestjs-service-module --help
```

Expected: command not found before rewiring.

- [ ] **Step 2: Rewire generator registration and task references**

```json
{
  "generators": {
    "nestjs-service-module": {
      "factory": "@jimmypaolini/conformetry-nx#generateNestjsServiceModule",
      "schema": "./configuration/conformetry-templates/nestjs-service-module/schema.json"
    }
  }
}
```

- [ ] **Step 3: Update all docs/commands to conformetry naming**

```bash
pnpm exec rg "conformance" AGENTS.md documentation tools packages nx.json
```

Replace operational references with `conformetry` where in scope.

- [ ] **Step 4: Run integration check**

```bash
pnpm nx g conformetry:nestjs-service-module --help
pnpm nx g conformetry:react-component --help
```

Expected: both commands available and valid.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md nx.json package.json documentation tools
git commit -m "refactor(codebase): ♻️ rewire workspace to conformetry packages"
```

### Task 9: Configure npm publishing for `@jimmypaolini/conformetry-*`

**Files:**
- Modify: each conformetry package `package.json`
- Modify: release workflow config under `.github/workflows/**` (if required)
- Modify: semantic-release configuration files under `configuration/**`
- Create/Modify: release docs describing publish dry-run and scope/token requirements

**Interfaces:**
- Consumes: package outputs from Tasks 1-7.
- Produces:
  - publish-ready metadata (`publishConfig`, `exports`, `files`, `repository`)
  - CI publish dry-run for conformetry packages

- [ ] **Step 1: Write failing publish dry-run check**

```bash
pnpm semantic-release:dry-run
```

Expected: does not yet detect conformetry package release configuration.

- [ ] **Step 2: Add per-package publish metadata**

```json
{
  "name": "@jimmypaolini/conformetry-core",
  "publishConfig": { "access": "public" },
  "files": ["dist", "README.md", "LICENSE"],
  "exports": { ".": "./dist/index.js" }
}
```

- [ ] **Step 3: Add release workflow wiring for conformetry packages**

```yaml
# configure release step to publish changed @jimmypaolini/conformetry-* packages
```

- [ ] **Step 4: Re-run dry-run and targeted checks**

```bash
pnpm semantic-release:dry-run
```

Expected: publish plan includes conformetry packages when changes are present.

- [ ] **Step 5: Commit**

```bash
git add packages/conformetry-*/package.json .github/workflows configuration documentation
git commit -m "build(deployments): 📦 configure npm publishing for conformetry packages"
```

### Task 10: Run validation gates and final cleanup

**Files:**
- Modify: any files needed to resolve test/lint/type issues discovered by gates

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified, passing workspace changes ready for PR.

- [ ] **Step 1: Run targeted unit and integration tests**

```bash
pnpm nx run-many --target=test --projects=conformetry-core,conformetry-nx,conformetry-typescript,conformetry-python,conformetry-markdown,conformetry-json,conformetry-text
```

- [ ] **Step 2: Run typecheck and type-coverage on touched TypeScript conformetry projects**

```bash
pnpm nx run-many --target=typecheck --projects=conformetry-core,conformetry-nx,conformetry-typescript,conformetry-markdown,conformetry-json,conformetry-text
pnpm nx run-many --target=type-coverage --projects=conformetry-core,conformetry-nx,conformetry-typescript,conformetry-markdown,conformetry-json,conformetry-text
```

- [ ] **Step 3: Run analyze-code write/check**

```bash
pnpm exec nx affected --target=analyze-code --configuration=write --base=main
pnpm exec nx affected --target=analyze-code --configuration=check --base=main
```

- [ ] **Step 4: Verify main user outcomes**

```bash
pnpm nx g conformetry:nestjs-service-module --name=test-module --project=lexico-ingestion
pnpm nx run conformetry:validate -- --projects=lexico-ingestion
```

Expected: generator works from declarative config; validator produces structured results from plugin stack.

- [ ] **Step 5: Commit final fixes**

```bash
git add .
git commit -m "test(codebase): ✅ validate conformetry migration end-to-end"
```

## Self-Review

- **Spec coverage:** plan includes package split, declarative config/templates, generator abstraction, Nx abstraction, validator plugin split, renaming, and publishing setup.
- **Placeholder scan:** no `TBD`, `TODO`, or unresolved interfaces.
- **Type consistency:** produced interfaces in earlier tasks are consumed by later tasks with matching names.
