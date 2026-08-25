## Test

```bash
nx run codometer-languages:vitest
```

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `codometer-languages`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 115 |
| Files | 51 |
| Calls traced | 103 |
| Call stacks | 6 |
| Deepest stack | 3 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Call stacks (depth)

**1. `TypescriptService.handleEnum`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleEnum(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:247]
   ↳ Increments enum and exported counts for an enum declaration node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-languages/src/modules/typescript/typescript.service.ts:343]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-languages/src/modules/typescript/typescript.service.ts:349]
```

**2. `TypescriptService.handleFunction`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleFunction(node: tsCompiler.Node, stats: TypescriptResult, insideClass: boolean): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:253]
   ↳ Increments function, method, async, sync, exported, and generic counts for a function node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-languages/src/modules/typescript/typescript.service.ts:343]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-languages/src/modules/typescript/typescript.service.ts:349]
```

**3. `TypescriptService.handleInterface`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleInterface(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:287]
   ↳ Increments interface, exported, and generic counts for an interface declaration node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-languages/src/modules/typescript/typescript.service.ts:343]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-languages/src/modules/typescript/typescript.service.ts:349]
```

<details>
<summary>3 more call stacks</summary>

**4. `TypescriptService.handleMethodOrAccessor`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleMethodOrAccessor(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:297]
   ↳ Increments method and async or sync counts for a method or accessor node.
  └─> TypescriptService.hasAsyncKeyword(node: tsCompiler.Node): boolean [packages/codometer-languages/src/modules/typescript/typescript.service.ts:331]
     ↳ Returns true when the node has an async modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.AsyncKeyword [packages/codometer-languages/src/modules/typescript/typescript.service.ts:337]
```

**5. `TypescriptService.handleTypeAlias`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleTypeAlias(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:310]
   ↳ Increments exported and generic counts for a type alias declaration node.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-languages/src/modules/typescript/typescript.service.ts:343]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-languages/src/modules/typescript/typescript.service.ts:349]
```

**6. `TypescriptService.handleVariable`** — depth 3 · orphan-root

```text
🚀 TypescriptService.handleVariable(node: tsCompiler.Node, stats: TypescriptResult): void [packages/codometer-languages/src/modules/typescript/typescript.service.ts:319]
   ↳ Increments constant and exported counts for a const variable statement.
  └─> TypescriptService.hasExportKeyword(node: tsCompiler.Node): boolean [packages/codometer-languages/src/modules/typescript/typescript.service.ts:343]
     ↳ Returns true when the node has an export modifier keyword.
    └─> TypescriptService.some(…)(modifier: tsCompiler.Modifier): modifier is tsCompiler.ExportKeyword [packages/codometer-languages/src/modules/typescript/typescript.service.ts:349]
