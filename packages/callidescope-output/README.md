# 🔭 Callidescope Output

**Renders call-graph findings into markdown, mermaid, and JSON output formats.**

This package sits between
[`@callidescope/graph`](../callidescope-graph/README.md), which it depends on
for the shapes it renders, and
[`@callidescope/cli`](../callidescope-cli/README.md), which orchestrates a run
and hands this package the findings.

```bash
npm install --save-dev @callidescope/output
```

## What This Package Owns

- **`output-markdown`** — anchored-block splicing into markdown files
- **`output-json`** — JSON file output
- **`report`** — assembles findings, as markdown or a mermaid diagram, into the reportable shape
- **`project-reports`** — per-project report sections, scoping a run's findings to the project each one came from

## Test

```bash
nx run callidescope-output:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `callidescope-output`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 85 |
| Files | 22 |
| Calls traced | 76 |
| Call stacks | 3 |
| Deepest stack | 3 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Call stacks (depth)

**1. `ReportService.renderFrame`** — depth 3 · orphan-root

```text
🚀 ReportService.renderFrame(args: { depth: number; frame: StackFrame; }): string [packages/callidescope-output/src/modules/report/report.service.ts:44]
   ↳ Renders one frame at its indentation, with whatever it says about itself.
  └─> ReportService.shortenSummary(summary: string): string [packages/callidescope-output/src/modules/report/report.service.ts:102]
     ↳ Shortens a summary to what fits under an indented frame.
    └─> ReportService.readFirstSentence(summary: string): string | undefined [packages/callidescope-output/src/modules/report/report.service.ts:37]
       ↳ Reads a summary's opening sentence, when it has more than one.
```

**2. `MarkdownReportService.renderStack`** — depth 3 · orphan-root

```text
🚀 MarkdownReportService.renderStack(args: { index: number; stack: CallStack; }): string [packages/callidescope-output/src/modules/report/markdown-report.service.ts:119]
   ↳ Renders one stack: a labelled heading line and its tree in a fence.
  └─> ReportService.renderStackTree(stack: CallStack): string [packages/callidescope-output/src/modules/report/report.service.ts:123]
     ↳ Renders every frame of a stack, the entry point first.
    └─> ReportService.map(…)(frame: StackFrame, depth: number): string [packages/callidescope-output/src/modules/report/report.service.ts:125]
```

**3. `MarkdownReportService.toRow`** — depth 2 · orphan-root

```text
🚀 MarkdownReportService.toRow(report: CallableBreadthReport): string [packages/callidescope-output/src/modules/report/markdown-report.service.ts:66]
  └─> MarkdownReportService.map(…)(callee: WideCallableCallee): string [packages/callidescope-output/src/modules/report/markdown-report.service.ts:67]
```

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ProjectReportsService.map(…)` | 6 | `ProjectReportsService.toSorted(…)`, `ProjectReportsService.toSorted(…)`, `ProjectReportsService.filter(…)`, `ProjectReportsService.filter(…)`, `ProjectReportsService.buildSummary`, `ProjectReportsService.filter(…)` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:191` |
| `OutputMarkdownService.syncAnchoredBlock` | 5 | `MissingMarkdownPathError.constructor`, `OutputMarkdownService.readExisting`, `OutputMarkdownService.wrapInAnchors`, `OutputMarkdownService.buildBlockPattern`, `OutputMarkdownService.spliceBlock` | `packages/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:205` |
| `MarkdownReportService.renderProjectSection` | 5 | `MarkdownReportService.renderSummaryTable`, `MarkdownReportService.renderStacksAs`, `MarkdownReportService.renderSpreads`, `MarkdownReportService.renderCallableBreadths`, `MarkdownReportService.renderMisplaced` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:176` |

