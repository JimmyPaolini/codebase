# 👔 Conformetry Core

The shared contract every other [Conformetry](../conformetry-cli/README.md)
package builds on. It is a leaf by design — it depends on nothing else in the
conformetry graph, so every other package can depend on it without a cycle.

```bash
npm install --save-dev @conformetry/core
```

## What it owns

| Module | Responsibility |
| ------ | -------------- |
| `errors` | The structured `ConformetryError` shape, plus builders and guards for it |
| `language` | The language validator contract and the shared execution envelope |
| `reporting` | Rendering conformance errors as readable, actionable text |
| `scoring` | The conformance arithmetic: what a finding weighs, what a weight pair scores |

"Language" here means a validator for one file format — TypeScript, JSON,
markdown, Python. The word "plugin" is reserved for the Nx plugin in
[`@conformetry/nx`](../conformetry-nx/README.md), and is deliberately not used
for these.

## Writing a language validator

A validator supplies a descriptor and a single-document comparison. Extension
filtering, grouping errors under their file, and assembling the result are
handled once by `LanguageService`, so a language package contains only its
comparison logic:

```ts
@Injectable()
export class ExampleValidatorService implements ConformetryLanguageValidator {
  public readonly descriptor = EXAMPLE_VALIDATOR_DESCRIPTOR;

  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    // compare document.renderedTemplate against document.instance
    return { errors, totalWeight };
  }
}
```

## Weight and score

A validator reports how much the template asked for alongside what it found.
`totalWeight` counts every requirement the comparison weighed — conforming ones
included, because leaving them out would score an instance only against the
parts of itself that are already wrong.

Each error may carry a `weight`, defaulting to 1. It says how many requirements
that one finding stands in for: a validator reports a missing class once,
however many members it held, so weighing the finding by its subtree is what
keeps deleting a class from costing the same as deleting an import. No per-kind
weight table is needed — a class is worth more because it contains more.

```text
score = (totalWeight - sum(error.weight ?? 1)) / totalWeight
```

`ScoringService` owns that arithmetic, including the two cases worth getting
right once: the default weight of a finding that declares none, and an empty
template whose denominator is zero and which therefore conforms perfectly.

[`@conformetry/validation`](../conformetry-validation/README.md) drives the
registered validators; they are never responsible for discovering files or
loading configuration.

## Structured errors

Errors carry the location on both sides — instance and template — along with
the expected value and a concrete `fix`. That last field is the point: reports
are meant to be actionable by whoever, or whatever, has to make the file
conform. Prefer populating `instanceLine`/`templateLine` (or `instancePath` for
document formats) over folding a location into the message.

## Exports

`ErrorsService`, `LanguageService`, `ReportingService`, `ScoringService` and
their modules, plus the `ConformetryError`, `ConformetryLanguageValidator`,
`DocumentValidationResult`, `InstanceScore`, `LanguageValidatorDescriptor`,
`PreparedValidationDocument`, `ValidationFileResult`, and `WeightedFinding`
types.

## Test

```bash
nx run conformetry-core:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/conformetry-core`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 51 |
| Files | 24 |
| Calls traced | 43 |
| Call stacks | 0 |
| Deepest stack | 0 |
| Stacks through recursion | 0 |
| Unfollowable calls | 1 |

### Call stacks (depth)

None.

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `LanguageService.runValidator` | 4 | `LanguageService.map(…)`, `LanguageService.filter(…)`, `LanguageService.filter(…)`, `LanguageService.reduce(…)` | `packages/conformetry-core/src/modules/language/language.service.ts:81` |
| `ReportingService.formatTotal` | 4 | `ReportingService.reduce(…)`, `ReportingService.reduce(…)`, `ReportingService.filter(…)`, `ReportingService.formatFraction` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:233` |
| `ReportingService.formatFileResult` | 3 | `ReportingService.formatFraction`, `ScoringService.sumWeights`, `ReportingService.flatMap(…)` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:97` |

