# 👔 Conformetry

**Scaffold from a template, then hold the result to it.**

Conformetry is a code generation toolchain whose templates keep working after
generation. The same template folder that produces a new module is the
specification that module is later checked against, so scaffolding conventions
and enforcing them are one artifact instead of two that drift apart.

```bash
npm install --save-dev @conformetry/cli
```

```bash
# Scaffold a new module from the `nestjs-service-module` template
conformetry generate --generator nestjs-service-module --name billing

# Check every existing instance still matches the template it came from
conformetry validate
```

## Why

Scaffolding tools stop caring the moment the files are written. A month later
a module has lost its `constants.ts`, a service dropped its section comments,
and nobody notices until someone reads it. Linters can't help — the convention
isn't a rule about syntax, it's a rule about the shape of a template that only
exists in a generator's output directory.

Conformetry closes the loop. Templates are rendered twice: once to create
files, and again — with the same substitutions, by the same renderer — to
compare against the files that already exist. A file that would not be
regenerated the way it is written today is a finding.

Comparison is **structural, not textual**. A TypeScript instance is compared as
a syntax tree, markdown as an mdast tree, Python through Python's own `ast`
module. Reformatting a file, renaming a local, or adding a method does not fail
validation; deleting a required export, dropping a declared file, or losing a
section comment does.

## Install

| Package | Install when |
| ------- | ------------ |
| `@conformetry/cli` | You want the `conformetry` command |
| `@conformetry/nx` | Your workspace is an Nx monorepo |
| `@conformetry/generation` + `@conformetry/validation` | You are embedding conformetry in your own tool |

```bash
npm install --save-dev @conformetry/cli
# or
pnpm add --save-dev @conformetry/cli
```

Node.js 20 or newer. Validating Python or Jupyter instances additionally needs
`python3` on `PATH` — the Python validator compares through the interpreter's
own `ast` module rather than reimplementing a parser.

## Commands

### `conformetry generate`

Renders one generator's template folder into a target directory.

| Flag | Purpose |
| ---- | ------- |
| `--generator <name>` | Which generator from the registry to run. Required |
| `--config [path]` | Configuration file to read. Defaults to `configuration/conformetry.config.ts` |
| `--directory [path]` | Where to write the rendered files |
| `--no-interactive` | Never prompt; fail instead when a required input is missing |

A generator's own inputs are passed as flags alongside these:

```bash
conformetry generate --generator react-component --name search-bar
```

Unknown flags are accepted deliberately. Which inputs exist is not known until
the generator is chosen, so they are matched against that generator's schema
rather than declared ahead of time. This is also why the generator is selected
with `--generator` and not `--name`: almost every generator takes a `name`, and
reserving that flag would leave no way to supply it.

Missing required inputs are prompted for when stdin is a TTY and `CI` is not
`true`. Otherwise the command fails rather than hanging.

### `conformetry templates`

Names every template the loaded configuration declares, with its aliases,
description and folder. Nothing else answers that question: a generator name
guessed at is rejected, and aliases only resolve through the Nx plugin.

| Flag | Purpose |
| ---- | ------- |
| `--config [path]` | Configuration file to read |
| `--instances [globs]` | Comma-separated paths or globs; report only the templates that explain them |
| `--json` | Write the listing as JSON |

With `--instances` it answers the other direction — which templates explain a
given path:

```bash
conformetry templates --instances packages/billing/src/modules/billing
```

```text
  nestjs-service-module (nsm)
    Generate a NestJS service module
    Template: configuration/conformetry-templates/nestjs-service-module
    Instances:
      packages/billing/src/modules/billing 5/5 files 100%
  nestjs-command-module (ncm)
    Generate a NestJS command module
    Template: configuration/conformetry-templates/nestjs-command-module
    Instances:
      packages/billing/src/modules/billing 3/5 files 60%
```

**Every template that explains the path is listed**, because a path can belong
to more than one. Nothing records where an instance came from — attribution is
inferred from how much of a template's structure the path already has — so a
single verdict would hide the tie that makes an ambiguous instance ambiguous.

A bare listing omits the instances; they appear only when you narrow by path, so
the registry stays readable.

### `conformetry instances`

Lists every instance the configured globs find, and which templates explain each
one. The complement of the command above: that one asks what standard a path
answers to, this one asks what generated code exists.

