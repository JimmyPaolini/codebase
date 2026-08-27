## Test

```bash
nx run codometer-output:vitest
```

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/codometer-output`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 80 |
| Files | 22 |
| Calls traced | 245 |
| Call stacks | 4 |
| Deepest stack | 7 |
| Stacks through recursion | 0 |
| Unfollowable calls | 5 |

### Call stacks (depth)

**1. `MarkdownService.renderBadges`** — depth 7 · orphan-root

```text
🚀 MarkdownService.renderBadges(args: RenderBadgesArguments): string [packages/codometer-output/src/modules/markdown/markdown.service.ts:257]
   ↳ Render the badge block for a destination, description and all.
  └─> MarkdownService.renderDocument(args: RenderDocumentArguments): string [packages/codometer-output/src/modules/markdown/markdown.service.ts:291]
     ↳ Render the badges as a document of their own.
    └─> MarkdownService.buildBadgeGroups(args: RenderDocumentArguments): string [packages/codometer-output/src/modules/markdown/markdown.service.ts:101]
       ↳ Assemble the badge groups, in the order they are rendered.
      └─> buildTargetsGroup(targets: readonly TargetSize[]): string [packages/codometer-output/src/modules/markdown/markdown.utilities.ts:307]
         ↳ Renders the Measured Targets badge group, one badge per measured target.
        └─> map(…)(target: TargetSize): string [packages/codometer-output/src/modules/markdown/markdown.utilities.ts:318]
          └─> formatTargetSize(target: TargetSize): string [packages/codometer-output/src/modules/markdown/markdown.utilities.ts:393]
             ↳ Formats one target's measured size, naming the compression it was measured under unless there was none.
            └─> formatBytes(bytes: number): string [packages/codometer-output/src/modules/render/render.utilities.ts:10]
               ↳ Formats a byte count, switching to megabytes once kilobytes get unwieldy.
```

**2. `RenderService.renderRow`** — depth 4 · orphan-root

```text
🚀 RenderService.renderRow(row: MetricRow): string [packages/codometer-output/src/modules/render/render.service.ts:134]
   ↳ Renders one table row.
  └─> formatDelta(delta: number | undefined, unit: MetricUnit): string [packages/codometer-output/src/modules/render/render.utilities.ts:23]
     ↳ Formats a signed delta, or an em dash when there is nothing to compare.
    └─> formatValue(value: number, unit: MetricUnit): string [packages/codometer-output/src/modules/render/render.utilities.ts:33]
       ↳ Formats a value the way its unit calls for.
      └─> formatBytes(bytes: number): string [packages/codometer-output/src/modules/render/render.utilities.ts:10]
         ↳ Formats a byte count, switching to megabytes once kilobytes get unwieldy.
```

**3. `MarkdownService.syncAnchoredBlock`** — depth ≥ 3 · orphan-root

```text
🚀 MarkdownService.syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean [packages/codometer-output/src/modules/markdown/markdown.service.ts:190]
   ↳ Splice the anchored block into a file, or report whether it is current.
  └─> MarkdownService.buildBlockRegex(args: { endMarker: string; startMarker: string; }): RegExp [packages/codometer-output/src/modules/markdown/markdown.service.ts:128]
     ↳ Build the matcher for a block delimited by the configured markers.
    └─> MarkdownService.escapeRegex(input: string): string [packages/codometer-output/src/modules/markdown/markdown.service.ts:140]
       ↳ Escape a configured marker so it can be searched for literally.
```

<details>
<summary>1 more call stacks</summary>

**4. `RenderService.renderProject`** — depth 3 · orphan-root

```text
🚀 RenderService.renderProject(…): string[] [packages/codometer-output/src/modules/render/render.service.ts:106]
   ↳ Renders one project's block, or nothing if it has nothing to show.
  └─> RenderService.readIsOpen(rows: readonly MetricRow[], failures: readonly ProjectFailure[]): boolean [packages/codometer-output/src/modules/render/render.service.ts:47]
     ↳ Whether a project's block should open expanded.
    └─> RenderService.some(…)(row: MetricRow): boolean [packages/codometer-output/src/modules/render/render.service.ts:51]
