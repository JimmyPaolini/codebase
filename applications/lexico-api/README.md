## Start

```bash
nx run lexico-api:start
```

## Test

```bash
nx run lexico-api:vitest
```

## 👔 Conformetry

This project was generated from the [nestjs-graphql-application](../../configuration/conformetry-templates/nestjs-graphql-application) conformetry template.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `applications/lexico-api`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 76 |
| Files | 25 |
| Calls traced | 42 |
| Call stacks | 10 |
| Deepest stack | 7 |
| Stacks through recursion | 0 |
| Unfollowable calls | 7 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 17 |
| `maximumBreadth` | none |

### Call stacks (depth)

**1. `SearchResolver.searchLatin`** — depth ≥ 7 · decorated-method

```text
🚀 SearchResolver.searchLatin(…): Promise<Connection<LexemeSearchResult>> [applications/lexico-api/src/modules/search/search.resolver.ts:37]
   ↳ Searches Latin lemmas and inflected forms with enclitic parsing and fuzzy matching.
  └─> SearchService.searchLatin(…): Promise<Connection<LexemeSearchResult>> [applications/lexico-api/src/modules/search/search.service.ts:279]
     ↳ Performs tiered Latin dictionary search with enclitic parsing and fuzzy matching.
    └─> SearchService.findWordMatches(…): Promise<void> [applications/lexico-api/src/modules/search/search.service.ts:152]
       ↳ Queries exact inflected word forms and maps their morphological identifiers.
      └─> SearchService.map(…)(wf: WordForm): string | null [applications/lexico-api/src/modules/search/search.service.ts:174]
        └─> formatFormIdentifier(form: Form): null | string [applications/lexico-api/src/modules/search/search.utilities.ts:68]
           ↳ Formats grammatical and morphological description strings from a lexical Form.
          └─> formatDeclinedForm(form: Form): null | string [applications/lexico-api/src/modules/search/search.utilities.ts:120]
             ↳ Formats nominal, adjectival, and participial declined forms.
            └─> formatNonFiniteForm(form: Form): null | string [applications/lexico-api/src/modules/search/search.utilities.ts:136]
               ↳ Formats non-finite verb and uninflected forms like infinitives, gerunds, supines, and adverbs.
```

**2. `SearchResolver.searchEnglish`** — depth ≥ 6 · decorated-method

```text
🚀 SearchResolver.searchEnglish(…): Promise<Connection<LexemeSearchResult>> [applications/lexico-api/src/modules/search/search.resolver.ts:22]
   ↳ Searches English definitions and translations using full-text and substring matching.
  └─> SearchService.searchEnglish(…): Promise<Connection<LexemeSearchResult>> [applications/lexico-api/src/modules/search/search.service.ts:228]
     ↳ Searches English translations and definitions using full-text and substring matching.
    └─> SearchService.paginateSearchResults(…): Connection<LexemeSearchResult> [applications/lexico-api/src/modules/search/search.service.ts:194]
       ↳ Deterministically orders and paginates aggregated search result entries.
      └─> paginateArray(…): { edges: Edge<T>[]; hasNextPage: boolean; hasPreviousPage: boolean; } [applications/lexico-api/src/lexico-api.utilities.ts:130]
         ↳ Slices an array of items according to forward (first, after) and backward (last, before) Relay pagination parameters.
        └─> getPaginationBounds(…): { endIndex: number; startIndex: number; } [applications/lexico-api/src/lexico-api.utilities.ts:193]
           ↳ Computes start and end slice indices based on after and before cursors.
          └─> findIndex(…)(item: T): boolean [applications/lexico-api/src/lexico-api.utilities.ts:202]
```

**3. `decodeOffsetCursor`** — depth ≥ 3 · orphan-root

```text
🚀 decodeOffsetCursor(cursor?: null | string, defaultOffset?: number): number [applications/lexico-api/src/lexico-api.utilities.ts:71]
   ↳ Decodes an offset-based cursor, returning the specified default offset if missing or invalid.
  └─> fromCursorSafe<T = unknown>(cursor?: null | string, parse?: (value: unknown) => T): null | T [applications/lexico-api/src/lexico-api.utilities.ts:113]
     ↳ Safely decodes a cursor string, returning null if invalid, null, or undefined.
    └─> fromCursor<T = unknown>(cursor: string, parse?: (value: unknown) => T): T [applications/lexico-api/src/lexico-api.utilities.ts:99]
       ↳ Decodes an opaque Base64 cursor string into structured data.
```