```bash
conformetry instances --templates nestjs-service-module
```

```text
  packages/billing/src/modules/billing
    Templates:
      nestjs-service-module 5/5 files 100%
```

| Flag | Purpose |
| ---- | ------- |
| `--config [path]` | Configuration file to read |
| `--json` | Write the listing as JSON |
| `--templates [names]` | Comma-separated template names; report only the instances they explain |

Each path printed is usable as the `--instances` argument above, so the two
compose without reformatting. `--templates` is how you find every instance a
template change would affect.

Note that instances located by **project tags** rather than globs are invisible
here: tag resolution belongs to the Nx plugin, and the command-line host locates
instances by glob alone.

### `conformetry validate`

Expands the configured instance globs and compares everything it finds against
the template it was generated from.

| Flag | Purpose |
| ---- | ------- |
| `--config [path]` | Configuration file to read |
| `--instances [globs]` | Comma-separated globs to validate, overriding the configuration |
| `--languages [names]` | Comma-separated languages to run — `typescript`, `markdown`, `python`, `json`, `jupyter`, `text` |
| `--threshold [ratio]` | Lowest conformance score an instance may have, 0 to 1. The weakest of the three threshold levels |

Every flag is optional; an absent filter means "everything". The command exits
non-zero when any instance scores below its threshold, which is what makes it
usable as a pre-merge gate.

## Scoring

Validation reports **how much** of its template an instance honours, not just
whether it does. Every template element the comparison weighs is one
requirement, and a missing element costs the whole subtree it stood for — so
deleting a class costs far more than dropping an import, without anyone
maintaining a table of weights.

The same three numbers — met, total, percentage — are reported at every level:

```text
Conformance scores:
  ✗ packages/logger/src/modules/logger (nestjs-service-module) — 149/151 requirements met (98.7%), below threshold 100.0%
  ✗ packages/logger/src/modules/logger/logger (nestjs-service-file) — 108/109 requirements met (99.1%), below threshold 100.0%
  Total — 257/260 requirements met (98.8%) across 2 instance(s), 2 below threshold

  1. file: logger.types.ts — 1/2 requirements met (50.0%)
     Instance: packages/logger/src/modules/logger/logger.types.ts
     Template: configuration/conformetry-templates/nestjs-service-module/{{nameKebabCase}}/{{nameKebabCase}}.types.ts

     1. Missing comment // 🏷️ Types
        Template: Line 1, Column 1
        Expected: `// 🏷️ Types`
        Weight  : 1 of the 2 requirements in this file
        Fix     : Add the comment // 🏷️ Types to the instance file.
```

| Level | Answers |
| ----- | ------- |
| File | How much of _this file_ drifted — a small file can lose half of itself to one finding |
| Instance | Whether this instance clears its threshold; this is the level thresholds apply to |
| Total | How the whole run did, across every instance/template pair |

The fraction is printed alongside the percentage because a percentage hides its
own scale: 99.3% reads the same whether one requirement of 151 went missing or
thirty of four thousand did, and only the first is a five-minute fix.

The total is counted in instance/template pairs rather than files. A file
governed by two templates owes both of them, so its requirements genuinely
count once per template.

A finding that stands in for more than itself says so, which is what tells the
expensive drift from the trivial — a missing class carries the weight of every
member it held.

An instance must score at or above its **threshold** to pass. The default is
`1` — a perfect match, which is what conformetry has always demanded — so
adding scoring changes nothing until a threshold is lowered deliberately.

Three levels set it, narrowest first:

| Level | Where | Applies to |
| ----- | ----- | ---------- |
| Instance group | `instances[].threshold` | Only the paths that group's globs locate |
| Generator | `threshold` on the generator | Every instance of that template |
| Run | `--threshold` | Every instance the run touches |

That is what makes introducing a template bearable. A new template can be
adopted with the directory still being migrated held to `0.75` while every
other instance of it stays strict, instead of having to bring the whole
workspace over in one change.

Findings print either way. A lowered threshold is permission to ship the drift,
not a reason to stop showing it.

Differences are grouped by file and each one carries the location on **both**
sides — where the instance is wrong and where the template says so — plus the
expected value and a concrete fix:

```text
1. file: billing.service.ts
   Instance: packages/billing/src/modules/billing/billing.service.ts
   Template: configuration/conformetry-templates/nestjs-service-module/…

   1. Missing required comment
      Instance: line 24
      Template: line 31
      Expected: `// 🌎 Public Methods`
      Fix     : Add the `// 🌎 Public Methods` section comment above the first public method.