```

</details>

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `MarkdownService.buildBadgeGroups` | 16 | `MarkdownService.filter(…)`, `buildRepositoryGroup`, `buildTargetsGroup`, `buildTypescriptGroup`, `buildJavascriptGroup`, `buildPythonGroup`, `buildJsonGroup`, `buildYamlGroup`, `buildTomlGroup`, `buildShellGroup`, `buildSqlGroup`, `buildHclGroup`, `buildCssGroup`, `buildCustomGroup`, `buildJupyterGroup`, `buildMarkdownGroup` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:101` |
| `MarkdownService.syncAnchoredBlock` | 6 | `MissingMarkdownPathError.constructor`, `MarkdownService.readExisting`, `MarkdownService.wrapInAnchors`, `MarkdownService.buildBlockRegex`, `MarkdownService.writeMarkdownFile`, `MarkdownService.replace(…)` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:190` |
| `RenderService.renderSection` | 6 | `RenderService.groupByProject(…)`, `RenderService.groupByProject`, `RenderService.groupByProject(…)`, `RenderService.flatMap(…)`, `RenderService.readProjects`, `RenderService.renderComparison` | `packages/codometer-output/src/modules/render/render.service.ts:154` |

<details>
<summary>37 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `buildRepositoryGroup` | 4 | `buildGroup`, `buildBadge`, `formatBytes`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:236` |
| `RenderService.renderProject` | 4 | `RenderService.filter(…)`, `RenderService.readIsOpen`, `RenderService.renderFailures`, `RenderService.map(…)` | `packages/codometer-output/src/modules/render/render.service.ts:106` |
| `DocumentsService.emit` | 3 | `DocumentsService.wrap`, `DocumentsService.readDocument`, `DocumentsService.splice` | `packages/codometer-output/src/modules/documents/documents.service.ts:51` |
| `buildCssGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:23` |
| `buildHclGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:89` |
| `buildJsonGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:129` |
| `buildJupyterGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:150` |
| `buildMarkdownGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:179` |
| `buildPythonGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:208` |
| `buildShellGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:254` |
| `buildSqlGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:274` |
| `buildTomlGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:325` |
| `buildTypescriptGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:341` |
| `buildYamlGroup` | 3 | `buildGroup`, `buildBadge`, `buildCustomBadges` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:356` |
| `RenderService.renderRow` | 3 | `RenderService.readStatus`, `formatValue`, `formatDelta` | `packages/codometer-output/src/modules/render/render.service.ts:134` |
| `JsonService.sync` | 2 | `JsonService.render`, `JsonService.readExisting` | `packages/codometer-output/src/modules/json/json.service.ts:62` |
| `formatValue` | 2 | `formatBytes`, `formatCount` | `packages/codometer-output/src/modules/render/render.utilities.ts:33` |
| `buildCustomBadges` | 2 | `map(…)`, `filter(…)` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:47` |
| `buildCustomGroup` | 2 | `buildCustomBadges`, `buildGroup` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:64` |
| `buildJavascriptGroup` | 2 | `buildGroup`, `buildBadge` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:107` |
| `buildTargetsGroup` | 2 | `buildGroup`, `map(…)` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:307` |
| `MarkdownService.renderBlock` | 2 | `MarkdownService.wrapInAnchors`, `MarkdownService.renderContent` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:272` |
| `MarkdownService.sync` | 2 | `MarkdownService.renderContent`, `MarkdownService.buildAnchorHelpers` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:337` |
| `MarkdownService.syncDocument` | 2 | `MarkdownService.readExisting`, `MarkdownService.writeMarkdownFile` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:367` |
| `RenderService.readProjects` | 2 | `RenderService.map(…)`, `RenderService.map(…)` | `packages/codometer-output/src/modules/render/render.service.ts:55` |
| `DocumentsService.splice` | 1 | `DocumentsService.filter(…)` | `packages/codometer-output/src/modules/documents/documents.service.ts:88` |
| `formatDelta` | 1 | `formatValue` | `packages/codometer-output/src/modules/render/render.utilities.ts:23` |
| `buildBadge` | 1 | `encodeValue` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:14` |
| `map(…)` | 1 | `formatTargetSize` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:318` |
| `formatTargetSize` | 1 | `formatBytes` | `packages/codometer-output/src/modules/markdown/markdown.utilities.ts:393` |
| `MarkdownService.buildBlockRegex` | 1 | `MarkdownService.escapeRegex` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:128` |
| `MarkdownService.renderContent` | 1 | `MarkdownService.renderBadges` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:162` |
| `MarkdownService.renderBadges` | 1 | `MarkdownService.renderDocument` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:257` |
| `MarkdownService.renderDocument` | 1 | `MarkdownService.buildBadgeGroups` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:291` |
| `MarkdownService.renderDocumentationSection` | 1 | `MarkdownService.map(…)` | `packages/codometer-output/src/modules/markdown/markdown.service.ts:311` |
| `RenderService.readIsOpen` | 1 | `RenderService.some(…)` | `packages/codometer-output/src/modules/render/render.service.ts:47` |
| `RenderService.renderFailures` | 1 | `RenderService.map(…)` | `packages/codometer-output/src/modules/render/render.service.ts:89` |

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
  codometer_changes["codometer-changes"]
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_output["codometer-output"]
  logger["logger"]
  codometer_cli --> codometer_output
  codometer_output --> codometer_changes
  codometer_output --> codometer_configuration
  codometer_output --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codometer_output subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  DocumentsModule
  JsonModule
  LoggerModule([LoggerModule])
  MarkdownModule
  RenderModule
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
  file_src_modules_documents_documents_constants_ts["src/modules/documents/documents.constants.ts"]
  file_src_modules_documents_documents_module_ts["src/modules/documents/documents.module.ts"]
  file_src_modules_documents_documents_module_unit_test_ts["src/modules/documents/documents.module.unit.test.ts"]
  file_src_modules_documents_documents_service_ts["src/modules/documents/documents.service.ts"]
  file_src_modules_documents_documents_service_unit_test_ts["src/modules/documents/documents.service.unit.test.ts"]
  file_src_modules_documents_documents_types_ts["src/modules/documents/documents.types.ts"]
  file_src_modules_json_json_constants_ts["src/modules/json/json.constants.ts"]
  file_src_modules_json_json_module_ts["src/modules/json/json.module.ts"]
  file_src_modules_json_json_module_unit_test_ts["src/modules/json/json.module.unit.test.ts"]
  file_src_modules_json_json_service_ts["src/modules/json/json.service.ts"]
  file_src_modules_json_json_service_unit_test_ts["src/modules/json/json.service.unit.test.ts"]
  file_src_modules_json_json_types_ts["src/modules/json/json.types.ts"]
  file_src_modules_markdown_markdown_constants_ts["src/modules/markdown/markdown.constants.ts"]
  file_src_modules_markdown_markdown_errors_ts["src/modules/markdown/markdown.errors.ts"]
  file_src_modules_markdown_markdown_module_ts["src/modules/markdown/markdown.module.ts"]
  file_src_modules_markdown_markdown_module_unit_test_ts["src/modules/markdown/markdown.module.unit.test.ts"]
  file_src_modules_markdown_markdown_service_ts["src/modules/markdown/markdown.service.ts"]
  file_src_modules_markdown_markdown_service_unit_test_ts["src/modules/markdown/markdown.service.unit.test.ts"]
  file_src_modules_markdown_markdown_types_ts["src/modules/markdown/markdown.types.ts"]
  file_src_modules_markdown_markdown_utilities_ts["src/modules/markdown/markdown.utilities.ts"]
  file_src_modules_markdown_markdown_utilities_unit_test_ts["src/modules/markdown/markdown.utilities.unit.test.ts"]
  file_src_modules_render_render_constants_ts["src/modules/render/render.constants.ts"]
  file_src_modules_render_render_module_ts["src/modules/render/render.module.ts"]
  file_src_modules_render_render_module_unit_test_ts["src/modules/render/render.module.unit.test.ts"]
  file_src_modules_render_render_service_ts["src/modules/render/render.service.ts"]
  file_src_modules_render_render_service_unit_test_ts["src/modules/render/render.service.unit.test.ts"]
  file_src_modules_render_render_types_ts["src/modules/render/render.types.ts"]
  file_src_modules_render_render_utilities_ts["src/modules/render/render.utilities.ts"]
  file_src_modules_render_render_utilities_unit_test_ts["src/modules/render/render.utilities.unit.test.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_documents_documents_module_ts --> file_src_modules_documents_documents_service_ts
  file_src_modules_documents_documents_module_unit_test_ts --> file_src_modules_documents_documents_module_ts
  file_src_modules_documents_documents_module_unit_test_ts --> file_src_modules_documents_documents_service_ts
  file_src_modules_documents_documents_service_ts --> file_src_modules_documents_documents_types_ts
  file_src_modules_documents_documents_service_unit_test_ts --> file_src_modules_documents_documents_service_ts
  file_src_modules_documents_documents_service_unit_test_ts --> file_src_modules_documents_documents_types_ts
  file_src_modules_json_json_module_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_module_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_errors_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_utilities_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_errors_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_utilities_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_utilities_ts --> file_src_modules_render_render_utilities_ts
  file_src_modules_markdown_markdown_utilities_unit_test_ts --> file_src_modules_markdown_markdown_utilities_ts
  file_src_modules_render_render_module_ts --> file_src_modules_render_render_service_ts
  file_src_modules_render_render_module_unit_test_ts --> file_src_modules_render_render_module_ts
  file_src_modules_render_render_module_unit_test_ts --> file_src_modules_render_render_service_ts
  file_src_modules_render_render_service_ts --> file_src_modules_render_render_constants_ts
  file_src_modules_render_render_service_ts --> file_src_modules_render_render_types_ts
  file_src_modules_render_render_service_ts --> file_src_modules_render_render_utilities_ts
  file_src_modules_render_render_service_unit_test_ts --> file_src_modules_render_render_service_ts
  file_src_modules_render_render_utilities_unit_test_ts --> file_src_modules_render_render_utilities_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-3606-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-123.35_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-7-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-35-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-17.32_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-35-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-15-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-2-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-8-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-63-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-10-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-11-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-9-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-178-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-46-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-212-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-12-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-198-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-102-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-58-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-128-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-257-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-1-ca8a04?style=flat-square)

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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-125-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-29-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-79-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-66-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-6-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-31-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-114-dc2626?style=flat-square)
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
![Service Files](https://img.shields.io/badge/Service_Files-4-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-4-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-4-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-1-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-10-7c3aed?style=flat-square)
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