```

</details>

### Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `LanguagesService.analyze` | 12 | `codometer-languages:modules/css`, `codometer-languages:modules/hcl`, `codometer-languages:modules/json`, `codometer-languages:modules/jupyter`, `codometer-languages:modules/markdown`, `codometer-languages:modules/python`, `codometer-languages:modules/shell`, `codometer-languages:modules/sql`, `codometer-languages:modules/toml`, `codometer-languages:modules/typescript`, `codometer-languages:modules/yaml` | `packages/codometer-languages/src/modules/languages/languages.service.ts:54` |

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `LanguagesService.analyze` | 11 | `CssService.analyze`, `HclService.analyze`, `JsonService.analyze`, `JupyterService.analyze`, `MarkdownService.analyze`, `PythonService.analyze`, `ShellService.analyze`, `SqlService.analyze`, `TomlService.analyze`, `TypescriptService.analyze`, `YamlService.analyze` | `packages/codometer-languages/src/modules/languages/languages.service.ts:54` |
| `JsonService.countNode` | 5 | `JsonService.isArrayNode`, `JsonService.countArrayNode`, `JsonService.isRecordNode`, `JsonService.countRecordNode`, `JsonService.countPrimitiveNode` | `packages/codometer-languages/src/modules/json/json.service.ts:111` |
| `JupyterService.analyze` | 5 | `JupyterService.collectParts`, `JsonService.analyze`, `PythonService.analyzeContents`, `MarkdownService.analyzeContents`, `JupyterService.countHeadings` | `packages/codometer-languages/src/modules/jupyter/jupyter.service.ts:166` |

<details>
<summary>45 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `TypescriptService.walkNode` | 5 | `TypescriptService.countSymbols`, `TypescriptService.handleClass`, `TypescriptService.forEachChild(…)`, `TypescriptService.dispatchNode`, `TypescriptService.forEachChild(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:390` |
| `JsonService.consumeJsoncCharacter` | 4 | `JsonService.handleLineCommentState`, `JsonService.handleBlockCommentState`, `JsonService.handleStringState`, `JsonService.consumeCharacterOutsideComments` | `packages/codometer-languages/src/modules/json/json.service.ts:66` |
| `TypescriptService.createEmptyResult` | 4 | `TypescriptService.filter(…)`, `TypescriptService.map(…)`, `TypescriptService.filter(…)`, `TypescriptService.filter(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:161` |
| `JsonService.parseDocuments` | 3 | `JsonService.map(…)`, `JsonService.filter(…)`, `JsonService.stripJsoncComments` | `packages/codometer-languages/src/modules/json/json.service.ts:258` |
| `JsonService.analyze` | 3 | `JsonService.filter(…)`, `JsonService.parseDocuments`, `JsonService.countNode` | `packages/codometer-languages/src/modules/json/json.service.ts:308` |
| `SqlService.analyze` | 3 | `SqlService.stripComments`, `SqlService.filter(…)`, `SqlService.countKeywords` | `packages/codometer-languages/src/modules/sql/sql.service.ts:63` |
| `TypescriptService.analyzeFile` | 3 | `TypescriptService.getScriptKind`, `TypescriptService.scanComments`, `TypescriptService.walkNode` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:77` |
| `TypescriptService.handleFunction` | 3 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasAsyncKeyword`, `TypescriptService.hasTypeParameters` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:253` |
| `TypescriptService.analyze` | 3 | `TypescriptService.createEmptyResult`, `TypescriptService.analyzeFile`, `TypescriptService.getCountersForFile` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:415` |
| `MarkdownService.countNode` | 2 | `MarkdownService.countHeading`, `MarkdownService.countListItem` | `packages/codometer-languages/src/modules/markdown/markdown.service.ts:62` |
| `PythonService.analyzeContents` | 2 | `PythonService.map(…)`, `PythonService.analyze` | `packages/codometer-languages/src/modules/python/python.service.ts:87` |
| `JupyterService.collectParts` | 2 | `JupyterService.readNotebook`, `JupyterService.collectCell` | `packages/codometer-languages/src/modules/jupyter/jupyter.service.ts:88` |
| `SqlService.stripComments` | 2 | `SqlService.replaceAll(…)`, `SqlService.replaceAll(…)` | `packages/codometer-languages/src/modules/sql/sql.service.ts:48` |
| `TomlService.analyze` | 2 | `TomlService.countLine`, `TomlService.isInsideMultilineString` | `packages/codometer-languages/src/modules/toml/toml.service.ts:98` |
| `TypescriptService.countSymbols` | 2 | `TypescriptService.getSymbolModifiers`, `TypescriptService.every(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:131` |
| `TypescriptService.handleClass` | 2 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasTypeParameters` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:240` |
| `TypescriptService.handleInterface` | 2 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasTypeParameters` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:287` |
| `TypescriptService.handleTypeAlias` | 2 | `TypescriptService.hasExportKeyword`, `TypescriptService.hasTypeParameters` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:310` |
| `YamlService.countDocument` | 2 | `YamlService.countComments`, `YamlService.countNode` | `packages/codometer-languages/src/modules/yaml/yaml.service.ts:88` |
| `YamlService.countNode` | 2 | `YamlService.countComments`, `YamlService.countCollection` | `packages/codometer-languages/src/modules/yaml/yaml.service.ts:95` |
| `CssService.analyze` | 1 | `CssService.walk(…)` | `packages/codometer-languages/src/modules/css/css.service.ts:74` |
| `CssService.walk(…)` | 1 | `CssService.countNode` | `packages/codometer-languages/src/modules/css/css.service.ts:88` |
| `HclService.countLine` | 1 | `HclService.countBlock` | `packages/codometer-languages/src/modules/hcl/hcl.service.ts:60` |
| `HclService.analyze` | 1 | `HclService.countLine` | `packages/codometer-languages/src/modules/hcl/hcl.service.ts:87` |
| `JsonService.countArrayNode` | 1 | `JsonService.countNode` | `packages/codometer-languages/src/modules/json/json.service.ts:95` |
| `JsonService.countPrimitiveNode` | 1 | `JsonService.countPrimitiveValue` | `packages/codometer-languages/src/modules/json/json.service.ts:126` |
| `JsonService.countRecordNode` | 1 | `JsonService.countNode` | `packages/codometer-languages/src/modules/json/json.service.ts:162` |
| `JsonService.stripJsoncComments` | 1 | `JsonService.consumeJsoncCharacter` | `packages/codometer-languages/src/modules/json/json.service.ts:273` |
| `MarkdownService.walk` | 1 | `MarkdownService.countNode` | `packages/codometer-languages/src/modules/markdown/markdown.service.ts:81` |
| `MarkdownService.analyze` | 1 | `MarkdownService.analyzeContents` | `packages/codometer-languages/src/modules/markdown/markdown.service.ts:98` |
| `MarkdownService.analyzeContents` | 1 | `MarkdownService.walk` | `packages/codometer-languages/src/modules/markdown/markdown.service.ts:126` |
| `JupyterService.collectCell` | 1 | `JupyterService.readSource` | `packages/codometer-languages/src/modules/jupyter/jupyter.service.ts:57` |
| `ShellService.countLine` | 1 | `ShellService.countStatements` | `packages/codometer-languages/src/modules/shell/shell.service.ts:45` |
| `ShellService.analyze` | 1 | `ShellService.countLine` | `packages/codometer-languages/src/modules/shell/shell.service.ts:93` |
| `TomlService.countLine` | 1 | `TomlService.countKey` | `packages/codometer-languages/src/modules/toml/toml.service.ts:61` |
| `TypescriptService.getCountersForFile` | 1 | `TypescriptService.filter(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:195` |
| `TypescriptService.filter(…)` | 1 | `TypescriptService.some(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:200` |
| `TypescriptService.handleEnum` | 1 | `TypescriptService.hasExportKeyword` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:247` |
| `TypescriptService.handleMethodOrAccessor` | 1 | `TypescriptService.hasAsyncKeyword` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:297` |
| `TypescriptService.handleVariable` | 1 | `TypescriptService.hasExportKeyword` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:319` |
| `TypescriptService.hasAsyncKeyword` | 1 | `TypescriptService.some(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:331` |
| `TypescriptService.hasExportKeyword` | 1 | `TypescriptService.some(…)` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:343` |
| `TypescriptService.scanComments` | 1 | `TypescriptService.countComment` | `packages/codometer-languages/src/modules/typescript/typescript.service.ts:367` |
| `YamlService.countCollection` | 1 | `YamlService.countNode` | `packages/codometer-languages/src/modules/yaml/yaml.service.ts:46` |
| `YamlService.analyze` | 1 | `YamlService.countDocument` | `packages/codometer-languages/src/modules/yaml/yaml.service.ts:123` |

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
  codometer_cli["codometer-cli"]
  codometer_configuration["codometer-configuration"]
  codometer_customization["codometer-customization"]
  codometer_languages["codometer-languages"]
  logger["logger"]
  codometer_cli --> codometer_languages
  codometer_customization --> codometer_languages
  codometer_languages --> codometer_configuration
  codometer_languages --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class codometer_languages subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  CssModule
  HclModule
  JsonModule
  JupyterModule
  LanguagesModule
  LoggerModule([LoggerModule])
  MarkdownModule
  PythonModule
  ShellModule
  SqlModule
  TomlModule
  TypescriptModule
  YamlModule
  JupyterModule --> JsonModule
  JupyterModule --> MarkdownModule
  JupyterModule --> PythonModule
  LanguagesModule --> CssModule
  LanguagesModule --> HclModule
  LanguagesModule --> JsonModule
  LanguagesModule --> JupyterModule
  LanguagesModule --> MarkdownModule
  LanguagesModule --> PythonModule
  LanguagesModule --> ShellModule
  LanguagesModule --> SqlModule
  LanguagesModule --> TomlModule
  LanguagesModule --> TypescriptModule
  LanguagesModule --> YamlModule
```

_Rounded modules are global: every module can inject them, so their edges are left out._
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_css_css_constants_ts["src/modules/css/css.constants.ts"]
  file_src_modules_css_css_module_ts["src/modules/css/css.module.ts"]
  file_src_modules_css_css_module_unit_test_ts["src/modules/css/css.module.unit.test.ts"]
  file_src_modules_css_css_service_ts["src/modules/css/css.service.ts"]
  file_src_modules_css_css_service_unit_test_ts["src/modules/css/css.service.unit.test.ts"]
  file_src_modules_css_css_types_ts["src/modules/css/css.types.ts"]
  file_src_modules_hcl_hcl_constants_ts["src/modules/hcl/hcl.constants.ts"]
  file_src_modules_hcl_hcl_module_ts["src/modules/hcl/hcl.module.ts"]
  file_src_modules_hcl_hcl_module_unit_test_ts["src/modules/hcl/hcl.module.unit.test.ts"]
  file_src_modules_hcl_hcl_service_ts["src/modules/hcl/hcl.service.ts"]
  file_src_modules_hcl_hcl_service_unit_test_ts["src/modules/hcl/hcl.service.unit.test.ts"]
  file_src_modules_hcl_hcl_types_ts["src/modules/hcl/hcl.types.ts"]
  file_src_modules_json_json_constants_ts["src/modules/json/json.constants.ts"]
  file_src_modules_json_json_module_ts["src/modules/json/json.module.ts"]
  file_src_modules_json_json_module_unit_test_ts["src/modules/json/json.module.unit.test.ts"]
  file_src_modules_json_json_service_ts["src/modules/json/json.service.ts"]
  file_src_modules_json_json_service_unit_test_ts["src/modules/json/json.service.unit.test.ts"]
  file_src_modules_json_json_types_ts["src/modules/json/json.types.ts"]
  file_src_modules_jupyter_jupyter_constants_ts["src/modules/jupyter/jupyter.constants.ts"]
  file_src_modules_jupyter_jupyter_module_ts["src/modules/jupyter/jupyter.module.ts"]
  file_src_modules_jupyter_jupyter_module_unit_test_ts["src/modules/jupyter/jupyter.module.unit.test.ts"]
  file_src_modules_jupyter_jupyter_service_ts["src/modules/jupyter/jupyter.service.ts"]
  file_src_modules_jupyter_jupyter_service_unit_test_ts["src/modules/jupyter/jupyter.service.unit.test.ts"]
  file_src_modules_jupyter_jupyter_types_ts["src/modules/jupyter/jupyter.types.ts"]
  file_src_modules_languages_languages_constants_ts["src/modules/languages/languages.constants.ts"]
  file_src_modules_languages_languages_module_ts["src/modules/languages/languages.module.ts"]
  file_src_modules_languages_languages_module_unit_test_ts["src/modules/languages/languages.module.unit.test.ts"]
  file_src_modules_languages_languages_service_ts["src/modules/languages/languages.service.ts"]
  file_src_modules_languages_languages_service_unit_test_ts["src/modules/languages/languages.service.unit.test.ts"]
  file_src_modules_languages_languages_types_ts["src/modules/languages/languages.types.ts"]
  file_src_modules_markdown_markdown_constants_ts["src/modules/markdown/markdown.constants.ts"]
  file_src_modules_markdown_markdown_module_ts["src/modules/markdown/markdown.module.ts"]
  file_src_modules_markdown_markdown_module_unit_test_ts["src/modules/markdown/markdown.module.unit.test.ts"]
  file_src_modules_markdown_markdown_service_ts["src/modules/markdown/markdown.service.ts"]
  file_src_modules_markdown_markdown_service_unit_test_ts["src/modules/markdown/markdown.service.unit.test.ts"]
  file_src_modules_markdown_markdown_types_ts["src/modules/markdown/markdown.types.ts"]
  file_src_modules_python_python_constants_ts["src/modules/python/python.constants.ts"]
  file_src_modules_python_python_module_ts["src/modules/python/python.module.ts"]
  file_src_modules_python_python_module_unit_test_ts["src/modules/python/python.module.unit.test.ts"]
  file_src_modules_python_python_service_ts["src/modules/python/python.service.ts"]
  file_src_modules_python_python_service_unit_test_ts["src/modules/python/python.service.unit.test.ts"]
  file_src_modules_python_python_types_ts["src/modules/python/python.types.ts"]
  file_src_modules_shell_shell_constants_ts["src/modules/shell/shell.constants.ts"]
  file_src_modules_shell_shell_module_ts["src/modules/shell/shell.module.ts"]
  file_src_modules_shell_shell_module_unit_test_ts["src/modules/shell/shell.module.unit.test.ts"]
  file_src_modules_shell_shell_service_ts["src/modules/shell/shell.service.ts"]
  file_src_modules_shell_shell_service_unit_test_ts["src/modules/shell/shell.service.unit.test.ts"]
  file_src_modules_shell_shell_types_ts["src/modules/shell/shell.types.ts"]
  file_src_modules_sql_sql_constants_ts["src/modules/sql/sql.constants.ts"]
  file_src_modules_sql_sql_module_ts["src/modules/sql/sql.module.ts"]
  file_src_modules_sql_sql_module_unit_test_ts["src/modules/sql/sql.module.unit.test.ts"]
  file_src_modules_sql_sql_service_ts["src/modules/sql/sql.service.ts"]
  file_src_modules_sql_sql_service_unit_test_ts["src/modules/sql/sql.service.unit.test.ts"]
  file_src_modules_sql_sql_types_ts["src/modules/sql/sql.types.ts"]
  file_src_modules_toml_toml_constants_ts["src/modules/toml/toml.constants.ts"]
  file_src_modules_toml_toml_module_ts["src/modules/toml/toml.module.ts"]
  file_src_modules_toml_toml_module_unit_test_ts["src/modules/toml/toml.module.unit.test.ts"]
  file_src_modules_toml_toml_service_ts["src/modules/toml/toml.service.ts"]
  file_src_modules_toml_toml_service_unit_test_ts["src/modules/toml/toml.service.unit.test.ts"]
  file_src_modules_toml_toml_types_ts["src/modules/toml/toml.types.ts"]
  file_src_modules_typescript_typescript_constants_ts["src/modules/typescript/typescript.constants.ts"]
  file_src_modules_typescript_typescript_module_ts["src/modules/typescript/typescript.module.ts"]
  file_src_modules_typescript_typescript_module_unit_test_ts["src/modules/typescript/typescript.module.unit.test.ts"]
  file_src_modules_typescript_typescript_service_ts["src/modules/typescript/typescript.service.ts"]
  file_src_modules_typescript_typescript_service_unit_test_ts["src/modules/typescript/typescript.service.unit.test.ts"]
  file_src_modules_typescript_typescript_types_ts["src/modules/typescript/typescript.types.ts"]
  file_src_modules_yaml_yaml_constants_ts["src/modules/yaml/yaml.constants.ts"]
  file_src_modules_yaml_yaml_module_ts["src/modules/yaml/yaml.module.ts"]
  file_src_modules_yaml_yaml_module_unit_test_ts["src/modules/yaml/yaml.module.unit.test.ts"]
  file_src_modules_yaml_yaml_service_ts["src/modules/yaml/yaml.service.ts"]
  file_src_modules_yaml_yaml_service_unit_test_ts["src/modules/yaml/yaml.service.unit.test.ts"]
  file_src_modules_yaml_yaml_types_ts["src/modules/yaml/yaml.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_css_css_constants_ts --> file_src_modules_css_css_types_ts
  file_src_modules_css_css_module_ts --> file_src_modules_css_css_service_ts
  file_src_modules_css_css_module_unit_test_ts --> file_src_modules_css_css_module_ts
  file_src_modules_css_css_module_unit_test_ts --> file_src_modules_css_css_service_ts
  file_src_modules_css_css_service_ts --> file_src_modules_css_css_constants_ts
  file_src_modules_css_css_service_ts --> file_src_modules_css_css_types_ts
  file_src_modules_css_css_service_unit_test_ts --> file_src_modules_css_css_service_ts
  file_src_modules_hcl_hcl_constants_ts --> file_src_modules_hcl_hcl_types_ts
  file_src_modules_hcl_hcl_module_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_hcl_hcl_module_unit_test_ts --> file_src_modules_hcl_hcl_module_ts
  file_src_modules_hcl_hcl_module_unit_test_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_hcl_hcl_service_ts --> file_src_modules_hcl_hcl_constants_ts
  file_src_modules_hcl_hcl_service_ts --> file_src_modules_hcl_hcl_types_ts
  file_src_modules_hcl_hcl_service_unit_test_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_json_json_constants_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_module_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_module_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_constants_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_constants_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_python_python_module_ts
  file_src_modules_jupyter_jupyter_module_unit_test_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_jupyter_jupyter_module_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_constants_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_python_python_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_css_css_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_hcl_hcl_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_python_python_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_shell_shell_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_sql_sql_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_toml_toml_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_yaml_yaml_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_languages_languages_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_css_css_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_json_json_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_languages_languages_types_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_css_css_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_hcl_hcl_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_languages_languages_types_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_css_css_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_hcl_hcl_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_json_json_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_python_python_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_shell_shell_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_sql_sql_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_toml_toml_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_languages_languages_types_ts --> file_src_modules_yaml_yaml_types_ts
  file_src_modules_markdown_markdown_constants_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_python_python_constants_ts --> file_src_modules_python_python_types_ts
  file_src_modules_python_python_module_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_module_unit_test_ts --> file_src_modules_python_python_module_ts
  file_src_modules_python_python_module_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_service_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_python_python_service_ts --> file_src_modules_python_python_types_ts
  file_src_modules_python_python_service_unit_test_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_python_python_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_shell_shell_constants_ts --> file_src_modules_shell_shell_types_ts
  file_src_modules_shell_shell_module_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_shell_shell_module_unit_test_ts --> file_src_modules_shell_shell_module_ts
  file_src_modules_shell_shell_module_unit_test_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_shell_shell_service_ts --> file_src_modules_shell_shell_constants_ts
  file_src_modules_shell_shell_service_ts --> file_src_modules_shell_shell_types_ts
  file_src_modules_shell_shell_service_unit_test_ts --> file_src_modules_shell_shell_service_ts
  file_src_modules_sql_sql_constants_ts --> file_src_modules_sql_sql_types_ts
  file_src_modules_sql_sql_module_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_sql_sql_module_unit_test_ts --> file_src_modules_sql_sql_module_ts
  file_src_modules_sql_sql_module_unit_test_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_sql_sql_service_ts --> file_src_modules_sql_sql_constants_ts
  file_src_modules_sql_sql_service_ts --> file_src_modules_sql_sql_types_ts
  file_src_modules_sql_sql_service_unit_test_ts --> file_src_modules_sql_sql_service_ts
  file_src_modules_toml_toml_constants_ts --> file_src_modules_toml_toml_types_ts
  file_src_modules_toml_toml_module_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_toml_toml_module_unit_test_ts --> file_src_modules_toml_toml_module_ts
  file_src_modules_toml_toml_module_unit_test_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_toml_toml_service_ts --> file_src_modules_toml_toml_constants_ts
  file_src_modules_toml_toml_service_ts --> file_src_modules_toml_toml_types_ts
  file_src_modules_toml_toml_service_unit_test_ts --> file_src_modules_toml_toml_service_ts
  file_src_modules_typescript_typescript_constants_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_constants_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_yaml_yaml_constants_ts --> file_src_modules_yaml_yaml_types_ts
  file_src_modules_yaml_yaml_module_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_yaml_yaml_module_unit_test_ts --> file_src_modules_yaml_yaml_module_ts
  file_src_modules_yaml_yaml_module_unit_test_ts --> file_src_modules_yaml_yaml_service_ts
  file_src_modules_yaml_yaml_service_ts --> file_src_modules_yaml_yaml_constants_ts
  file_src_modules_yaml_yaml_service_ts --> file_src_modules_yaml_yaml_types_ts
  file_src_modules_yaml_yaml_service_unit_test_ts --> file_src_modules_yaml_yaml_service_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-6601-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-197.94_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-15-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-78-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-30.05_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-77-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-31-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-24-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-158-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-24-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-20-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-24-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-222-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-103-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-304-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-21-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-367-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-350-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-94-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-342-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-471-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-3-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-1-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-79-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-2-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-6-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-1-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-6-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-1-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-1-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-137-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-30-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-12-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-90-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-76-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-6-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-31-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-125-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-12-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-12-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-12-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-12-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![Errors Files](https://img.shields.io/badge/Errors_Files-0-059669?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-ca8a04?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-24-7c3aed?style=flat-square)
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