```

The `fix` field is the point of the format: reports are meant to be actionable
by whoever — or whatever — has to make the file conform.

## Configuration

A single `conformetry.config.ts` declares every generator: the template folder
it renders, the inputs it takes, and the paths its output already occupies.

```ts
import { type ConformetryConfiguration } from "@conformetry/configuration";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    aliases: ["nsm"],
    description: "Generate a NestJS service module",
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "nestjs-service-module",
    templatePath: "templates/nestjs-service-module",
  },
];

export default conformetryConfiguration;
```

`instances` is what makes validation possible: it says where this generator's
output already lives, so validation knows what to check without being told
twice. The full field reference — instance groups, tag selectors, input
schemas, discovery, and the supported file formats — is in
[**@conformetry/configuration**](../conformetry-configuration/README.md).

## Templates

A template is an ordinary folder of ordinary files. Both file contents and file
_paths_ are rendered with [mustache](https://mustache.github.io), so a folder
named `{{nameKebabCase}}` becomes `billing` and a file named
`{{namePascalCase}}.tsx` becomes `SearchBar.tsx`:

```text
templates/nestjs-service-module/
└── {{nameKebabCase}}/
    ├── {{nameKebabCase}}.constants.ts
    ├── {{nameKebabCase}}.module.ts
    ├── {{nameKebabCase}}.service.ts
    ├── {{nameKebabCase}}.service.unit.test.ts
    └── {{nameKebabCase}}.types.ts
```

Every generator's `name` input is expanded into four case variants
automatically, so a template never has to case-convert by hand:

| Placeholder | `search bar` becomes |
| ----------- | -------------------- |
| `{{nameCamelCase}}` | `searchBar` |
| `{{nameKebabCase}}` | `search-bar` |
| `{{namePascalCase}}` | `SearchBar` |
| `{{nameSnakeCase}}` | `search_bar` |

An explicit input of the same name always wins over the derived variant. Full
mustache is available — sections, inverted sections, partials — with HTML
escaping disabled so substituted values cannot corrupt source code.

> **Supply every placeholder a template uses.** Mustache renders an unknown
> placeholder as an empty string rather than leaving the token visible, so a
> missing substitution produces a silent hole rather than an error.

## Validators

Which validator handles a file is decided by its extension, and only the
packages a run actually needs are loaded.

| Validator | Extensions | Compares |
| --------- | ---------- | -------- |
| `typescript` | `.ts`, `.tsx` | Syntax tree structure and required section comments |
| `markdown` | `.md` | mdast structure — headings, lists, tables — rather than prose |
| `python` | `.py` | Structure via Python's own `ast` module |
| `json` | `.json`, `.jsonc` | Key structure and values |
| `jupyter` | `.ipynb` | Notebook envelope, delegating cells to the markdown and Python validators |
| `text` | everything else | Duplicate-aware line conformance — the floor, so no extension goes unchecked |

Before any of them runs, every file the template declares is checked to
**exist**. That pass covers extensions no validator claims — `.gitignore`,
`.env.default`, `pyproject.toml` — which would otherwise be deletable without
failing anything. A missing directory is reported once rather than as twenty
missing files.

A template comment containing `TODO` is treated as a prompt rather than text to
copy, so any instance comment satisfies it.

## Nx workspaces

[`@conformetry/nx`](../conformetry-nx/README.md) is a second host over the same
runtime. It adds two things the standalone CLI cannot offer:

- **A `conformetry-validate` target inferred onto every project** that holds
  instances, so validation is cached and participates in `nx affected`.
- **Generators addressed by name** — `nx g conformetry:nestjs-service-module` —
  with Nx prompting for inputs and writing through its virtual `Tree`.

Because which generators exist is a property of _your_ configuration rather
than of the package, the plugin exposing them is emitted at install time rather
than shipped:

```json
{ "scripts": { "postinstall": "conformetry-nx-bootstrap" } }
```

Instance groups may additionally select projects by Nx tag, with their globs
read inside each matching project:

```ts
instances: [{ patterns: ["src/modules/*"], tags: ["framework:nestjs"] }];
```

## Project Graph

Where this project sits in the Nx project graph: what it depends on, and what depends on it. Regenerated by `nx run synchronization:synchronize --configuration=write`.

<!-- nx-project-graph-start -->

```mermaid
flowchart LR
  conformetry_cli["conformetry-cli"]
  conformetry_configuration["conformetry-configuration"]
  conformetry_core["conformetry-core"]
  conformetry_generation["conformetry-generation"]
  conformetry_validation["conformetry-validation"]
  logger["logger"]
  conformetry_cli --> conformetry_configuration
  conformetry_cli --> conformetry_core
  conformetry_cli --> conformetry_generation
  conformetry_cli --> conformetry_validation
  conformetry_cli --> logger
  classDef subject stroke-width:3px
  class conformetry_cli subject