<details>
<summary>25 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `ReportingService.formatScores` | 3 | `ReportingService.filter(…)`, `ReportingService.map(…)`, `ReportingService.formatTotal` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:196` |
| `ReportingService.formatFraction` | 2 | `ScoringService.calculateScore`, `ReportingService.formatPercentage` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:130` |
| `ReportingService.formatScore` | 2 | `ReportingService.formatPercentage`, `ReportingService.formatFraction` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:165` |
| `ReportingService.formatReport` | 2 | `ReportingService.formatScores`, `ReportingService.flatMap(…)` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:261` |
| `DifferencesService.resolveDifferenceType` | 1 | `DifferencesService.find(…)` | `packages/conformetry-core/src/modules/differences/differences.service.ts:76` |
| `DifferencesService.resolveErrorLanguage` | 1 | `DifferencesService.find(…)` | `packages/conformetry-core/src/modules/differences/differences.service.ts:89` |
| `InventoryService.describePairing` | 1 | `InventoryService.formatRatio` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:48` |
| `InventoryService.describeInstances` | 1 | `InventoryService.flatMap(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:77` |
| `InventoryService.flatMap(…)` | 1 | `InventoryService.map(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:78` |
| `InventoryService.map(…)` | 1 | `InventoryService.describePairing` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:82` |
| `InventoryService.describeTemplates` | 1 | `InventoryService.flatMap(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:94` |
| `InventoryService.flatMap(…)` | 1 | `InventoryService.map(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:98` |
| `InventoryService.map(…)` | 1 | `InventoryService.describePairing` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:109` |
| `InventoryService.shortenInstancePaths` | 1 | `InventoryService.map(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:120` |
| `InventoryService.map(…)` | 1 | `InventoryService.shortenPath` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:124` |
| `InventoryService.shortenTemplatePairings` | 1 | `InventoryService.map(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:136` |
| `InventoryService.map(…)` | 1 | `InventoryService.map(…)` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:140` |
| `InventoryService.map(…)` | 1 | `InventoryService.shortenPath` | `packages/conformetry-core/src/modules/inventory/inventory.service.ts:143` |
| `LanguageService.filter(…)` | 1 | `LanguageService.claimsDocument` | `packages/conformetry-core/src/modules/language/language.service.ts:85` |
| `LanguageService.map(…)` | 1 | `LanguageService.validateDocument` | `packages/conformetry-core/src/modules/language/language.service.ts:88` |
| `ScoringService.sumWeights` | 1 | `ScoringService.reduce(…)` | `packages/conformetry-core/src/modules/scoring/scoring.service.ts:53` |
| `ReportingService.formatError` | 1 | `ReportingService.formatLocation` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:53` |
| `ReportingService.flatMap(…)` | 1 | `ReportingService.formatError` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:114` |
| `ReportingService.map(…)` | 1 | `ReportingService.formatScore` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:210` |
| `ReportingService.flatMap(…)` | 1 | `ReportingService.formatFileResult` | `packages/conformetry-core/src/modules/reporting/reporting.service.ts:273` |

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
  conformetry_cli["conformetry-cli"]
  conformetry_configuration["conformetry-configuration"]
  conformetry_core["conformetry-core"]
  conformetry_examples["conformetry-examples"]
  conformetry_files["conformetry-files"]
  conformetry_json["conformetry-json"]
  conformetry_jupyter["conformetry-jupyter"]
  conformetry_markdown["conformetry-markdown"]
  conformetry_nx["conformetry-nx"]
  conformetry_python["conformetry-python"]
  conformetry_text["conformetry-text"]
  conformetry_typescript["conformetry-typescript"]
  conformetry_validation["conformetry-validation"]
  conformetry_cli --> conformetry_core
  conformetry_configuration --> conformetry_core
  conformetry_examples --> conformetry_core
  conformetry_files --> conformetry_core
  conformetry_json --> conformetry_core
  conformetry_jupyter --> conformetry_core
  conformetry_markdown --> conformetry_core
  conformetry_nx --> conformetry_core
  conformetry_python --> conformetry_core
  conformetry_text --> conformetry_core
  conformetry_typescript --> conformetry_core
  conformetry_validation --> conformetry_core
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_core subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  DifferencesModule
  InventoryModule
  LanguageModule
  ReportingModule
  ScoringModule
  ReportingModule --> ScoringModule
```
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_differences_differences_constants_ts["src/modules/differences/differences.constants.ts"]
  file_src_modules_differences_differences_module_ts["src/modules/differences/differences.module.ts"]
  file_src_modules_differences_differences_module_unit_test_ts["src/modules/differences/differences.module.unit.test.ts"]
  file_src_modules_differences_differences_service_ts["src/modules/differences/differences.service.ts"]
  file_src_modules_differences_differences_service_unit_test_ts["src/modules/differences/differences.service.unit.test.ts"]
  file_src_modules_differences_differences_types_ts["src/modules/differences/differences.types.ts"]
  file_src_modules_inventory_inventory_constants_ts["src/modules/inventory/inventory.constants.ts"]
  file_src_modules_inventory_inventory_module_ts["src/modules/inventory/inventory.module.ts"]
  file_src_modules_inventory_inventory_module_unit_test_ts["src/modules/inventory/inventory.module.unit.test.ts"]
  file_src_modules_inventory_inventory_service_ts["src/modules/inventory/inventory.service.ts"]
  file_src_modules_inventory_inventory_service_unit_test_ts["src/modules/inventory/inventory.service.unit.test.ts"]
  file_src_modules_inventory_inventory_types_ts["src/modules/inventory/inventory.types.ts"]
  file_src_modules_language_language_constants_ts["src/modules/language/language.constants.ts"]
  file_src_modules_language_language_module_ts["src/modules/language/language.module.ts"]
  file_src_modules_language_language_module_unit_test_ts["src/modules/language/language.module.unit.test.ts"]
  file_src_modules_language_language_service_ts["src/modules/language/language.service.ts"]
  file_src_modules_language_language_service_unit_test_ts["src/modules/language/language.service.unit.test.ts"]
  file_src_modules_language_language_types_ts["src/modules/language/language.types.ts"]
  file_src_modules_reporting_reporting_constants_ts["src/modules/reporting/reporting.constants.ts"]
  file_src_modules_reporting_reporting_module_ts["src/modules/reporting/reporting.module.ts"]
  file_src_modules_reporting_reporting_module_unit_test_ts["src/modules/reporting/reporting.module.unit.test.ts"]
  file_src_modules_reporting_reporting_service_ts["src/modules/reporting/reporting.service.ts"]
  file_src_modules_reporting_reporting_service_unit_test_ts["src/modules/reporting/reporting.service.unit.test.ts"]
  file_src_modules_reporting_reporting_types_ts["src/modules/reporting/reporting.types.ts"]
  file_src_modules_scoring_scoring_constants_ts["src/modules/scoring/scoring.constants.ts"]
  file_src_modules_scoring_scoring_module_ts["src/modules/scoring/scoring.module.ts"]
  file_src_modules_scoring_scoring_module_unit_test_ts["src/modules/scoring/scoring.module.unit.test.ts"]
  file_src_modules_scoring_scoring_service_ts["src/modules/scoring/scoring.service.ts"]
  file_src_modules_scoring_scoring_service_unit_test_ts["src/modules/scoring/scoring.service.unit.test.ts"]
  file_src_modules_scoring_scoring_types_ts["src/modules/scoring/scoring.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_differences_differences_constants_ts --> file_src_modules_differences_differences_types_ts
  file_src_modules_differences_differences_module_ts --> file_src_modules_differences_differences_service_ts
  file_src_modules_differences_differences_module_unit_test_ts --> file_src_modules_differences_differences_module_ts
  file_src_modules_differences_differences_module_unit_test_ts --> file_src_modules_differences_differences_service_ts
  file_src_modules_differences_differences_service_ts --> file_src_modules_differences_differences_constants_ts
  file_src_modules_differences_differences_service_ts --> file_src_modules_differences_differences_types_ts
  file_src_modules_differences_differences_service_unit_test_ts --> file_src_modules_differences_differences_service_ts
  file_src_modules_inventory_inventory_module_ts --> file_src_modules_inventory_inventory_service_ts
  file_src_modules_inventory_inventory_module_unit_test_ts --> file_src_modules_inventory_inventory_module_ts
  file_src_modules_inventory_inventory_module_unit_test_ts --> file_src_modules_inventory_inventory_service_ts
  file_src_modules_inventory_inventory_service_ts --> file_src_modules_inventory_inventory_constants_ts
  file_src_modules_inventory_inventory_service_ts --> file_src_modules_inventory_inventory_types_ts
  file_src_modules_inventory_inventory_service_unit_test_ts --> file_src_modules_inventory_inventory_service_ts
  file_src_modules_inventory_inventory_service_unit_test_ts --> file_src_modules_inventory_inventory_types_ts
  file_src_modules_language_language_module_ts --> file_src_modules_language_language_service_ts
  file_src_modules_language_language_module_unit_test_ts --> file_src_modules_language_language_module_ts
  file_src_modules_language_language_module_unit_test_ts --> file_src_modules_language_language_service_ts
  file_src_modules_language_language_service_ts --> file_src_modules_language_language_types_ts
  file_src_modules_language_language_service_unit_test_ts --> file_src_modules_language_language_service_ts
  file_src_modules_language_language_service_unit_test_ts --> file_src_modules_language_language_types_ts
  file_src_modules_language_language_types_ts --> file_src_modules_differences_differences_types_ts
  file_src_modules_reporting_reporting_module_ts --> file_src_modules_reporting_reporting_service_ts
  file_src_modules_reporting_reporting_module_ts --> file_src_modules_scoring_scoring_module_ts
  file_src_modules_reporting_reporting_module_unit_test_ts --> file_src_modules_reporting_reporting_module_ts
  file_src_modules_reporting_reporting_module_unit_test_ts --> file_src_modules_reporting_reporting_service_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_differences_differences_types_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_language_language_types_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_reporting_reporting_constants_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_reporting_reporting_types_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_scoring_scoring_constants_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_scoring_scoring_service_ts
  file_src_modules_reporting_reporting_service_ts --> file_src_modules_scoring_scoring_types_ts
  file_src_modules_reporting_reporting_service_unit_test_ts --> file_src_modules_language_language_types_ts
  file_src_modules_reporting_reporting_service_unit_test_ts --> file_src_modules_reporting_reporting_service_ts
  file_src_modules_reporting_reporting_service_unit_test_ts --> file_src_modules_scoring_scoring_service_ts
  file_src_modules_reporting_reporting_service_unit_test_ts --> file_src_modules_scoring_scoring_types_ts
  file_src_modules_reporting_reporting_types_ts --> file_src_modules_language_language_types_ts
  file_src_modules_reporting_reporting_types_ts --> file_src_modules_scoring_scoring_types_ts
  file_src_modules_scoring_scoring_module_ts --> file_src_modules_scoring_scoring_service_ts
  file_src_modules_scoring_scoring_module_unit_test_ts --> file_src_modules_scoring_scoring_module_ts
  file_src_modules_scoring_scoring_module_unit_test_ts --> file_src_modules_scoring_scoring_service_ts
  file_src_modules_scoring_scoring_service_ts --> file_src_modules_scoring_scoring_constants_ts
  file_src_modules_scoring_scoring_service_ts --> file_src_modules_scoring_scoring_types_ts
  file_src_modules_scoring_scoring_service_unit_test_ts --> file_src_modules_scoring_scoring_service_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-2339-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-85.74_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-8-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-36-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-12.38_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-36-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-19-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-10-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-107-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-10-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-6-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-10-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-102-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-46-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-143-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-5-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-99-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-86-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-53-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-168-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-361-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-142-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-32-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-89-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-73-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-34-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-127-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-5-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-5-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-5-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-5-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-10-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)

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
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-227-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-12-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-46-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-25-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-2-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-10-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-9-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-11-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-74-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- CODE_STATISTICS_END -->