<details>
<summary>7 more call stacks</summary>

**4. `Paginated`** — depth ≥ 3 · orphan-root

```text
🚀 Paginated<T>(classReference: ClassConstructor<T>): ClassConstructor<Connection<T>> [applications/lexico-api/src/lexico-api.utilities.ts:158]
   ↳ Mixin type factory producing a Relay Connection ObjectType for GraphQL schema generation.
  └─> createEdgeType<T>(classReference: ClassConstructor<T>): ClassConstructor<Edge<T>> [applications/lexico-api/src/lexico-api.utilities.ts:46]
     ↳ Mixin type factory producing a Relay Edge ObjectType for GraphQL schema generation.
    └─> Field(…)(): StringConstructor [applications/lexico-api/src/lexico-api.utilities.ts:56]
```

**5. `HealthResolver.health`** — depth 2 · decorated-method

```text
🚀 HealthResolver.health(): boolean [applications/lexico-api/src/modules/health/health.resolver.ts:18]
   ↳ Health check query.
  └─> HealthService.isHealthy(): boolean [applications/lexico-api/src/modules/health/health.service.ts:11]
     ↳ Returns true if the service is operational.
```

**6. `LexemesResolver.lexeme`** — depth 2 · decorated-method

```text
🚀 LexemesResolver.lexeme(id: string): Promise<Lexeme | null> [applications/lexico-api/src/modules/lexemes/lexemes.resolver.ts:20]
   ↳ Retrieves a single dictionary lexeme by ID.
  └─> LexemesService.findById(id: string): Promise<Lexeme | null> [applications/lexico-api/src/modules/lexemes/lexemes.service.ts:23]
     ↳ Finds a single lexeme by its unique identifier, with relations eagerly joined.
```

**7. `LexemesResolver.lexemes`** — depth 2 · decorated-method

```text
🚀 LexemesResolver.lexemes(ids: string[]): Promise<Lexeme[]> [applications/lexico-api/src/modules/lexemes/lexemes.resolver.ts:34]
   ↳ Retrieves multiple dictionary lexemes by ID.
  └─> LexemesService.findByIds(ids: string[]): Promise<Lexeme[]> [applications/lexico-api/src/modules/lexemes/lexemes.service.ts:39]
     ↳ Finds multiple lexemes by their unique identifiers, with relations eagerly joined.
```

**8. `encodeOffsetCursor`** — depth 2 · orphan-root

```text
🚀 encodeOffsetCursor(offset: number): string [applications/lexico-api/src/lexico-api.utilities.ts:92]
   ↳ Encodes an offset-based integer cursor.
  └─> toCursor(data: unknown): string [applications/lexico-api/src/lexico-api.utilities.ts:186]
     ↳ Encodes structured data into an opaque Base64 cursor string.
```

**9. `SearchService.getCursor`** — depth 2 · orphan-root

```text
🚀 SearchService.getCursor(item: LexemeSearchResult): string [applications/lexico-api/src/modules/search/search.service.ts:209]
  └─> toCursor(data: unknown): string [applications/lexico-api/src/lexico-api.utilities.ts:186]
     ↳ Encodes structured data into an opaque Base64 cursor string.
```

**10. `main`** — depth 2 · orphan-root