```

<!-- nx-project-graph-end -->

## Module Graph

The modules this project defines and the imports between them, regenerated by `nx run synchronization:synchronize --configuration=write`.

<!-- nestjs-module-graph-start -->

```mermaid
flowchart LR
  subgraph group0["conformetry-cli"]
    GenerateModule
    InstancesModule
    MainModule
    TemplatesModule
    ValidateModule
  end
  subgraph group1["conformetry-configuration"]
    ConfigurationModule
    InputModule
    InstanceDiscoveryModule
    TemplateDiscoveryModule
  end
  subgraph group2["conformetry-core"]
    DifferencesModule
    InventoryModule
    LanguageModule
    ReportingModule
    ScoringModule
  end
  subgraph group3["conformetry-files"]
    FilesModule
  end
  subgraph group4["conformetry-generation"]
    GenerationModule
    RenderingModule
  end
  subgraph group5["conformetry-validation"]
    ValidationModule
  end
  subgraph group6["logger"]
    LoggerModule([LoggerModule])
  end
  ConfigModule([ConfigModule])
  DiscoveryModule
  FilesModule --> DifferencesModule
  FilesModule --> InstanceDiscoveryModule
  GenerateModule --> ConfigurationModule
  GenerateModule --> GenerationModule
  GenerateModule --> InputModule
  GenerationModule --> RenderingModule
  InstanceDiscoveryModule --> RenderingModule
  InstanceDiscoveryModule --> TemplateDiscoveryModule
  InstancesModule --> ConfigurationModule
  InstancesModule --> InputModule
  InstancesModule --> InstanceDiscoveryModule
  InstancesModule --> InventoryModule
  MainModule --> DiscoveryModule
  MainModule --> GenerateModule
  MainModule --> InstancesModule
  MainModule --> TemplatesModule
  MainModule --> ValidateModule
  ReportingModule --> ScoringModule
  TemplateDiscoveryModule --> RenderingModule
  TemplatesModule --> ConfigurationModule
  TemplatesModule --> InputModule
  TemplatesModule --> InstanceDiscoveryModule
  TemplatesModule --> InventoryModule
  ValidateModule --> ConfigurationModule
  ValidateModule --> InputModule
  ValidateModule --> InstanceDiscoveryModule
  ValidateModule --> ReportingModule
  ValidateModule --> TemplateDiscoveryModule
  ValidateModule --> ValidationModule
  ValidationModule --> FilesModule
  ValidationModule --> InstanceDiscoveryModule
  ValidationModule --> LanguageModule
  ValidationModule --> ReportingModule
  ValidationModule --> ScoringModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._

<!-- nestjs-module-graph-end -->

## Packages

Conformetry is deliberately split so that embedding it does not mean depending
on a CLI. `@conformetry/core` is the leaf — it depends on nothing else in the
graph — and every other package declares exactly which siblings it may import.

### Hosts

| Package | Role |
| ------- | ---- |
| [`@conformetry/cli`](README.md) | The `conformetry` command: expands globs, prompts for inputs, prints reports |
| [`@conformetry/nx`](../conformetry-nx/README.md) | Nx plugin: inferred validation targets, tag-scoped instances, emitted generators |

### Runtime