<details>
<summary>27 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MarkdownReportService.renderRun` | 5 | `MarkdownReportService.renderSummaryTable`, `MarkdownReportService.renderStacksAs`, `MarkdownReportService.renderSpreads`, `MarkdownReportService.renderCallableBreadths`, `MarkdownReportService.renderMisplaced` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:212` |
| `ProjectReportsService.buildSummary` | 4 | `ProjectReportsService.filter(…)`, `ProjectReportsService.filter(…)`, `ProjectReportsService.reduce(…)`, `ProjectReportsService.filter(…)` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:125` |
| `ProjectReportsService.findDeepStacks` | 4 | `ProjectReportsService.toSorted(…)`, `ProjectReportsService.map(…)`, `ProjectReportsService.filter(…)`, `ProjectReportsService.flatMap(…)` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:233` |
| `ProjectReportsService.findWideCallables` | 4 | `ProjectReportsService.toSorted(…)`, `ProjectReportsService.map(…)`, `ProjectReportsService.filter(…)`, `ProjectReportsService.flatMap(…)` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:251` |
| `OutputMarkdownService.spliceBlock` | 3 | `OutputMarkdownService.replace(…)`, `OutputMarkdownService.appendBlock`, `OutputMarkdownService.replaceOrphanedBlock` | `packages/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:122` |
| `ProjectReportsService.build` | 3 | `ProjectReportsService.buildStacks`, `ProjectReportsService.buildCallableBreadths`, `ProjectReportsService.map(…)` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:187` |
| `MermaidReportService.renderStacks` | 3 | `MermaidReportService.countNewCallables`, `MermaidReportService.addStack`, `MermaidReportService.renderDiagram` | `packages/callidescope-output/src/modules/report/mermaid-report.service.ts:136` |
| `ReportService.renderFrame` | 3 | `ReportService.renderSignature`, `ReportService.renderMarkers`, `ReportService.shortenSummary` | `packages/callidescope-output/src/modules/report/report.service.ts:44` |
| `MarkdownReportService.renderCallableBreadths` | 3 | `MarkdownReportService.renderTable`, `MarkdownReportService.map(…)`, `MarkdownReportService.map(…)` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:62` |
| `OutputJsonService.sync` | 2 | `OutputJsonService.buildReport`, `OutputJsonService.readExisting` | `packages/callidescope-output/src/modules/output-json/output-json.service.ts:63` |
| `OutputMarkdownService.sync` | 2 | `OutputMarkdownService.syncAnchoredBlock`, `OutputMarkdownService.buildHelpers` | `packages/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:176` |
| `ProjectReportsService.buildCallableBreadths` | 2 | `ProjectReportsService.flatMap(…)`, `SignaturesService.read` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:39` |
| `ProjectReportsService.buildStacks` | 2 | `ProjectReportsService.readDepth`, `PathsService.buildDeepestPath` | `packages/callidescope-output/src/modules/project-reports/project-reports.service.ts:79` |
| `MermaidReportService.countNewCallables` | 2 | `MermaidReportService.filter(…)`, `MermaidReportService.map(…)` | `packages/callidescope-output/src/modules/report/mermaid-report.service.ts:87` |
| `MarkdownReportService.renderMisplaced` | 2 | `MarkdownReportService.renderTable`, `MarkdownReportService.map(…)` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:95` |
| `MarkdownReportService.renderSpreads` | 2 | `MarkdownReportService.renderTable`, `MarkdownReportService.map(…)` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:108` |
| `MarkdownReportService.renderStacksAs` | 2 | `MermaidReportService.renderStacks`, `MarkdownReportService.renderStacks` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:136` |
| `OutputMarkdownService.buildBlockPattern` | 1 | `OutputMarkdownService.escapePattern` | `packages/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:53` |
| `OutputMarkdownService.syncProjectReadmes` | 1 | `OutputMarkdownService.syncAnchoredBlock` | `packages/callidescope-output/src/modules/output-markdown/output-markdown.service.ts:240` |
| `MermaidReportService.addFrame` | 1 | `MermaidReportService.renderLabel` | `packages/callidescope-output/src/modules/report/mermaid-report.service.ts:39` |
| `MermaidReportService.addStack` | 1 | `MermaidReportService.addFrame` | `packages/callidescope-output/src/modules/report/mermaid-report.service.ts:67` |
| `ReportService.shortenSummary` | 1 | `ReportService.readFirstSentence` | `packages/callidescope-output/src/modules/report/report.service.ts:102` |
| `ReportService.renderStackTree` | 1 | `ReportService.map(…)` | `packages/callidescope-output/src/modules/report/report.service.ts:123` |
| `MarkdownReportService.toRow` | 1 | `MarkdownReportService.map(…)` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:66` |
| `MarkdownReportService.map(…)` | 1 | `MarkdownReportService.map(…)` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:112` |
| `MarkdownReportService.renderStack` | 1 | `ReportService.renderStackTree` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:119` |
| `MarkdownReportService.renderStacks` | 1 | `MarkdownReportService.map(…)` | `packages/callidescope-output/src/modules/report/markdown-report.service.ts:253` |

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
  callidescope_output["callidescope-output"]
  logger["logger"]
  callidescope_cli --> callidescope_output
  callidescope_output --> callidescope_configuration
  callidescope_output --> callidescope_graph
  callidescope_output --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class callidescope_output subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  DocumentationModule
  GraphModule
  LoggerModule([LoggerModule])
  OutputJsonModule
  OutputMarkdownModule
  ProjectReportsModule
  ReportModule
  SignaturesModule
  GraphModule --> DocumentationModule
  GraphModule --> SignaturesModule
  ProjectReportsModule --> GraphModule
  ProjectReportsModule --> SignaturesModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_output_json_output_json_constants_ts["src/modules/output-json/output-json.constants.ts"]
  file_src_modules_output_json_output_json_module_ts["src/modules/output-json/output-json.module.ts"]
  file_src_modules_output_json_output_json_service_ts["src/modules/output-json/output-json.service.ts"]
  file_src_modules_output_json_output_json_service_unit_test_ts["src/modules/output-json/output-json.service.unit.test.ts"]
  file_src_modules_output_json_output_json_types_ts["src/modules/output-json/output-json.types.ts"]
  file_src_modules_output_markdown_output_markdown_constants_ts["src/modules/output-markdown/output-markdown.constants.ts"]
  file_src_modules_output_markdown_output_markdown_errors_ts["src/modules/output-markdown/output-markdown.errors.ts"]
  file_src_modules_output_markdown_output_markdown_module_ts["src/modules/output-markdown/output-markdown.module.ts"]
  file_src_modules_output_markdown_output_markdown_service_ts["src/modules/output-markdown/output-markdown.service.ts"]
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts["src/modules/output-markdown/output-markdown.service.unit.test.ts"]
  file_src_modules_output_markdown_output_markdown_types_ts["src/modules/output-markdown/output-markdown.types.ts"]
  file_src_modules_project_reports_project_reports_constants_ts["src/modules/project-reports/project-reports.constants.ts"]
  file_src_modules_project_reports_project_reports_module_ts["src/modules/project-reports/project-reports.module.ts"]
  file_src_modules_project_reports_project_reports_service_ts["src/modules/project-reports/project-reports.service.ts"]
  file_src_modules_project_reports_project_reports_service_unit_test_ts["src/modules/project-reports/project-reports.service.unit.test.ts"]
  file_src_modules_project_reports_project_reports_types_ts["src/modules/project-reports/project-reports.types.ts"]
  file_src_modules_report_markdown_report_service_ts["src/modules/report/markdown-report.service.ts"]
  file_src_modules_report_markdown_report_service_unit_test_ts["src/modules/report/markdown-report.service.unit.test.ts"]
  file_src_modules_report_mermaid_report_service_ts["src/modules/report/mermaid-report.service.ts"]
  file_src_modules_report_mermaid_report_service_unit_test_ts["src/modules/report/mermaid-report.service.unit.test.ts"]
  file_src_modules_report_report_constants_ts["src/modules/report/report.constants.ts"]
  file_src_modules_report_report_module_ts["src/modules/report/report.module.ts"]
  file_src_modules_report_report_service_ts["src/modules/report/report.service.ts"]
  file_src_modules_report_report_service_unit_test_ts["src/modules/report/report.service.unit.test.ts"]
  file_src_modules_report_report_types_ts["src/modules/report/report.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_modules_ts["testing/modules.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_output_json_output_json_module_ts --> file_src_modules_output_json_output_json_service_ts
  file_src_modules_output_json_output_json_service_ts --> file_src_modules_output_json_output_json_types_ts
  file_src_modules_output_json_output_json_service_unit_test_ts --> file_src_modules_output_json_output_json_service_ts
  file_src_modules_output_json_output_json_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_output_json_output_json_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_output_markdown_output_markdown_module_ts --> file_src_modules_output_markdown_output_markdown_service_ts
  file_src_modules_output_markdown_output_markdown_service_ts --> file_src_modules_output_markdown_output_markdown_constants_ts
  file_src_modules_output_markdown_output_markdown_service_ts --> file_src_modules_output_markdown_output_markdown_errors_ts
  file_src_modules_output_markdown_output_markdown_service_ts --> file_src_modules_output_markdown_output_markdown_types_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_src_modules_output_markdown_output_markdown_errors_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_src_modules_output_markdown_output_markdown_service_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_output_markdown_output_markdown_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_project_reports_project_reports_module_ts --> file_src_modules_project_reports_project_reports_service_ts
  file_src_modules_project_reports_project_reports_service_ts --> file_src_modules_project_reports_project_reports_constants_ts
  file_src_modules_project_reports_project_reports_service_ts --> file_src_modules_project_reports_project_reports_types_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_src_modules_project_reports_project_reports_service_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_src_modules_project_reports_project_reports_types_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_project_reports_project_reports_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_markdown_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_src_modules_report_markdown_report_service_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_markdown_report_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_mermaid_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_mermaid_report_service_ts --> file_src_modules_report_report_types_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_mermaid_report_service_unit_test_ts --> file_testing_modules_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_markdown_report_service_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_mermaid_report_service_ts
  file_src_modules_report_report_module_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_service_ts --> file_src_modules_report_report_constants_ts
  file_src_modules_report_report_service_unit_test_ts --> file_src_modules_report_report_service_ts
  file_src_modules_report_report_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_report_report_service_unit_test_ts --> file_testing_modules_ts
  file_testing_modules_ts --> file_src_modules_output_json_output_json_module_ts
  file_testing_modules_ts --> file_src_modules_output_markdown_output_markdown_module_ts
  file_testing_modules_ts --> file_src_modules_project_reports_project_reports_module_ts
  file_testing_modules_ts --> file_src_modules_report_report_module_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-3818-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-124.46_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-7-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-31-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-17.02_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-31-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-12-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-10-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-72-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-6-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-11-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-11-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-185-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-78-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-222-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-41-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-239-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-115-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-52-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-135-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-268-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-129-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-30-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-83-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-67-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-7-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-30-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-117-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-4-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-6-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-4-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-4-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-1-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-6-7c3aed?style=flat-square)
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
