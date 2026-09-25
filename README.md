# Codebase v2.23.0

[![Nx](https://img.shields.io/badge/Nx-Codebase-143055?logo=nx)](https://nx.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-Workspace-F69220?logo=pnpm)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/Node.js-24-5FA04E?logo=nodedotjs)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python)](https://www.python.org/)
[![uv](https://img.shields.io/badge/uv-Python%20Packages-DE5FE9?logo=uv)](https://docs.astral.sh/uv/)
[![Jupyter](https://img.shields.io/badge/Jupyter-1.1-F37626?logo=jupyter&logoColor=white)](https://jupyter.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TanStack](https://img.shields.io/badge/TanStack-Start-FF4154?logo=tanstack)](https://tanstack.com/start)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-000000?logo=shadcnui)](https://ui.shadcn.com/)
[![Radix UI](https://img.shields.io/badge/Radix%20UI-Primitives-161618?logo=radixui)](https://radix-ui.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Lucide](https://img.shields.io/badge/Lucide-Icons-f67373?logo=lucide)](https://lucide.dev/)
[![Recharts](https://img.shields.io/badge/Recharts-Charts-22b5bf)](https://recharts.org/)
[![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1)](https://zod.dev/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite)](https://vitejs.dev/)
[![SWC](https://img.shields.io/badge/SWC-Compiler-F9BC00?logo=swc)](https://swc.rs/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18?logo=vitest)](https://vitest.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-Framework-E0234E?logo=nestjs)](https://nestjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-API-E10098?logo=graphql)](https://graphql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-ORM-E83524)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![LangChain](https://img.shields.io/badge/LangChain-AI-1C3C3C?logo=langchain)](https://python.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agents-1C3C3C?logo=langchain)](https://langchain-ai.github.io/langgraph/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-000000?logo=ollama)](https://ollama.com/)
[![Pydantic](https://img.shields.io/badge/Pydantic-Validation-E92063?logo=pydantic)](https://docs.pydantic.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-Linting-4B32C3?logo=eslint)](https://eslint.org/)
[![Oxlint](https://img.shields.io/badge/Oxlint-Linting-8A2BE2)](https://oxc.rs/docs/guide/usage/linter)
[![Prettier](https://img.shields.io/badge/Prettier-Formatter-F7B93E?logo=prettier)](https://prettier.io/)
[![Stylelint](https://img.shields.io/badge/Stylelint-CSS-263238?logo=stylelint)](https://stylelint.io/)
[![Ruff](https://img.shields.io/badge/Ruff-Linting-D7FF64?logo=ruff)](https://docs.astral.sh/ruff/)
[![Semantic Release](https://img.shields.io/badge/Semantic%20Release-Versioning-494949?logo=semantic-release)](https://semantic-release.gitbook.io/)
[![Docker](https://img.shields.io/badge/Docker-Container-2496ED?logo=docker)](https://www.docker.com/)
[![Helm](https://img.shields.io/badge/Helm-Charts-0F1689?logo=helm)](https://helm.sh/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-K8s-326CE5?logo=kubernetes)](https://kubernetes.io/)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-844FBA?logo=terraform)](https://www.terraform.io/)

[![Continuous Integration](https://github.com/JimmyPaolini/codebase/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/JimmyPaolini/codebase/actions/workflows/continuous-integration.yml)
[![Continuous Deployment](https://github.com/JimmyPaolini/codebase/actions/workflows/continuous-deployment.yml/badge.svg)](https://github.com/JimmyPaolini/codebase/actions/workflows/continuous-deployment.yml)
[![Continuous Compliance](https://github.com/JimmyPaolini/codebase/actions/workflows/continuous-compliance.yml/badge.svg)](https://github.com/JimmyPaolini/codebase/actions/workflows/continuous-compliance.yml)

A modern TypeScript codebase with Nx, featuring automated releases, comprehensive code quality tools, and strict type safety.

## 💽 Projects

**🔮 [affirmations](applications/affirmations)** - Python LangChain + Ollama affirmation generator (LangGraph ReAct agent, SearxNG)\
**🛰️ [caelundas](applications/caelundas)** - Swiss Ephemeris calendar generator that turns astronomical events into an `.ics` file
<details>
<summary><strong>🔭 callidescope</strong> - Call stack tracing toolchain that follows control flow through injected dependencies and reports where a stack got too deep</summary>

&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-agents](packages/ic-suite/callidescope/callidescope-agents)** - Agent skills for the callidescope toolchain, published and installed back from the lockfile like any other vendored skill\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-cli](packages/ic-suite/callidescope/callidescope-cli)** - Command-line host that builds the call graph with the TypeScript compiler API, resolves NestJS injected dependencies, and reports the deepest stack below every entry point\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-configuration](packages/ic-suite/callidescope/callidescope-configuration)** - Reads `callidescope.config.ts` for entry-point rules, depth and breadth limits, exclusion globs, and output destinations\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-core](packages/ic-suite/callidescope/callidescope-core)** - The contracts leaf: the call graph, stack, frame, and finding vocabulary every other callidescope package speaks, holding no service and no NestJS module\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-examples](packages/ic-suite/callidescope/callidescope-examples)** - A small codebase built to be traced, carrying one worked example per rule, finding, and output the toolchain has\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-graph](packages/ic-suite/callidescope/callidescope-graph)** - Builds the call graph from traced TypeScript source and measures its depth and breadth\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-nx](packages/ic-suite/callidescope/callidescope-nx)** - Nx plugin inferring per-project `trace`, `depth`, and `breadth` targets that follow the Nx dependency graph, keeping every Nx dependency out of the packages that trace\
&nbsp;&nbsp;&nbsp;&nbsp;**[callidescope-output](packages/ic-suite/callidescope/callidescope-output)** - Renders call-graph findings into markdown, mermaid, and JSON output formats

</details>

<details>
<summary><strong>🕸️ codependix</strong> - Dependency graph export toolchain that reads what each project depends on, renders it as JSON and Markdown diagrams, and gates the rules those graphs are judged against</summary>

&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-agents](packages/ic-suite/codependix/codependix-agents)** - Agent skills for the codependix toolchain, installable by any workspace that uses codependix\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-boundaries](packages/ic-suite/codependix/codependix-boundaries)** - Builds each level's graph for a workspace, judges it against the declared rules, and reports the edges and cycles that break them\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-cli](packages/ic-suite/codependix/codependix-cli)** - Command-line host that exports a project's Nx, NestJS, and file-level dependency graphs as JSON and Markdown anchor blocks, and gates the rules over them\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-configuration](packages/ic-suite/codependix/codependix-configuration)** - Reads `codependix.config.ts`, resolves the command line over it, and produces one resolved run configuration\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-core](packages/ic-suite/codependix/codependix-core)** - The contracts leaf: the run and result vocabulary every other codependix package states its types in\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-examples](packages/ic-suite/codependix/codependix-examples)** - Sixteen subjects built to be graphed, each carrying the guide codependix renders from it\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-file-imports](packages/ic-suite/codependix/codependix-file-imports)** - Builds a project's file-level import graph — a `typescript` module walking its own `ts.Program`, and a `python` module parsing `import`/`from ... import` statements\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-nestjs-modules](packages/ic-suite/codependix/codependix-nestjs-modules)** - Explores a NestJS project's container and builds its module graph\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-nx-projects](packages/ic-suite/codependix/codependix-nx-projects)** - Builds a project's one-hop Nx dependency neighborhood from the Nx project graph\
&nbsp;&nbsp;&nbsp;&nbsp;**[codependix-output](packages/ic-suite/codependix/codependix-output)** - Renders every graph as JSON, Markdown, and mermaid, routes each to its configured destination, and splices anchor blocks into place

</details>

<details>
<summary><strong>⏲️ codometer</strong> - Repository measurement toolchain that counts a codebase and reports what it found</summary>

&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-agents](packages/ic-suite/codometer/codometer-agents)** - Agent skills for the codometer toolchain, published and installed back from the lockfile like any other vendored skill\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-cli](packages/ic-suite/codometer/codometer-cli)** - Command-line host that measures TypeScript, JavaScript, Python, JSON, markdown, and Jupyter notebooks, then writes the badge block in this README, a JSON report, or both\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-configuration](packages/ic-suite/codometer/codometer-configuration)** - Reads `codometer.config.ts` for exclusion globs, output destinations and their render/write callbacks, and the Python interpreter, and reads the command line that runs over it\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-core](packages/ic-suite/codometer/codometer-core)** - The contracts leaf: the statistics and report vocabulary a measurement produces, and the errors a configuration is refused with\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-examples](packages/ic-suite/codometer/codometer-examples)** - A sample corpus with known contents and one runnable example per thing codometer does, with tests that assert every number the guides quote\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-languages](packages/ic-suite/codometer/codometer-languages)** - Every input language analyzer codometer measures, behind one `analyze()` call\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-measurement](packages/ic-suite/codometer/codometer-measurement)** - Finds the files a run measures, counts their size and whatever a configuration declares its own counters for, and holds every metric to its declared limit\
&nbsp;&nbsp;&nbsp;&nbsp;**[codometer-output](packages/ic-suite/codometer/codometer-output)** - Every codometer output format - JSON reports, README badges, and the pull request change report - plus the destinations a run writes them to

</details>

<details>
<summary><strong>👔 conformetry</strong> - Template-driven code generation and conformance validation toolchain</summary>

&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-agents](packages/ic-suite/conformetry/conformetry-agents)** - Agent skills for the conformetry toolchain, published and installed back from the lockfile like any other vendored skill\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-cli](packages/ic-suite/conformetry/conformetry-cli)** - Command-line host that expands globs, prompts for inputs, and runs generation and validation\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-configuration](packages/ic-suite/conformetry/conformetry-configuration)** - Configuration loading, template and instance discovery, generator input resolution, and the placeholder rendering every template path needs\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-core](packages/ic-suite/conformetry/conformetry-core)** - Contracts leaf: difference, score, inventory, and language validator types, and nothing executable\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-examples](packages/ic-suite/conformetry/conformetry-examples)** - Eleven runnable examples of the toolchain, each with its own configuration, template, instances, and guide, executed by CI so the guides cannot rot\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-generation](packages/ic-suite/conformetry/conformetry-generation)** - Scaffold file generation, rendering each template through the configuration layer\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-languages](packages/ic-suite/conformetry/conformetry-languages)** - Every language conformetry compares files with, as modules of one package, plus the resolution that picks them, the text fallback, the extension-agnostic existence pass, and the difference and scoring primitives they share\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-nx](packages/ic-suite/conformetry/conformetry-nx)** - Nx plugin host with generators, executors, and the emitted-plugin bootstrap\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-output](packages/ic-suite/conformetry/conformetry-output)** - Every render target: the validation report and the template and instance inventory\
&nbsp;&nbsp;&nbsp;&nbsp;**[conformetry-validation](packages/ic-suite/conformetry/conformetry-validation)** - Validation orchestration, language routing, and finding deduplication

</details>

<details>
<summary><strong>🐺 lexico</strong> - Latin-English dictionary suite: the web application, its components, its schema, and the ingestion that fills it</summary>

&nbsp;&nbsp;&nbsp;&nbsp;**[lexico](applications/lexico)** - TanStack Start SSR dictionary web application\
&nbsp;&nbsp;&nbsp;&nbsp;**[lexico-components](packages/lexico-components)** - Shared React component library using shadcn/ui and Radix primitives\
&nbsp;&nbsp;&nbsp;&nbsp;**[lexico-entities](packages/lexico-entities)** - TypeORM entities, migrations, and grammatical enumerations for the dictionary and literature schema\
&nbsp;&nbsp;&nbsp;&nbsp;**[lexico-ingestion](applications/lexico-ingestion)** - NestJS CLI that scrapes and loads dictionary, literature, and etymology sources

</details>

**🪵 [logger](packages/logger)** - Shared pino-backed NestJS `LoggerService` and `LoggerModule`\
**🏺 [meanderaw](applications/meanderaw)** - CLI that generates Greek meander (key/fret) SVG patterns programmatically from a type, row count, and repeat count

**[JimmyPaolini](applications/JimmyPaolini)** - GitHub profile site\
**↔️ [synchronization](tools/synchronization)** - NestJS CLI that regenerates the workspace's derived configuration and documentation, and fails CI when they drift\
**🧑‍⚖️ [validation](tools/validation)** - NestJS CLI for the repository's one-sided checks, the ones with a check and no write, such as the pull request metadata gate

## 📖 Documentation

### Getting Started & Workflow

- [Contributing Guide](.github/CONTRIBUTING.md) - **Start here.** Local and dev container setup, the commands to run, code standards, branch and commit conventions, pull requests, and releases
- [AGENTS.md](AGENTS.md) - Commands, project layout, conventions, code quality gates, and git workflow
- [Release Process](documentation/development/release-process.md) - Automated semantic versioning and changelogs

### Architecture & Systems

- [CI/CD Workflows](.github/workflows) - GitHub Actions workflows and the shared `setup-codebase` composite action
- [Infrastructure](infrastructure/README.md) - Helm charts, Terraform, and the Kubernetes deployment pipeline
- [Dev Container](.devcontainer/README.md) - Containerized development environment
- [Scripts](scripts/README.md) - Local setup and maintenance scripts

### Conventions & Guidelines

Conventions live in [AGENTS.md](AGENTS.md) and the agent skills below, which are the single sources of truth. Every project also has its own `AGENTS.md` with project-specific patterns.

**🤖 Agent Skills (Domain Knowledge)**
Skills are specialized instruction files used by our automated agents, but they also serve as excellent deep-dive documentation for human developers.

- [View all Skills](.agents/skills) - Complete index of available skills
- **Languages:** [TypeScript](.agents/skills/write-typescript/SKILL.md) / [React](.agents/skills/write-react/SKILL.md) / [Python](.agents/skills/write-python/SKILL.md) / [Comments](.agents/skills/write-comments/SKILL.md)
- **Quality:** [Validate Code](.agents/skills/validate-code/SKILL.md) / [Testing Strategy](.agents/skills/testing-strategy/SKILL.md) / [Testing Mocks](.agents/skills/testing-mocks/SKILL.md) / [Error Handling](.agents/skills/handle-errors/SKILL.md)
- **Workflows:** [Git Commits](.agents/skills/commit-code/SKILL.md) / [PR Management](.agents/skills/create-pull-request/SKILL.md) / [Branch Naming](.agents/skills/checkout-branch/SKILL.md)
- **Tooling:** [Nx Workspaces](.agents/skills/nx-workspace/SKILL.md) / [Generators](.agents/skills/nx-generate/SKILL.md) / [Task Running](.agents/skills/nx-run-tasks/SKILL.md)
- **Triage:** [Failing CI](.agents/skills/triage-integration/SKILL.md) / [Rejected Commits](.agents/skills/triage-integration/SKILL.md) / [Spell Check](.agents/skills/spell-check/SKILL.md)

Other important files include [CHANGELOG.md](CHANGELOG.md) and [SECURITY.md](.github/SECURITY.md).

## 👔 Conformetry

Template-driven code generation and conformance validation, templates synced from [configuration/conformetry.config.ts](configuration/conformetry.config.ts) by `nx run synchronization:conformetry-generators:write`.

<!-- conformetry:start -->
| Template | Description |
| -------- | ----------- |
| `jupyter-notebook-application` | A standalone Python application template with a Jupyter notebook entry point, pytest/pyright/ruff tooling, and a shared uv workspace venv |
| `nestjs-command-project` | A standalone NestJS CLI application template built on nest-commander, for a new command-line tool in applications/, packages/, or tools/ |
| `nestjs-graphql-application` | A standalone NestJS GraphQL API application template, for a new backend service exposing a GraphQL schema over HTTP |
| `nestjs-service-project` | A standalone NestJS library package template for internal workspace code shared across projects, with no CLI entry point or HTTP server |
| `nestjs-command-module` | A nest-commander command module template — command, module, constants, types, and unit test — for an existing NestJS command-line project |
| `nestjs-dataloader-module` | A GraphQL dataloader module template — dataloader, module, types, and unit test — for batching lookups inside an existing NestJS project |
| `nestjs-graphql-module` | A GraphQL module template — resolver, entities, args/input types, factories, constants, and unit test — for an existing NestJS project |
| `nestjs-service-file` | A service and unit test file template for an existing NestJS module, without the surrounding module files |
| `nestjs-service-module` | A plain service module template — module, service, constants, types, and unit test — for an existing NestJS project |
| `react-component` | A React component and test file template for an existing React project |
<!-- conformetry:end -->

## 🕸️ Codependix

The workspace's dependency graph, exported by [codependix](packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  affirmations["affirmations"]
  caelundas["caelundas"]
  callidescope_agents["callidescope-agents"]
  callidescope_cli["callidescope-cli"]
  callidescope_configuration["callidescope-configuration"]
  callidescope_core["callidescope-core"]
  callidescope_examples["callidescope-examples"]
  callidescope_graph["callidescope-graph"]
  callidescope_nx["callidescope-nx"]
  callidescope_output["callidescope-output"]
  codependix_agents["codependix-agents"]
  codependix_boundaries["codependix-boundaries"]
  codependix_cli["codependix-cli"]
  codependix_configuration["codependix-configuration"]
  codependix_core["codependix-core"]
  codependix_examples["codependix-examples"]
  codependix_file_imports["codependix-file-imports"]
  codependix_nestjs_modules["codependix-nestjs-modules"]
  codependix_nx_projects["codependix-nx-projects"]
  codependix_output["codependix-output"]
  codometer_agents["codometer-agents"]
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_core["codometer-core"]
  codometer_examples["codometer-examples"]
  codometer_languages["codometer-languages"]
  codometer_measurement["codometer-measurement"]
  codometer_output["codometer-output"]
  conformetry_agents["conformetry-agents"]
  conformetry_cli["conformetry-cli"]
  conformetry_configuration["conformetry-configuration"]
  conformetry_core["conformetry-core"]
  conformetry_examples["conformetry-examples"]
  conformetry_generation["conformetry-generation"]
  conformetry_languages["conformetry-languages"]
  conformetry_nx["conformetry-nx"]
  conformetry_output["conformetry-output"]
  conformetry_validation["conformetry-validation"]
  lexico["lexico"]
  lexico_components["lexico-components"]
  lexico_entities["lexico-entities"]
  lexico_ingestion["lexico-ingestion"]
  logger["logger"]
  meanderaw["meanderaw"]
  synchronization["synchronization"]
  validation["validation"]
  caelundas --> logger
  callidescope_cli --> callidescope_configuration
  callidescope_cli --> callidescope_core
  callidescope_cli --> callidescope_graph
  callidescope_cli --> callidescope_output
  callidescope_cli --> logger
  callidescope_configuration --> callidescope_core
  callidescope_examples -.-> callidescope_cli
  callidescope_examples --> callidescope_configuration
  callidescope_examples --> callidescope_core
  callidescope_graph --> callidescope_configuration
  callidescope_graph --> callidescope_core
  callidescope_graph --> logger
  callidescope_nx --> callidescope_cli
  callidescope_nx --> callidescope_configuration
  callidescope_nx --> callidescope_core
  callidescope_nx --> callidescope_graph
  callidescope_nx --> callidescope_output
  callidescope_nx --> logger
  callidescope_output --> callidescope_configuration
  callidescope_output --> callidescope_core
  callidescope_output --> callidescope_graph
  callidescope_output --> logger
  codependix_boundaries --> codependix_configuration
  codependix_boundaries --> codependix_core
  codependix_boundaries --> codependix_file_imports
  codependix_boundaries --> codependix_nestjs_modules
  codependix_boundaries --> codependix_nx_projects
  codependix_cli --> codependix_boundaries
  codependix_cli --> codependix_configuration
  codependix_cli --> codependix_core
  codependix_cli --> codependix_output
  codependix_cli --> logger
  codependix_configuration --> codependix_core
  codependix_examples --> codependix_boundaries
  codependix_examples -.-> codependix_cli
  codependix_examples --> codependix_configuration
  codependix_examples --> codependix_core
  codependix_examples --> codependix_file_imports
  codependix_examples --> codependix_nestjs_modules
  codependix_examples --> codependix_nx_projects
  codependix_examples --> codependix_output
  codependix_examples --> logger
  codependix_nestjs_modules --> logger
  codependix_output --> codependix_boundaries
  codependix_output --> codependix_configuration
  codependix_output --> codependix_core
  codependix_output --> codependix_file_imports
  codependix_output --> codependix_nestjs_modules
  codependix_output --> codependix_nx_projects
  codependix_output --> logger
  codometer_cli --> codometer_configuration
  codometer_cli --> codometer_core
  codometer_cli --> codometer_measurement
  codometer_cli --> codometer_output
  codometer_cli --> logger
  codometer_configuration --> codometer_core
  codometer_examples -.-> codometer_cli
  codometer_examples --> codometer_configuration
  codometer_examples --> codometer_core
  codometer_languages --> codometer_configuration
  codometer_languages --> codometer_core
  codometer_languages --> logger
  codometer_measurement --> codometer_configuration
  codometer_measurement --> codometer_core
  codometer_measurement --> codometer_languages
  codometer_measurement --> logger
  codometer_output --> codometer_configuration
  codometer_output --> codometer_core
  codometer_output --> codometer_measurement
  codometer_output --> logger
  conformetry_cli --> conformetry_configuration
  conformetry_cli --> conformetry_core
  conformetry_cli --> conformetry_generation
  conformetry_cli --> conformetry_output
  conformetry_cli --> conformetry_validation
  conformetry_cli --> logger
  conformetry_configuration --> conformetry_core
  conformetry_examples -.-> conformetry_cli
  conformetry_examples --> conformetry_configuration
  conformetry_examples --> conformetry_generation
  conformetry_examples --> conformetry_nx
  conformetry_examples --> conformetry_output
  conformetry_examples --> conformetry_validation
  conformetry_generation --> conformetry_configuration
  conformetry_languages --> conformetry_configuration
  conformetry_languages --> conformetry_core
  conformetry_nx --> conformetry_configuration
  conformetry_nx --> conformetry_generation
  conformetry_nx --> conformetry_output
  conformetry_nx --> conformetry_validation
  conformetry_nx --> logger
  conformetry_output --> conformetry_core
  conformetry_output --> conformetry_languages
  conformetry_validation --> conformetry_configuration
  conformetry_validation --> conformetry_core
  conformetry_validation --> conformetry_languages
  lexico --> lexico_components
  lexico_ingestion --> lexico_entities
  lexico_ingestion --> logger
  meanderaw --> logger
  synchronization --> conformetry_configuration
  synchronization --> logger
  validation --> logger
```

_Dashed edges are dependencies Nx inferred from configuration rather than from code._
<!-- codependix:end name="codependix-nx-projects" -->

<!-- codometer:start -->

## ⏲️ Codometer

Repository statistics measured by [codometer](packages/ic-suite/codometer/codometer-cli), regenerated by `nx run codebase:codometer`.

### Repository

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-5957-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-2.05_MB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-74-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-23-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-16-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-4-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-0-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-37-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-6-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-0-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-36-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-0-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-44-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-0-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-44-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-0-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-84-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-46-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-10-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-669-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-1370-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-1-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-5-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-1-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-4-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-23-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-5606-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-712-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-257-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-1793-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-1826-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-37-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-124-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-1147-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-2956-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-11-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-21-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-2752-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-21-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-400-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-87-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-1367-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-2744-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-386-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-8-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-3-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-140-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-12-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-6-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-58-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-15-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-31-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-35-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-2496-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-23-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-224-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-12-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-170-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-17-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-103-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-35-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-548-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-548-475569?style=flat-square)

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

![HCL Files](https://img.shields.io/badge/HCL_Files-2-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-52-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-11-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-1-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-3-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-1-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-20-0ea5e9?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-0-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-0-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-0-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-0-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

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

![Markdown Files](https://img.shields.io/badge/Markdown_Files-103-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-18377-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-102-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-629-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-524-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-78-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-5242-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-833-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-4060-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-57-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-217-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-1883-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-663-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-22-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-397-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-10167-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-21-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-28-a16207?style=flat-square)
<!-- codometer:end -->

<!-- callidescope:start -->

## 🔭 Callidescope

The workspace's call graph, traced by [callidescope](packages/ic-suite/callidescope/callidescope-cli), regenerated by `nx run codebase:callidescope:write`. Projects are listed tightest-first: the rows at the top are the ones a ratchet cannot descend past.

| Measure | Value |
| --- | --- |
| Callables | 5117 |
| Files | 1423 |
| Calls traced | 5722 |
| Call stacks | 1330 |
| Deepest stack | 17 |
| Stacks through recursion | 12 |
| Unfollowable calls | 338 |

### Projects

| Project | Deepest | Limit | Headroom | Widest |
| --- | --- | --- | --- | --- |
| `applications/meanderaw` | 17 | 16 | -1 | 13 |
| `applications/caelundas` | 16 | 16 | 0 | 12 |
| `applications/lexico` | 9 | 9 | 0 | 9 |
| `applications/lexico-ingestion` | 17 | 17 | 0 | 8 |
| `packages/ic-suite/callidescope/callidescope-cli` | 15 | 15 | 0 | 10 |
| `packages/ic-suite/callidescope/callidescope-nx` | 17 | 17 | 0 | 7 |
| `packages/ic-suite/codependix/codependix-boundaries` | 12 | 12 | 0 | 7 |
| `packages/ic-suite/codependix/codependix-cli` | 15 | 15 | 0 | 7 |
| `packages/ic-suite/codometer/codometer-cli` | 15 | 15 | 0 | 9 |
| `packages/ic-suite/conformetry/conformetry-cli` | 15 | 15 | 0 | 9 |
| `packages/ic-suite/conformetry/conformetry-languages` | 13 | 13 | 0 | 11 |
| `packages/ic-suite/conformetry/conformetry-nx` | 15 | 15 | 0 | 9 |
| `packages/lexico-components` | 3 | 3 | 0 | 7 |
| `packages/lexico-entities` | 3 | 3 | 0 | 3 |
| `packages/logger` | 4 | 4 | 0 | 2 |
| `tools/synchronization` | 10 | 10 | 0 | 10 |
| `tools/validation` | 8 | 8 | 0 | 9 |
| `packages/ic-suite/codependix/codependix-core` | 0 | 1 | 1 | 0 |
| `packages/ic-suite/codometer/codometer-core` | 0 | 1 | 1 | 0 |
| `packages/ic-suite/conformetry/conformetry-core` | 0 | 1 | 1 | 0 |
| `packages/ic-suite/callidescope/callidescope-configuration` | 5 | 8 | 3 | 7 |
| `packages/ic-suite/codependix/codependix-output` | 11 | 14 | 3 | 7 |
| `packages/ic-suite/codependix/codependix-nx-projects` | 0 | 4 | 4 | 8 |
| `packages/ic-suite/conformetry/conformetry-configuration` | 10 | 14 | 4 | 5 |
| `packages/ic-suite/codependix/codependix-configuration` | 2 | 7 | 5 | 4 |
| `packages/ic-suite/codependix/codependix-nestjs-modules` | 0 | 5 | 5 | 7 |
| `packages/ic-suite/callidescope/callidescope-graph` | 5 | 11 | 6 | 8 |
| `packages/ic-suite/codometer/codometer-configuration` | 3 | 9 | 6 | 4 |
| `packages/ic-suite/codometer/codometer-languages` | 5 | 11 | 6 | 12 |
| `packages/ic-suite/conformetry/conformetry-generation` | 2 | 8 | 6 | 4 |
| `packages/ic-suite/conformetry/conformetry-output` | 0 | 6 | 6 | 4 |
| `packages/ic-suite/codometer/codometer-output` | 4 | 11 | 7 | 16 |
| `packages/ic-suite/codependix/codependix-file-imports` | 0 | 8 | 8 | 8 |
| `packages/ic-suite/callidescope/callidescope-output` | 4 | 13 | 9 | 7 |
| `packages/ic-suite/conformetry/conformetry-validation` | 0 | 13 | 13 | 10 |
| `configuration` | 3 | 17 | 14 | 2 |
| `packages/ic-suite/codometer/codometer-measurement` | 0 | 14 | 14 | 9 |
| `packages/ic-suite/callidescope/callidescope-core` | 0 | 17 | 17 | 0 |

### Depth headroom

| Headroom | Projects |
| --- | --- |
| over limit | 1 |
| 0 — at limit | 16 |
| 1 | 0 |
| 2–3 | 2 |
| 4+ | 9 |
| no stacks | 10 |

### Call stacks over the depth limit (1)

**1. `DrawCommand.run`** — depth ≥ 17 · decorated-method

```text
🚀 DrawCommand.run(_passedParameters: string[], options: DrawCommandOptions): Promise<void> [applications/meanderaw/src/modules/draw/draw.command.ts:229]
   ↳ Checks for drift when `--check` is given, sweeps every meander into the database when no Code is named, or draws the…
  └─> DrawCheckService.check(): Promise<MeanderDriftReport> [applications/meanderaw/src/modules/draw/draw-check.service.ts:162]
     ↳ Regenerates the whole corpus into a throwaway database, diffs it against the committed one, and throws {@link…
    └─> DrawEnumerationService.sweep(): Promise<number> [applications/meanderaw/src/modules/draw/draw-enumeration.service.ts:80]
       ↳ Every shape the budget admits, swept and written — which is what `draw` with no drawing named now does.
      └─> DrawEnumerationService.persist(shapes: readonly MeanderShape[]): Promise<number> [applications/meanderaw/src/modules/draw/draw-enumeration.service.ts:60]
         ↳ Enumerates the shapes named and writes every meander they hold, one shape's rows at a time, answering with how many…
        └─> DrawEnumerationService.records(shape: MeanderShape): MeanderRecord[] [applications/meanderaw/src/modules/draw/draw-enumeration.service.ts:71]
           ↳ Every meander of one shape, as the rows the database holds for them.
          └─> DrawEnumerationService.map(…)({ code }: EnumeratedMeander): MeanderRecord [applications/meanderaw/src/modules/draw/draw-enumeration.service.ts:74]
            └─> DrawRecordService.record(…): MeanderRecord [applications/meanderaw/src/modules/draw/draw-record.service.ts:57]
               ↳ The row one Code describes at one shape, every field of it derived from that Code alone.
              └─> CharacteristicsService.compute(code: CodeObject): Characteristics [applications/meanderaw/src/modules/characteristics/characteristics.service.ts:463]
                 ↳ Computes every characteristic for a given parsed code (delegates to measure).
                └─> CharacteristicsService.measure(…): Characteristics [applications/meanderaw/src/modules/characteristics/characteristics.service.ts:468]
                   ↳ Computes every characteristic for a given Matrix, CodeObject, or code string.
                  └─> CharacteristicsService.computeFromMatrix(matrix: Matrix, isReducible?: boolean): Characteristics [applications/meanderaw/src/modules/characteristics/characteristics.service.ts:89]
                     ↳ Computes every characteristic from a 2D Matrix representation.
                    └─> CharacteristicsService.measureGraphs(…): { unwrappedEdges: CodeEdge[]; unwrappedGraph: Connectivity; unwrappedJunctions: { tJunctions: number; xJunctions: number; }; wrappedEdges: CodeEdge[]; wrappedGraph: Connectivity; wrappedJunctions: { ...; }; } [applications/meanderaw/src/modules/characteristics/characteristics.service.ts:292]
                       ↳ Computes graph connectivity and junctions.
                      └─> ConnectivityService.connectivity(matrix: Matrix, unwrapped?: boolean): Connectivity [applications/meanderaw/src/modules/characteristics/connectivity.service.ts:133]
                         ↳ How many pieces one repeat's ink falls into, how many independent loops it closes, and how many of its points…
                        └─> ConnectivityService.adjacency(matrix: Matrix, edges: readonly CodeEdge[]): InkAdjacency<string> [applications/meanderaw/src/modules/characteristics/connectivity.service.ts:61]
                           ↳ The Matrix's edges as an {@link InkAdjacency}, which is all {@link GraphService.components} needs of it.
                          └─> ConnectivityService.nodes(matrix: Matrix): string[] [applications/meanderaw/src/modules/characteristics/connectivity.service.ts:114]
                             ↳ Every point the Matrix spells, inked dots included — a point on no edge at all is a component of its own.
                            └─> ConnectivityService.from(…)(_unused: unknown, row: number): string[] [applications/meanderaw/src/modules/characteristics/connectivity.service.ts:117]
                              └─> ConnectivityService.from(…)(_column: unknown, column: number): string [applications/meanderaw/src/modules/characteristics/connectivity.service.ts:118]
                                └─> ConnectivityService.key(row: number, column: number): string [applications/meanderaw/src/modules/characteristics/connectivity.service.ts:109]
                                   ↳ One point's identity in the graph, which is its position and nothing else.
```

### Callables over the breadth limit (1)

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ModuleGraphService.buildGraph` | 7 | `ModuleGraphService.findAmbientModuleNames`, `ModuleGraphService.collectEdgesAndNodes`, `ModuleGraphService.toSorted(…)`, `ModuleGraphService.sortNames`, `ModuleGraphService.map(…)`, `ModuleGraphService.toSorted(…)`, `ModuleGraphService.filter(…)` | `packages/ic-suite/codependix/codependix-nestjs-modules/src/modules/module-graph/module-graph.service.ts:169` |

<!-- callidescope:end -->