| Package | Role |
| ------- | ---- |
| [`@conformetry/core`](../conformetry-core/README.md) | Structured error shape, the language validator contract, report rendering |
| [`@conformetry/configuration`](../conformetry-configuration/README.md) | Config loading, template discovery, instance matching, input resolution |
| [`@conformetry/generation`](../conformetry-generation/README.md) | Mustache rendering and the generator lifecycle |
| [`@conformetry/validation`](../conformetry-validation/README.md) | Validation orchestration, language routing, finding deduplication |
| [`@conformetry/files`](../conformetry-files/README.md) | Existence checking for every declared file, whatever its extension |

### Languages

| Package | Extensions |
| ------- | ---------- |
| [`@conformetry/typescript`](../conformetry-typescript/README.md) | `.ts`, `.tsx` |
| [`@conformetry/markdown`](../conformetry-markdown/README.md) | `.md` |
| [`@conformetry/python`](../conformetry-python/README.md) | `.py` |
| [`@conformetry/json`](../conformetry-json/README.md) | `.json`, `.jsonc` |
| [`@conformetry/jupyter`](../conformetry-jupyter/README.md) | `.ipynb` |
| [`@conformetry/text`](../conformetry-text/README.md) | the fallback for everything else |

Nothing depends on `@conformetry/cli`. Embedding conformetry means depending on
the runtime packages directly — the CLI is one host among others, and holds no
logic of its own.

## Embedding

Both runtimes are NestJS providers, so a host wires them the way it wires
anything else:

```ts
import { GenerationService } from "@conformetry/generation";

const result = await generationService.runGenerator({
  definition: {
    name: "nestjs-service-module",
    templateDirectoryPath: "templates/nestjs-service-module",
  },
  inputs: { name: "billing" },
  instancePath: "packages/billing/src/modules",
});
```

Filesystem and formatter access go through adapters, which is how
`@conformetry/nx` reuses this runtime unchanged against a virtual `Tree`.
Rendering deliberately is _not_ an adapter: validation must substitute exactly
as generation does, or validation would flag the files the generator itself
produced.

## Start

Run the CLI from source:

```bash
nx run conformetry-cli:start
```

Pass a subcommand and its flags after `--`:

```bash
nx run conformetry-cli:start -- validate --languages typescript
```

## Test

```bash
nx run conformetry-cli:vitest
```

## Build

```bash
nx run conformetry-cli:build
```

## License

MIT — see [LICENSE](../../LICENSE).

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `conformetry-cli`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 38 |
| Files | 23 |
| Calls traced | 50 |
| Call stacks | 22 |
| Deepest stack | 10 |
| Stacks through recursion | 0 |
| Unfollowable calls | 4 |

### Call stacks

**1. `ValidateCommand.run`** — depth ≥ 10 · decorated-method

```text
🚀 ValidateCommand.run(_passedParameters: string[], options: ValidateCommandOptions): Promise<void> [packages/conformetry-cli/src/modules/validate/validate.command.ts:152]
   ↳ Runs validation and reports every difference found.
  └─> ValidationService.validate(args: RunValidationArguments): Promise<RunValidationResult> [packages/conformetry-validation/src/modules/validation/validation.service.ts:134]
     ↳ Validates every instance and returns the differences found.
    └─> InstanceDiscoveryService.matchInstances(…): ResolvedInstances [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:92]
       ↳ Resolves every instance to the template, or templates, that explain it.
      └─> InstanceDiscoveryMatchingService.matchInstances(…): ResolvedInstances [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:93]
         ↳ Resolves every instance to the template — or templates — that explain it.
        └─> InstanceDiscoveryMatchingService.matchTemplates(…): TemplateMatch[] [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:154]
           ↳ Weighs every template that shares at least one file with the instance, best-first.
          └─> InstanceDiscoveryMatchingService.map(…)(…): { matchedFileCount: number; matchRatio: number; template: TemplateDefinition; } [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery-matching.service.ts:160]
            └─> TemplateDiscoveryService.countMatchingFiles(…): number [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:121]
               ↳ Counts how many of a template's files the instance path already has.
              └─> TemplateDiscoveryService.filter(…)(templateFilePath: string): boolean [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:130]
                └─> TemplateDiscoveryService.resolveInstanceFilePath(…): string [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:178]
                   ↳ Maps a template file path to the instance file path it governs.
                  └─> RenderingService.renderPath(args: { substitutions: Substitutions; templatePath: string; }): string [packages/conformetry-generation/src/modules/rendering/rendering.service.ts:80]
                     ↳ Renders a template path with mustache, the same way contents are rendered.
```