```text
🚀 main(): Promise<void> [applications/lexico-api/src/lexico-api.ts:15]
   ↳ Bootstraps the NestJS GraphQL API application.
  └─> registerShutdownHandler(…)(): Promise<void> [applications/lexico-api/src/lexico-api.ts:32]
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `SearchService.searchLatin` | 7 | `createConnection`, `decomposeEnclitic`, `SearchService.findExactLemmas`, `SearchService.findWordMatches`, `SearchService.findPrefixLemmas`, `SearchService.findFuzzyLemmas`, `SearchService.paginateSearchResults` | `applications/lexico-api/src/modules/search/search.service.ts:279` |
| `SearchService.searchEnglish` | 4 | `createConnection`, `calculateEnglishMatchScore`, `mergeSearchResult`, `SearchService.paginateSearchResults` | `applications/lexico-api/src/modules/search/search.service.ts:228` |
| `paginateArray` | 3 | `getPaginationBounds`, `sliceWithLimits`, `map(…)` | `applications/lexico-api/src/lexico-api.utilities.ts:130` |

<details>
<summary>22 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `SearchService.findWordMatches` | 3 | `SearchService.filter(…)`, `SearchService.map(…)`, `mergeSearchResult` | `applications/lexico-api/src/modules/search/search.service.ts:152` |
| `SearchService.paginateSearchResults` | 3 | `SearchService.toSorted(…)`, `paginateArray`, `createConnection` | `applications/lexico-api/src/modules/search/search.service.ts:194` |
| `createEdgeType` | 2 | `Field(…)`, `Field(…)` | `applications/lexico-api/src/lexico-api.utilities.ts:46` |
| `getPaginationBounds` | 2 | `findIndex(…)`, `findIndex(…)` | `applications/lexico-api/src/lexico-api.utilities.ts:193` |
| `HealthResolver.health` | 1 | `HealthService.isHealthy` | `applications/lexico-api/src/modules/health/health.resolver.ts:18` |
| `LexemesResolver.lexeme` | 1 | `LexemesService.findById` | `applications/lexico-api/src/modules/lexemes/lexemes.resolver.ts:20` |
| `LexemesResolver.lexemes` | 1 | `LexemesService.findByIds` | `applications/lexico-api/src/modules/lexemes/lexemes.resolver.ts:34` |
| `decodeOffsetCursor` | 1 | `fromCursorSafe` | `applications/lexico-api/src/lexico-api.utilities.ts:71` |
| `encodeOffsetCursor` | 1 | `toCursor` | `applications/lexico-api/src/lexico-api.utilities.ts:92` |
| `fromCursorSafe` | 1 | `fromCursor` | `applications/lexico-api/src/lexico-api.utilities.ts:113` |
| `map(…)` | 1 | `createEdge` | `applications/lexico-api/src/lexico-api.utilities.ts:149` |
| `Paginated` | 1 | `createEdgeType` | `applications/lexico-api/src/lexico-api.utilities.ts:158` |
| `formatFormIdentifier` | 1 | `formatDeclinedForm` | `applications/lexico-api/src/modules/search/search.utilities.ts:68` |
| `formatDeclinedForm` | 1 | `formatNonFiniteForm` | `applications/lexico-api/src/modules/search/search.utilities.ts:120` |
| `SearchService.findExactLemmas` | 1 | `mergeSearchResult` | `applications/lexico-api/src/modules/search/search.service.ts:57` |
| `SearchService.findFuzzyLemmas` | 1 | `mergeSearchResult` | `applications/lexico-api/src/modules/search/search.service.ts:88` |
| `SearchService.findPrefixLemmas` | 1 | `mergeSearchResult` | `applications/lexico-api/src/modules/search/search.service.ts:121` |
| `SearchService.map(…)` | 1 | `formatFormIdentifier` | `applications/lexico-api/src/modules/search/search.service.ts:174` |
| `SearchService.getCursor` | 1 | `toCursor` | `applications/lexico-api/src/modules/search/search.service.ts:209` |
| `SearchResolver.searchEnglish` | 1 | `SearchService.searchEnglish` | `applications/lexico-api/src/modules/search/search.resolver.ts:22` |
| `SearchResolver.searchLatin` | 1 | `SearchService.searchLatin` | `applications/lexico-api/src/modules/search/search.resolver.ts:37` |
| `main` | 1 | `registerShutdownHandler(…)` | `applications/lexico-api/src/lexico-api.ts:15` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/JimmyPaolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  lexico_api["lexico-api"]
  lexico_entities["lexico-entities"]
  logger["logger"]
  lexico_api --> lexico_entities
  lexico_api --> logger
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class lexico_api subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_lexico_api_constants_ts["src/lexico-api.constants.ts"]
  file_src_lexico_api_end_to_end_test_ts["src/lexico-api.end-to-end.test.ts"]
  file_src_lexico_api_entities_ts["src/lexico-api.entities.ts"]
  file_src_lexico_api_module_ts["src/lexico-api.module.ts"]
  file_src_lexico_api_module_unit_test_ts["src/lexico-api.module.unit.test.ts"]
  file_src_lexico_api_ts["src/lexico-api.ts"]
  file_src_lexico_api_types_ts["src/lexico-api.types.ts"]
  file_src_lexico_api_unit_test_ts["src/lexico-api.unit.test.ts"]
  file_src_lexico_api_utilities_ts["src/lexico-api.utilities.ts"]
  file_src_lexico_api_utilities_unit_test_ts["src/lexico-api.utilities.unit.test.ts"]
  file_src_modules_health_health_module_ts["src/modules/health/health.module.ts"]
  file_src_modules_health_health_module_unit_test_ts["src/modules/health/health.module.unit.test.ts"]
  file_src_modules_health_health_resolver_ts["src/modules/health/health.resolver.ts"]
  file_src_modules_health_health_resolver_unit_test_ts["src/modules/health/health.resolver.unit.test.ts"]
  file_src_modules_health_health_service_ts["src/modules/health/health.service.ts"]
  file_src_modules_health_health_service_unit_test_ts["src/modules/health/health.service.unit.test.ts"]
  file_src_modules_lexemes_lexemes_module_ts["src/modules/lexemes/lexemes.module.ts"]
  file_src_modules_lexemes_lexemes_module_unit_test_ts["src/modules/lexemes/lexemes.module.unit.test.ts"]
  file_src_modules_lexemes_lexemes_resolver_ts["src/modules/lexemes/lexemes.resolver.ts"]
  file_src_modules_lexemes_lexemes_resolver_unit_test_ts["src/modules/lexemes/lexemes.resolver.unit.test.ts"]
  file_src_modules_lexemes_lexemes_service_integration_test_ts["src/modules/lexemes/lexemes.service.integration.test.ts"]
  file_src_modules_lexemes_lexemes_service_ts["src/modules/lexemes/lexemes.service.ts"]
  file_src_modules_lexemes_lexemes_service_unit_test_ts["src/modules/lexemes/lexemes.service.unit.test.ts"]
  file_src_modules_search_search_pagination_entities_ts["src/modules/search/search-pagination.entities.ts"]
  file_src_modules_search_search_constants_ts["src/modules/search/search.constants.ts"]
  file_src_modules_search_search_entities_ts["src/modules/search/search.entities.ts"]
  file_src_modules_search_search_entities_unit_test_ts["src/modules/search/search.entities.unit.test.ts"]
  file_src_modules_search_search_module_ts["src/modules/search/search.module.ts"]
  file_src_modules_search_search_module_unit_test_ts["src/modules/search/search.module.unit.test.ts"]
  file_src_modules_search_search_resolver_ts["src/modules/search/search.resolver.ts"]
  file_src_modules_search_search_resolver_unit_test_ts["src/modules/search/search.resolver.unit.test.ts"]
  file_src_modules_search_search_service_integration_test_ts["src/modules/search/search.service.integration.test.ts"]
  file_src_modules_search_search_service_ts["src/modules/search/search.service.ts"]
  file_src_modules_search_search_service_unit_test_ts["src/modules/search/search.service.unit.test.ts"]
  file_src_modules_search_search_types_ts["src/modules/search/search.types.ts"]
  file_src_modules_search_search_utilities_ts["src/modules/search/search.utilities.ts"]
  file_src_modules_search_search_utilities_unit_test_ts["src/modules/search/search.utilities.unit.test.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_lexico_api_end_to_end_test_ts --> file_src_lexico_api_constants_ts
  file_src_lexico_api_module_ts --> file_src_lexico_api_constants_ts
  file_src_lexico_api_module_ts --> file_src_modules_health_health_module_ts
  file_src_lexico_api_module_ts --> file_src_modules_lexemes_lexemes_module_ts
  file_src_lexico_api_module_ts --> file_src_modules_search_search_module_ts
  file_src_lexico_api_module_unit_test_ts --> file_src_lexico_api_module_ts
  file_src_lexico_api_ts --> file_src_lexico_api_constants_ts
  file_src_lexico_api_ts --> file_src_lexico_api_module_ts
  file_src_lexico_api_types_ts --> file_src_lexico_api_entities_ts
  file_src_lexico_api_utilities_ts --> file_src_lexico_api_entities_ts
  file_src_lexico_api_utilities_ts --> file_src_lexico_api_types_ts
  file_src_lexico_api_utilities_unit_test_ts --> file_src_lexico_api_entities_ts
  file_src_lexico_api_utilities_unit_test_ts --> file_src_lexico_api_types_ts
  file_src_lexico_api_utilities_unit_test_ts --> file_src_lexico_api_utilities_ts
  file_src_modules_health_health_module_ts --> file_src_modules_health_health_resolver_ts
  file_src_modules_health_health_module_ts --> file_src_modules_health_health_service_ts
  file_src_modules_health_health_module_unit_test_ts --> file_src_modules_health_health_module_ts
  file_src_modules_health_health_resolver_ts --> file_src_modules_health_health_service_ts
  file_src_modules_health_health_resolver_unit_test_ts --> file_src_modules_health_health_resolver_ts
  file_src_modules_health_health_resolver_unit_test_ts --> file_src_modules_health_health_service_ts
  file_src_modules_health_health_service_unit_test_ts --> file_src_modules_health_health_service_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_lexemes_lexemes_resolver_ts
  file_src_modules_lexemes_lexemes_module_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_module_unit_test_ts --> file_src_modules_lexemes_lexemes_module_ts
  file_src_modules_lexemes_lexemes_resolver_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_resolver_unit_test_ts --> file_src_modules_lexemes_lexemes_resolver_ts
  file_src_modules_lexemes_lexemes_resolver_unit_test_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_service_integration_test_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_service_integration_test_ts --> file_testing_mocks_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_src_modules_lexemes_lexemes_service_ts
  file_src_modules_lexemes_lexemes_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_search_search_entities_ts --> file_src_lexico_api_utilities_ts
  file_src_modules_search_search_entities_unit_test_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_module_ts --> file_src_modules_search_search_resolver_ts
  file_src_modules_search_search_module_ts --> file_src_modules_search_search_service_ts
  file_src_modules_search_search_module_unit_test_ts --> file_src_modules_search_search_module_ts
  file_src_modules_search_search_resolver_ts --> file_src_lexico_api_types_ts
  file_src_modules_search_search_resolver_ts --> file_src_modules_search_search_pagination_entities_ts
  file_src_modules_search_search_resolver_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_resolver_ts --> file_src_modules_search_search_service_ts
  file_src_modules_search_search_resolver_unit_test_ts --> file_src_lexico_api_utilities_ts
  file_src_modules_search_search_resolver_unit_test_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_resolver_unit_test_ts --> file_src_modules_search_search_resolver_ts
  file_src_modules_search_search_resolver_unit_test_ts --> file_src_modules_search_search_service_ts
  file_src_modules_search_search_service_integration_test_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_service_integration_test_ts --> file_src_modules_search_search_service_ts
  file_src_modules_search_search_service_integration_test_ts --> file_testing_mocks_ts
  file_src_modules_search_search_service_ts --> file_src_lexico_api_types_ts
  file_src_modules_search_search_service_ts --> file_src_lexico_api_utilities_ts
  file_src_modules_search_search_service_ts --> file_src_modules_search_search_constants_ts
  file_src_modules_search_search_service_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_service_ts --> file_src_modules_search_search_types_ts
  file_src_modules_search_search_service_ts --> file_src_modules_search_search_utilities_ts
  file_src_modules_search_search_service_unit_test_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_service_unit_test_ts --> file_src_modules_search_search_service_ts
  file_src_modules_search_search_service_unit_test_ts --> file_src_modules_search_search_utilities_ts
  file_src_modules_search_search_service_unit_test_ts --> file_testing_mocks_ts
  file_src_modules_search_search_utilities_ts --> file_src_modules_search_search_constants_ts
  file_src_modules_search_search_utilities_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_utilities_ts --> file_src_modules_search_search_types_ts
  file_src_modules_search_search_utilities_unit_test_ts --> file_src_modules_search_search_constants_ts
  file_src_modules_search_search_utilities_unit_test_ts --> file_src_modules_search_search_entities_ts
  file_src_modules_search_search_utilities_unit_test_ts --> file_src_modules_search_search_utilities_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-3808-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-121.62_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-6-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-44-3178c6?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-44-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-6-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-14-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-1-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-55-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-45-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-17-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-17-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-19-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-168-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-50-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-173-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-45-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-342-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-152-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-47-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-59-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-121-475569?style=flat-square)
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
![JSON Lines](https://img.shields.io/badge/JSON_Lines-148-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-33-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-96-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-80-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-135-dc2626?style=flat-square)
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
![Service Files](https://img.shields.io/badge/Service_Files-3-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-2-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-2-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-2-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-14-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-2-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-1-0284c7?style=flat-square)
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

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-289-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-7-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-14-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-55-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-6-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-35-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-1-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-4-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-10-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-13-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-72-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