**2. `GenerateCommand.run`** — depth ≥ 9 · decorated-method

```text
🚀 GenerateCommand.run(passedParameters: string[], options: GenerateCommandOptions): Promise<void> [packages/conformetry-cli/src/modules/generate/generate.command.ts:108]
   ↳ Resolves the generator's inputs and writes its files.
  └─> InputService.resolveGeneratorInputs(args: ResolveGeneratorInputsArguments): Promise<Record<string, string>> [packages/conformetry-configuration/src/modules/input/input.service.ts:187]
     ↳ Resolves generator inputs from raw command-line arguments.
    └─> InputService.resolveInputs(…): Promise<Record<string, string>> [packages/conformetry-configuration/src/modules/input/input.service.ts:52]
       ↳ Walks a schema, taking each value from the resolver or a prompt.
      └─> InputService.acceptProvidedValue(args: { input: SchemaInput; value: string; }): string [packages/conformetry-configuration/src/modules/input/input.service.ts:38]
         ↳ Validates a value the caller already had, throwing if it is invalid.
        └─> InputSchemaService.validateValue(args: { input: SchemaInput; value: unknown; }): string | true [packages/conformetry-configuration/src/modules/input/input-schema.service.ts:158]
           ↳ Validates a value, returning `true` or the reason it failed.
          └─> InputSchemaService.validateEnum(args: { input: SchemaInput; value: string; }): string | true [packages/conformetry-configuration/src/modules/input/input-schema.service.ts:39]
             ↳ Validates a value against a schema `enum`, when one is declared.
            └─> InputSchemaService.readEnumValues(propertySchema: unknown): string[] [packages/conformetry-configuration/src/modules/input/input-schema.service.ts:123]
               ↳ Reads the string members of a schema `enum`.
              └─> InputSchemaService.readSchemaProperty(propertySchema: unknown, key: string): unknown [packages/conformetry-configuration/src/modules/input/input-schema.service.ts:26]
                 ↳ Reads one property off a schema fragment when it is an object.
                └─> InputSchemaService.find(…)([entryKey]: [string, any]): boolean [packages/conformetry-configuration/src/modules/input/input-schema.service.ts:31]
```

**3. `InstancesCommand.run`** — depth ≥ 7 · decorated-method

```text
🚀 InstancesCommand.run(_passedParameters: string[], options: InstancesCommandOptions): Promise<void> [packages/conformetry-cli/src/modules/instances/instances.command.ts:90]
   ↳ Writes every instance found, filtered to the given templates.
  └─> InstanceDiscoveryService.resolveInventoriedInstances(args: ResolveInventoryArguments): InventoriedInstance[] [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:160]
     ↳ Lists every instance found, paired with the templates that explain it. `templateNames` narrows the pairing rather than…
    └─> InstanceDiscoveryService.takeInventory(…): { templates: TemplateDefinition[]; weighed: { instance: Instance; pairings: InventoriedPairing[]; }[]; } [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:225]
       ↳ Weighs every instance the globs find against every declared template.
      └─> TemplateDiscoveryService.collectTemplates(…): TemplateDefinition[] [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:98]
         ↳ Reads every configured generator's template folder.
        └─> TemplateDiscoveryService.map(…)(generator: ConformetryGeneratorDefinition): TemplateDefinition [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:102]
          └─> TemplateDiscoveryService.collectTemplate(…): TemplateDefinition [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:78]
             ↳ Reads one template folder.
            └─> TemplateDiscoveryService.collectFilePaths(directoryPath: string): string[] [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:38]
               ↳ Lists every file under a directory, recursively and sorted.
```

<details>
<summary>19 more call stacks</summary>

**4. `TemplatesCommand.run`** — depth ≥ 7 · decorated-method

```text
🚀 TemplatesCommand.run(_passedParameters: string[], options: TemplatesCommandOptions): Promise<void> [packages/conformetry-cli/src/modules/templates/templates.command.ts:91]
   ↳ Writes every declared template, filtered to the given instances.
  └─> InstanceDiscoveryService.resolveInventoriedTemplates(args: ResolveInventoryArguments): InventoriedTemplate[] [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:185]
     ↳ Lists every template declared, paired with the instances it explains. `instancePatterns` narrows which instances are…
    └─> InstanceDiscoveryService.takeInventory(…): { templates: TemplateDefinition[]; weighed: { instance: Instance; pairings: InventoriedPairing[]; }[]; } [packages/conformetry-configuration/src/modules/instance-discovery/instance-discovery.service.ts:225]
       ↳ Weighs every instance the globs find against every declared template.
      └─> TemplateDiscoveryService.collectTemplates(…): TemplateDefinition[] [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:98]
         ↳ Reads every configured generator's template folder.
        └─> TemplateDiscoveryService.map(…)(generator: ConformetryGeneratorDefinition): TemplateDefinition [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:102]
          └─> TemplateDiscoveryService.collectTemplate(…): TemplateDefinition [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:78]
             ↳ Reads one template folder.
            └─> TemplateDiscoveryService.collectFilePaths(directoryPath: string): string[] [packages/conformetry-configuration/src/modules/template-discovery/template-discovery.service.ts:38]
               ↳ Lists every file under a directory, recursively and sorted.
```

**5. `errorHandler`** — depth 5 · orphan-root

```text
🚀 errorHandler(error: Error): void [packages/conformetry-cli/src/main.ts:17]
  └─> LoggerService.error(…): void [packages/logger/src/modules/logger/logger.service.ts:206]
     ↳ Logs an error message at the `error` level, optionally including a stack trace. `ConsoleLogger.error` spends a third…
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
         ↳ Fails a malformed message in development, and never in production.
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Whether a word is a verb in one of the two tenses the convention allows.
```

**6. `serviceErrorHandler`** — depth 5 · orphan-root

```text
🚀 serviceErrorHandler(error: Error): void [packages/conformetry-cli/src/main.ts:22]
  └─> LoggerService.error(…): void [packages/logger/src/modules/logger/logger.service.ts:206]
     ↳ Logs an error message at the `error` level, optionally including a stack trace. `ConsoleLogger.error` spends a third…
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logger/src/modules/logger/logger.service.ts:115]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logger/src/modules/logger/logger.service.ts:82]
         ↳ Fails a malformed message in development, and never in production.
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logger/src/modules/logger/logger.service.ts:140]
           ↳ Whether a word is a verb in one of the two tenses the convention allows.
```

**7. `InstancesCommand.parseTemplates`** — depth 3 · decorated-method

```text
🚀 InstancesCommand.parseTemplates(value: string | undefined): string[] | undefined [packages/conformetry-cli/src/modules/instances/instances.command.ts:80]
   ↳ Parses the optional template filter.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:125]
     ↳ Splits a comma-delimited filter option into its values.
    └─> InputService.filter(…)(item: string): boolean [packages/conformetry-configuration/src/modules/input/input.service.ts:135]
```

**8. `TemplatesCommand.parseInstances`** — depth 3 · decorated-method

```text
🚀 TemplatesCommand.parseInstances(value: string | undefined): string[] | undefined [packages/conformetry-cli/src/modules/templates/templates.command.ts:72]
   ↳ Parses the optional instance filter.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:125]
     ↳ Splits a comma-delimited filter option into its values.
    └─> InputService.filter(…)(item: string): boolean [packages/conformetry-configuration/src/modules/input/input.service.ts:135]
```

**9. `ValidateCommand.parseInstances`** — depth 3 · decorated-method

```text
🚀 ValidateCommand.parseInstances(value: string | undefined): string[] | undefined [packages/conformetry-cli/src/modules/validate/validate.command.ts:123]
   ↳ Parses the optional instance glob override.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:125]
     ↳ Splits a comma-delimited filter option into its values.
    └─> InputService.filter(…)(item: string): boolean [packages/conformetry-configuration/src/modules/input/input.service.ts:135]
```

**10. `ValidateCommand.parseLanguages`** — depth 3 · decorated-method

```text
🚀 ValidateCommand.parseLanguages(value: string | undefined): string[] | undefined [packages/conformetry-cli/src/modules/validate/validate.command.ts:133]
   ↳ Parses the optional language filter.
  └─> InputService.parseCommaDelimitedOption(value: string | undefined): string[] | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:125]
     ↳ Splits a comma-delimited filter option into its values.
    └─> InputService.filter(…)(item: string): boolean [packages/conformetry-configuration/src/modules/input/input.service.ts:135]
```

**11. `ValidateCommand.parseThreshold`** — depth 3 · decorated-method

```text
🚀 ValidateCommand.parseThreshold(value: string | undefined): number | undefined [packages/conformetry-cli/src/modules/validate/validate.command.ts:142]
   ↳ Parses the optional run-level conformance threshold.
  └─> InputService.parseThresholdOption(value: string | undefined): number | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:168]
     ↳ Parses a threshold option as a ratio from 0 to 1.
    └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:141]
       ↳ Trims an optional string option, treating blank as absent.
```

**12. `GenerateCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 GenerateCommand.parseConfig(value: string | undefined): string | undefined [packages/conformetry-cli/src/modules/generate/generate.command.ts:68]
   ↳ Parses the optional configuration path.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:141]
     ↳ Trims an optional string option, treating blank as absent.
```

**13. `GenerateCommand.parseDirectory`** — depth 2 · decorated-method

```text
🚀 GenerateCommand.parseDirectory(value: string | undefined): string | undefined [packages/conformetry-cli/src/modules/generate/generate.command.ts:77]
   ↳ Parses the output directory override.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:141]
     ↳ Trims an optional string option, treating blank as absent.
```

**14. `GenerateCommand.parseGenerator`** — depth 2 · decorated-method

```text
🚀 GenerateCommand.parseGenerator(value: string): string [packages/conformetry-cli/src/modules/generate/generate.command.ts:86]
   ↳ Parses the name of the generator to run.
  └─> InputService.parseRequiredOption(args: { optionName: string; value: string; }): string [packages/conformetry-configuration/src/modules/input/input.service.ts:148]
     ↳ Trims a required string option, rejecting blank values.
```

**15. `InstancesCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 InstancesCommand.parseConfig(value: string | undefined): string | undefined [packages/conformetry-cli/src/modules/instances/instances.command.ts:62]
   ↳ Parses the optional configuration path.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:141]
     ↳ Trims an optional string option, treating blank as absent.
```

**16. `TemplatesCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 TemplatesCommand.parseConfig(value: string | undefined): string | undefined [packages/conformetry-cli/src/modules/templates/templates.command.ts:63]
   ↳ Parses the optional configuration path.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:141]
     ↳ Trims an optional string option, treating blank as absent.
```

**17. `ValidateCommand.parseConfig`** — depth 2 · decorated-method

```text
🚀 ValidateCommand.parseConfig(value: string | undefined): string | undefined [packages/conformetry-cli/src/modules/validate/validate.command.ts:114]
   ↳ Parses the optional configuration path.
  └─> InputService.parseOptionalOption(value: string | undefined): string | undefined [packages/conformetry-configuration/src/modules/input/input.service.ts:141]
     ↳ Trims an optional string option, treating blank as absent.
```

**18. `main`** — depth ≥ 2 · module-bootstrap

```text
🚀 main(): Promise<void> [packages/conformetry-cli/src/main.ts:11]
   ↳ Bootstraps the NestJS command application.
  └─> LoggerService.constructor(): LoggerService [packages/logger/src/modules/logger/logger.service.ts:36]
```

**19. `GenerateCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 GenerateCommand.constructor(…): GenerateCommand [packages/conformetry-cli/src/modules/generate/generate.command.ts:34]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**20. `InstancesCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 InstancesCommand.constructor(…): InstancesCommand [packages/conformetry-cli/src/modules/instances/instances.command.ts:42]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**21. `TemplatesCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 TemplatesCommand.constructor(…): TemplatesCommand [packages/conformetry-cli/src/modules/templates/templates.command.ts:43]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

**22. `ValidateCommand.constructor`** — depth ≥ 2 · orphan-root

```text
🚀 ValidateCommand.constructor(…): ValidateCommand [packages/conformetry-cli/src/modules/validate/validate.command.ts:40]
  └─> LoggerService.setContext(context: string): void [packages/logger/src/modules/logger/logger.service.ts:235]
     ↳ Sets the context label included in every subsequent log line.
```

</details>

### Module spread

None.

### Possibly misplaced

None.
<!-- CALL_STACKS_END -->
