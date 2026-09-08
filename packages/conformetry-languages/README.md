# 👔 Conformetry Languages

Every Language [Conformetry](../conformetry-cli/README.md) compares files with,
behind one import — plus the resolution that decides which of them a run needs.

```bash
npm install --save-dev @conformetry/languages
```

## The Languages

A **Language** is the comparison engine for one family of file types. Each is a
module of its own, exposing a NestJS module and a service, and each declares the
extensions it claims.

| Module | Claims | What it compares |
| ------ | ------ | ---------------- |
| `json` | `.json`, `.jsonc` | Every key and value the template declares, addressed by JSON path rather than line number |
| `jupyter` | `.ipynb` | A notebook's envelope, markdown cells, and code cells, by delegating to `json`, `markdown`, and `python` |
| `markdown` | `.md` | The document's syntax tree — headings, lists, links — rather than its rendered text |
| `python` | `.py` | Python's own abstract syntax tree, through the interpreter shipped in `src/python/` |
| `text` | `.txt` | Every template line, duplicate-aware and order-independent |
| `typescript` | `.ts`, `.tsx` | Declarations, signatures, and comments, through the TypeScript compiler |

Every one of them is a lower bound rather than an exact specification: an
instance may add what its template does not mention.

## Resolution and the Fallback

`LanguagesService` takes the extensions a run's templates declare and returns
the Languages that claim them, so a repository of JSON never reports a
TypeScript result it had nothing to say about.

An extension **no** Language claims is not skipped. It is routed to the
**Fallback** — the text Language, widened to also claim those extensions, and
compared line by line. That is what stops a `.toml` or a `.cfg` in a template
from going unchecked, and it is why the text Language is a floor under every
run rather than one option among six.

Registering a Language is a single step: add it to `claimingLanguages` in
`LanguagesService`. Its own descriptor says which extensions it claims, so
there is no second list to keep in step.

## The Python bridge

`python/` holds a small Python package, and `PythonBridgeService` spawns
`python3` against it, because Python's syntax tree is only available from
Python. The path is resolved from the service's own module location rather than
from a working directory, so the bridge is found the same way whether
conformetry runs from a checkout or from `node_modules`.

The interpreter is spawned inside a method, never at module scope, so importing
this package on a machine without `python3` is harmless. A missing interpreter
surfaces as a reported Difference on the `.py` files — visible, rather than
mistaken for conformance.

## Exports

`LanguagesModule` and `LanguagesService`, each Language's module and service,
and the helper services the Languages are built from —
`JsonComparisonService`, `JupyterNotebookService`, `MarkdownNodesService`,
`MarkdownTreeService`, `PythonBridgeService`, `TypescriptCommentsService`,
`TypescriptNodesService`, and `TypescriptTreeService`.

A host almost always wants `LanguagesModule`, which imports and re-exports all
six.

## Why one package

These six Languages were six packages until the consolidation recorded in
[ADR 0006](../../docs/adr/0006-hold-every-conformetry-language-in-one-package.md).
That record is the place to read what installing this package costs a consumer
who needs only one Language, why paying it won, and which three alternatives
were weighed and rejected.

## Test

```bash
nx run conformetry-languages:vitest
```

## License

MIT — see [LICENSE](../../LICENSE).

## 👔 Conformetry

This project was generated from the [nestjs-service-project](../../configuration/conformetry-templates/nestjs-service-project) conformetry template.

<!-- CALL_STACKS_START -->

## 🔭 Callidescope

Call stacks traced through `packages/conformetry-languages`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 143 |
| Files | 41 |
| Calls traced | 190 |
| Call stacks | 14 |
| Deepest stack | 13 |
| Stacks through recursion | 3 |
| Unfollowable calls | 0 |

### Limits

What this project is judged against. `declared` is the number in this project's own `callidescope.config.ts`; `inherited` is the one the run supplies for every project that names none.

| Limit | Value | Origin |
| --- | --- | --- |
| `maximumDepth` | 4 | declared |
| `maximumBreadth` | none | — |

### Call stacks (depth)

**1. `JupyterService.validateDocument`** — depth 13 · orphan-root

```text
🚀 JupyterService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:153]
   ↳ Reports every notebook difference: envelope, missing cells, cell contents.
  └─> JupyterService.map(…)(…): { error: { differenceType: "code"; expected: string; fix: string; language: "python"; message: string; weight: number; }; weight: number; } [packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:173]
    └─> JupyterService.weighMissingCell(args: { cell: PairedCells; document: PreparedValidationDocument; }): number [packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:140]
       ↳ Weighs a cell the notebook does not have.
      └─> JupyterService.validateCell(…): DocumentValidationResult [packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:90]
         ↳ Validates one paired cell with the validator matching its kind.
        └─> MarkdownService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/markdown/markdown.service.ts:48]
           ↳ Reports every markdown structure the template requires and the file lacks.
          └─> MarkdownTreeService.compareContainer(args: CompareNodeArguments): CompareNodeResult (cycle) [packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:64]
             ↳ Matches a container node, then descends into it.
            └─> MarkdownTreeService.map(…)(…): { differences: MarkdownComparisonError[]; lastMatchedNode: MarkdownNode; totalWeight: number; } (cycle) [packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:90]
              └─> MarkdownTreeService.compareChildren(args: CompareChildrenArguments): CompareChildrenResult (cycle) [packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:146]
                 ↳ Compares one level of two trees, descending into containers.
                └─> MarkdownTreeService.compareLeaf(args: CompareNodeArguments): CompareNodeResult [packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:114]
                   ↳ Matches a leaf node on its own identity, without descending.
                  └─> MarkdownTreeService.findCandidates(args: CompareNodeArguments): MarkdownNode[] [packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:134]
                     ↳ Finds every instance sibling satisfying the template node.
                    └─> MarkdownTreeService.filter(…)(instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:135]
                      └─> MarkdownNodesService.matches(args: { instanceNode: MarkdownNode; templateNode: MarkdownNode; }): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:140]
                         ↳ Returns whether an instance node satisfies a template node.
                        └─> MarkdownNodesService.readText(node: MarkdownNode): string [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:163]
                           ↳ Reads a node's rendered plain text.
```

**2. `JsonService.validateDocument`** — depth 12 · orphan-root

```text
🚀 JsonService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/json/json.service.ts:39]
   ↳ Reports every key or value the template requires and the instance lacks.
  └─> JsonComparisonService.compareArrayItem(…): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:79]
     ↳ Matches one required array entry against the instance array.
    └─> JsonComparisonService.map(…)(instanceItem: JsonValue, index: number): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:122]
      └─> JsonComparisonService.compare(args: CompareJsonArguments): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:268]
         ↳ Compares a template value against an instance value, returning every way the instance fails to contain what the…
        └─> JsonComparisonService.compareArrays(…): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:141]
           ↳ Compares two arrays.
          └─> JsonComparisonService.map(…)(templateItem: JsonValue): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:148]
            └─> JsonComparisonService.compareObjects(…): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:155]
               ↳ Compares two objects, requiring every template key to be present.
              └─> JsonComparisonService.map(…)([key, templateValue]: [string, JsonValue]): JsonComparison (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:164]
                └─> JsonComparisonService.countNodes(value: JsonValue): number (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:207]
                   ↳ Counts a JSON value and every value nested inside it.
                  └─> JsonComparisonService.reduce(…)(total: number, item: JsonValue): number (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:209]
                    └─> JsonComparisonService.reduce(…)(total: number, nested: JsonValue): number (cycle) [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:215]
                      └─> JsonComparisonService.isJsonObject(value: JsonValue): value is Record<string, JsonValue> [packages/conformetry-languages/src/modules/json/json-comparison.service.ts:235]
                         ↳ Returns whether a value is a plain JSON object.
```

**3. `TypescriptService.validateDocument`** — depth 12 · orphan-root

```text
🚀 TypescriptService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/typescript/typescript.service.ts:164]
   ↳ Reports every declaration and comment the template requires.
  └─> TypescriptService.validateStructure(…): DocumentValidationResult [packages/conformetry-languages/src/modules/typescript/typescript.service.ts:107]
     ↳ Compares the syntax trees and describes each missing declaration.
    └─> TypescriptTreeService.compareBestCandidate(args: { candidates: Node[]; templateChild: Node; }): TreeComparison (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:67]
       ↳ Descends into whichever candidate explains the template best.
      └─> TypescriptTreeService.map(…)(candidate: Node): TreeComparison (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:72]
        └─> TypescriptTreeService.compareTree(args: CompareTreeArguments): TreeComparison (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:126]
           ↳ Compares one level of two trees, descending into every match.
          └─> TypescriptTreeService.map(…)(templateChild: Node): TreeComparison (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:133]
            └─> TypescriptTreeService.compareChild(…): TreeComparison (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:87]
               ↳ Matches one template child against the instance's children.
              └─> TypescriptTreeService.buildError(…): TypescriptComparisonError [packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:42]
                 ↳ Describes a template node with no instance counterpart.
                └─> TypescriptNodesService.countSubtree(node: Node): number (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:176]
                   ↳ Counts a node and everything beneath it.
                  └─> TypescriptNodesService.reduce(…)(total: number, child: Node): number (cycle) [packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:177]
                    └─> TypescriptNodesService.readChildren(node: Node): Node[] [packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:183]
                       ↳ Reads a node's direct children, skipping the end-of-file token.
                      └─> TypescriptNodesService.forEachChild(…)(childNode: Node): undefined [packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:186]
```

<details>
<summary>11 more call stacks</summary>

**4. `PythonService.validateDocument`** — depth 6 · orphan-root

```text
🚀 PythonService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/python/python.service.ts:38]
   ↳ Reports every declaration and comment the template requires.
  └─> PythonBridgeService.validatePythonSource(args: RunPythonBridgeArguments): DocumentValidationResult [packages/conformetry-languages/src/modules/python/python-bridge.service.ts:160]
     ↳ Compares one Python source against its rendered template.
    └─> PythonBridgeService.map(…)(error: Readonly<Record<string, unknown>>): ConformetryDifference [packages/conformetry-languages/src/modules/python/python-bridge.service.ts:185]
      └─> PythonBridgeService.toConformetryDifference(error: PythonBridgeError): ConformetryDifference [packages/conformetry-languages/src/modules/python/python-bridge.service.ts:132]
         ↳ Maps one snake_case bridge error onto the shared error shape.
        └─> PythonBridgeService.readValues(error: PythonBridgeError): Partial<ConformetryDifference> [packages/conformetry-languages/src/modules/python/python-bridge.service.ts:121]
           ↳ Reads the optional expected and actual values.
          └─> PythonBridgeService.readString(error: PythonBridgeError, key: string): string | undefined [packages/conformetry-languages/src/modules/python/python-bridge.service.ts:111]
             ↳ Narrows an untrusted string field from the bridge payload.
```

**5. `LanguagesService.validateDocument`** — depth 4 · orphan-root

```text
🚀 LanguagesService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/languages/languages.service.ts:80]
  └─> TextService.validateDocument(document: PreparedValidationDocument): DocumentValidationResult [packages/conformetry-languages/src/modules/text/text.service.ts:76]
     ↳ Reports every template line missing from the instance.
    └─> TextService.findMissingLines(document: PreparedValidationDocument): MissingLine[] [packages/conformetry-languages/src/modules/text/text.service.ts:46]
       ↳ Finds template lines the instance does not supply often enough.
      └─> TextService.countLines(text: string): Map<string, number> [packages/conformetry-languages/src/modules/text/text.service.ts:35]
         ↳ Counts how many times each line occurs, for duplicate-aware matching.
```

**6. `MarkdownNodesService.table`** — depth 3 · orphan-root

```text
🚀 MarkdownNodesService.table(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:68]
  └─> MarkdownNodesService.readColumnCount(node: MarkdownNode): number [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:91]
     ↳ Counts a table's columns from its first row.
    └─> MarkdownNodesService.readChildren(node: MarkdownNode): MarkdownNode[] [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:158]
       ↳ Reads a node's children, or an empty list for a leaf.
```

**7. `MarkdownNodesService.code`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.code(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:35]
  └─> MarkdownNodesService.sameField(leftValue: string | undefined, rightValue: string | undefined): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:98]
     ↳ Compares two optional string fields, treating absent as empty.
```

**8. `MarkdownNodesService.heading`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.heading(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:41]
  └─> MarkdownNodesService.readText(node: MarkdownNode): string [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:163]
     ↳ Reads a node's rendered plain text.
```

**9. `MarkdownNodesService.html`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.html(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:47]
  └─> MarkdownNodesService.sameField(leftValue: string | undefined, rightValue: string | undefined): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:98]
     ↳ Compares two optional string fields, treating absent as empty.
```

**10. `MarkdownNodesService.image`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.image(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:50]
  └─> MarkdownNodesService.sameField(leftValue: string | undefined, rightValue: string | undefined): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:98]
     ↳ Compares two optional string fields, treating absent as empty.
```

**11. `MarkdownNodesService.inlineCode`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.inlineCode(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:56]
  └─> MarkdownNodesService.sameField(leftValue: string | undefined, rightValue: string | undefined): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:98]
     ↳ Compares two optional string fields, treating absent as empty.
```

**12. `MarkdownNodesService.link`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.link(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:59]
  └─> MarkdownNodesService.sameField(leftValue: string | undefined, rightValue: string | undefined): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:98]
     ↳ Compares two optional string fields, treating absent as empty.
```

**13. `MarkdownNodesService.tableRow`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.tableRow(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:74]
  └─> MarkdownNodesService.readChildren(node: MarkdownNode): MarkdownNode[] [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:158]
     ↳ Reads a node's children, or an empty list for a leaf.
```

**14. `MarkdownNodesService.text`** — depth 2 · orphan-root

```text
🚀 MarkdownNodesService.text(templateNode: MarkdownNode, instanceNode: MarkdownNode): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:80]
  └─> MarkdownNodesService.sameField(leftValue: string | undefined, rightValue: string | undefined): boolean [packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:98]
     ↳ Compares two optional string fields, treating absent as empty.
```

</details>

### Module spread

None.

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `JupyterService.validateDocument` | 11 | `JupyterNotebookService.parseNotebook`, `JupyterNotebookService.pairCells`, `JsonComparisonService.compare`, `JupyterService.readEnvelope`, `JupyterService.map(…)`, `JupyterService.map(…)`, `JupyterService.map(…)`, `JupyterService.flatMap(…)`, `JupyterService.reduce(…)`, `JupyterService.map(…)`, `JupyterService.map(…)` | `packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:153` |
| `JsonComparisonService.compare` | 7 | `JsonComparisonService.countContainer`, `JsonComparisonService.compareArrays`, `JsonComparisonService.isJsonObject`, `JsonComparisonService.compareObjects`, `JsonComparisonService.countNodes`, `JsonComparisonService.formatPath`, `JsonComparisonService.buildError` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:268` |
| `JsonComparisonService.compareArrayItem` | 6 | `JsonComparisonService.formatPath`, `JsonComparisonService.countNodes`, `JsonComparisonService.isJsonPrimitive`, `JsonComparisonService.buildError`, `JsonComparisonService.pickClosestMatch`, `JsonComparisonService.map(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:79` |

<details>
<summary>78 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `PythonBridgeService.toConformetryDifference` | 6 | `PythonBridgeService.readValues`, `PythonBridgeService.readLocations`, `DifferencesService.resolveDifferenceType`, `PythonBridgeService.readString`, `DifferencesService.resolveErrorLanguage`, `PythonBridgeService.readNumber` | `packages/conformetry-languages/src/modules/python/python-bridge.service.ts:132` |
| `TypescriptNodesService.readKey` | 6 | `TypescriptNodesService.readImportKey`, `TypescriptNodesService.readExportKey`, `TypescriptNodesService.readDecoratorKey`, `TypescriptNodesService.readExpressionStatementKey`, `TypescriptNodesService.readLiteralKey`, `TypescriptNodesService.readNamedKey` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:201` |
| `MarkdownTreeService.compareContainer` | 5 | `MarkdownTreeService.findCandidates`, `MarkdownTreeService.buildError`, `MarkdownNodesService.readChildren`, `MarkdownTreeService.reduce(…)`, `MarkdownTreeService.map(…)` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:64` |
| `TypescriptTreeService.compareChild` | 5 | `TypescriptNodesService.readKey`, `TypescriptTreeService.filter(…)`, `TypescriptTreeService.filter(…)`, `TypescriptTreeService.buildError`, `TypescriptTreeService.compareBestCandidate` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:87` |
| `LanguagesService.resolveValidators` | 5 | `LanguagesService.filter(…)`, `LanguagesService.claimingLanguages`, `LanguagesService.flatMap(…)`, `LanguagesService.filter(…)`, `LanguagesService.widenFallback` | `packages/conformetry-languages/src/modules/languages/languages.service.ts:95` |
| `JsonComparisonService.map(…)` | 4 | `JsonComparisonService.formatPath`, `JsonComparisonService.countNodes`, `JsonComparisonService.buildError`, `JsonComparisonService.compare` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:164` |
| `JsonComparisonService.countNodes` | 3 | `JsonComparisonService.reduce(…)`, `JsonComparisonService.isJsonObject`, `JsonComparisonService.reduce(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:207` |
| `JupyterNotebookService.pairCells` | 3 | `JupyterNotebookService.groupSourcesByKind`, `JupyterNotebookService.readCellKind`, `JupyterNotebookService.readCellSource` | `packages/conformetry-languages/src/modules/jupyter/jupyter-notebook.service.ts:82` |
| `MarkdownTreeService.compareLeaf` | 3 | `MarkdownTreeService.findCandidates`, `MarkdownNodesService.countSubtree`, `MarkdownTreeService.buildError` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:114` |
| `MarkdownService.validateDocument` | 3 | `MarkdownTreeService.compareChildren`, `MarkdownNodesService.filterNodes`, `MarkdownService.map(…)` | `packages/conformetry-languages/src/modules/markdown/markdown.service.ts:48` |
| `PythonBridgeService.validatePythonSource` | 3 | `PythonBridgeService.buildBridgeError`, `PythonBridgeService.map(…)`, `ScoringService.sumWeights` | `packages/conformetry-languages/src/modules/python/python-bridge.service.ts:160` |
| `JupyterService.validateCell` | 3 | `MarkdownService.validateDocument`, `JupyterService.attributeToCell`, `PythonBridgeService.validatePythonSource` | `packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:90` |
| `TypescriptTreeService.compareTree` | 3 | `TypescriptNodesService.readChildren`, `TypescriptTreeService.reduce(…)`, `TypescriptTreeService.map(…)` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:126` |
| `TypescriptService.validateDocument` | 3 | `TypescriptService.parseSourceFile`, `TypescriptService.validateStructure`, `TypescriptService.validateComments` | `packages/conformetry-languages/src/modules/typescript/typescript.service.ts:164` |
| `JsonComparisonService.compareArrays` | 2 | `JsonComparisonService.combine`, `JsonComparisonService.map(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:141` |
| `JsonComparisonService.compareObjects` | 2 | `JsonComparisonService.combine`, `JsonComparisonService.map(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:155` |
| `JupyterNotebookService.groupSourcesByKind` | 2 | `JupyterNotebookService.readCellKind`, `JupyterNotebookService.readCellSource` | `packages/conformetry-languages/src/modules/jupyter/jupyter-notebook.service.ts:31` |
| `MarkdownNodesService.link` | 2 | `MarkdownNodesService.sameField`, `MarkdownNodesService.readText` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:59` |
| `MarkdownNodesService.countSubtree` | 2 | `MarkdownNodesService.reduce(…)`, `MarkdownNodesService.readChildren` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:118` |
| `MarkdownTreeService.buildError` | 2 | `MarkdownNodesService.readText`, `MarkdownNodesService.countSubtree` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:44` |
| `MarkdownTreeService.map(…)` | 2 | `MarkdownTreeService.compareChildren`, `MarkdownNodesService.readChildren` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:90` |
| `MarkdownTreeService.compareChildren` | 2 | `MarkdownTreeService.compareContainer`, `MarkdownTreeService.compareLeaf` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:146` |
| `TextService.validateDocument` | 2 | `TextService.map(…)`, `TextService.findMissingLines` | `packages/conformetry-languages/src/modules/text/text.service.ts:76` |
| `TypescriptCommentsService.compareComments` | 2 | `TypescriptCommentsService.extractComments`, `TypescriptCommentsService.findIndex(…)` | `packages/conformetry-languages/src/modules/typescript/typescript-comments.service.ts:46` |
| `TypescriptCommentsService.extractComments` | 2 | `TypescriptCommentsService.visit`, `TypescriptCommentsService.toSorted(…)` | `packages/conformetry-languages/src/modules/typescript/typescript-comments.service.ts:87` |
| `TypescriptNodesService.readExpressionStatementKey` | 2 | `TypescriptNodesService.buildDottedName`, `TypescriptNodesService.readLiteralKey` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:98` |
| `TypescriptNodesService.countSubtree` | 2 | `TypescriptNodesService.reduce(…)`, `TypescriptNodesService.readChildren` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:176` |
| `TypescriptTreeService.buildError` | 2 | `TypescriptNodesService.readKindLabel`, `TypescriptNodesService.countSubtree` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:42` |
| `TypescriptTreeService.compareBestCandidate` | 2 | `TypescriptTreeService.reduce(…)`, `TypescriptTreeService.map(…)` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:67` |
| `TypescriptService.validateComments` | 2 | `TypescriptCommentsService.compareComments`, `TypescriptService.map(…)` | `packages/conformetry-languages/src/modules/typescript/typescript.service.ts:75` |
| `TypescriptService.validateStructure` | 2 | `TypescriptTreeService.compareTree`, `TypescriptService.map(…)` | `packages/conformetry-languages/src/modules/typescript/typescript.service.ts:107` |
| `JsonComparisonService.combine` | 1 | `JsonComparisonService.reduce(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:66` |
| `JsonComparisonService.map(…)` | 1 | `JsonComparisonService.compare` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:122` |
| `JsonComparisonService.map(…)` | 1 | `JsonComparisonService.compareArrayItem` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:148` |
| `JsonComparisonService.reduce(…)` | 1 | `JsonComparisonService.countNodes` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:209` |
| `JsonComparisonService.reduce(…)` | 1 | `JsonComparisonService.countNodes` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:215` |
| `JsonComparisonService.formatPath` | 1 | `JsonComparisonService.reduce(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:224` |
| `JsonComparisonService.pickClosestMatch` | 1 | `JsonComparisonService.reduce(…)` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:253` |
| `JsonComparisonService.reduce(…)` | 1 | `ScoringService.sumWeights` | `packages/conformetry-languages/src/modules/json/json-comparison.service.ts:254` |
| `JsonService.validateDocument` | 1 | `JsonComparisonService.compare` | `packages/conformetry-languages/src/modules/json/json.service.ts:39` |
| `JupyterNotebookService.readCellSource` | 1 | `JupyterNotebookService.filter(…)` | `packages/conformetry-languages/src/modules/jupyter/jupyter-notebook.service.ts:57` |
| `JupyterNotebookService.parseNotebook` | 1 | `JupyterNotebookService.filter(…)` | `packages/conformetry-languages/src/modules/jupyter/jupyter-notebook.service.ts:122` |
| `MarkdownNodesService.code` | 1 | `MarkdownNodesService.sameField` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:35` |
| `MarkdownNodesService.heading` | 1 | `MarkdownNodesService.readText` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:41` |
| `MarkdownNodesService.html` | 1 | `MarkdownNodesService.sameField` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:47` |
| `MarkdownNodesService.image` | 1 | `MarkdownNodesService.sameField` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:50` |
| `MarkdownNodesService.inlineCode` | 1 | `MarkdownNodesService.sameField` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:56` |
| `MarkdownNodesService.table` | 1 | `MarkdownNodesService.readColumnCount` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:68` |
| `MarkdownNodesService.tableRow` | 1 | `MarkdownNodesService.readChildren` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:74` |
| `MarkdownNodesService.text` | 1 | `MarkdownNodesService.sameField` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:80` |
| `MarkdownNodesService.readColumnCount` | 1 | `MarkdownNodesService.readChildren` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:91` |
| `MarkdownNodesService.reduce(…)` | 1 | `MarkdownNodesService.countSubtree` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:123` |
| `MarkdownNodesService.filterNodes` | 1 | `MarkdownNodesService.filter(…)` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:129` |
| `MarkdownNodesService.matches` | 1 | `MarkdownNodesService.readText` | `packages/conformetry-languages/src/modules/markdown/markdown-nodes.service.ts:140` |
| `MarkdownTreeService.reduce(…)` | 1 | `ScoringService.sumWeights` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:103` |
| `MarkdownTreeService.findCandidates` | 1 | `MarkdownTreeService.filter(…)` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:134` |
| `MarkdownTreeService.filter(…)` | 1 | `MarkdownNodesService.matches` | `packages/conformetry-languages/src/modules/markdown/markdown-tree.service.ts:135` |
| `PythonBridgeService.readLocations` | 1 | `PythonBridgeService.readNumber` | `packages/conformetry-languages/src/modules/python/python-bridge.service.ts:84` |
| `PythonBridgeService.readValues` | 1 | `PythonBridgeService.readString` | `packages/conformetry-languages/src/modules/python/python-bridge.service.ts:121` |
| `PythonBridgeService.map(…)` | 1 | `PythonBridgeService.toConformetryDifference` | `packages/conformetry-languages/src/modules/python/python-bridge.service.ts:185` |
| `PythonService.validateDocument` | 1 | `PythonBridgeService.validatePythonSource` | `packages/conformetry-languages/src/modules/python/python.service.ts:38` |
| `JupyterService.attributeToCell` | 1 | `JupyterService.map(…)` | `packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:52` |
| `JupyterService.weighMissingCell` | 1 | `JupyterService.validateCell` | `packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:140` |
| `JupyterService.map(…)` | 1 | `JupyterService.weighMissingCell` | `packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:173` |
| `JupyterService.map(…)` | 1 | `JupyterService.validateCell` | `packages/conformetry-languages/src/modules/jupyter/jupyter.service.ts:188` |
| `TextService.findMissingLines` | 1 | `TextService.countLines` | `packages/conformetry-languages/src/modules/text/text.service.ts:46` |
| `TypescriptNodesService.readDecoratorKey` | 1 | `TypescriptNodesService.buildDottedName` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:75` |
| `TypescriptNodesService.readNamedKey` | 1 | `TypescriptNodesService.isNode` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:143` |
| `TypescriptNodesService.reduce(…)` | 1 | `TypescriptNodesService.countSubtree` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:177` |
| `TypescriptNodesService.readChildren` | 1 | `TypescriptNodesService.forEachChild(…)` | `packages/conformetry-languages/src/modules/typescript/typescript-nodes.service.ts:183` |
| `TypescriptTreeService.map(…)` | 1 | `TypescriptTreeService.compareTree` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:72` |
| `TypescriptTreeService.reduce(…)` | 1 | `ScoringService.sumWeights` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:78` |
| `TypescriptTreeService.filter(…)` | 1 | `TypescriptNodesService.readKey` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:98` |
| `TypescriptTreeService.map(…)` | 1 | `TypescriptTreeService.compareChild` | `packages/conformetry-languages/src/modules/typescript/typescript-tree.service.ts:133` |
| `TypescriptService.map(…)` | 1 | `TypescriptService.readLocation` | `packages/conformetry-languages/src/modules/typescript/typescript.service.ts:81` |
| `TypescriptService.map(…)` | 1 | `TypescriptService.readLocation` | `packages/conformetry-languages/src/modules/typescript/typescript.service.ts:116` |
| `LanguagesService.validateDocument` | 1 | `TextService.validateDocument` | `packages/conformetry-languages/src/modules/languages/languages.service.ts:80` |
| `LanguagesService.filter(…)` | 1 | `LanguagesService.some(…)` | `packages/conformetry-languages/src/modules/languages/languages.service.ts:98` |

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
  conformetry_core["conformetry-core"]
  conformetry_languages["conformetry-languages"]
  conformetry_validation["conformetry-validation"]
  conformetry_languages --> conformetry_core
  conformetry_validation --> conformetry_languages
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class conformetry_languages subject
```
<!-- codependix:end name="codependix-nx" -->

### NestJS Module Graph

<!-- codependix:start name="codependix-nestjs" -->
```mermaid
flowchart LR
  DifferencesModule
  JsonModule
  JupyterModule
  LanguagesModule
  MarkdownModule
  PythonModule
  ScoringModule
  TextModule
  TypescriptModule
  JsonModule --> ScoringModule
  JupyterModule --> JsonModule
  JupyterModule --> MarkdownModule
  JupyterModule --> PythonModule
  LanguagesModule --> JsonModule
  LanguagesModule --> JupyterModule
  LanguagesModule --> MarkdownModule
  LanguagesModule --> PythonModule
  LanguagesModule --> TextModule
  LanguagesModule --> TypescriptModule
  MarkdownModule --> ScoringModule
  PythonModule --> DifferencesModule
  PythonModule --> ScoringModule
  TypescriptModule --> ScoringModule
```
<!-- codependix:end name="codependix-nestjs" -->

### File Imports

<!-- codependix:start name="codependix-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_index_ts["src/index.ts"]
  file_src_modules_json_json_comparison_service_ts["src/modules/json/json-comparison.service.ts"]
  file_src_modules_json_json_comparison_service_unit_test_ts["src/modules/json/json-comparison.service.unit.test.ts"]
  file_src_modules_json_json_constants_ts["src/modules/json/json.constants.ts"]
  file_src_modules_json_json_module_ts["src/modules/json/json.module.ts"]
  file_src_modules_json_json_module_unit_test_ts["src/modules/json/json.module.unit.test.ts"]
  file_src_modules_json_json_service_ts["src/modules/json/json.service.ts"]
  file_src_modules_json_json_service_unit_test_ts["src/modules/json/json.service.unit.test.ts"]
  file_src_modules_json_json_types_ts["src/modules/json/json.types.ts"]
  file_src_modules_jupyter_jupyter_notebook_service_ts["src/modules/jupyter/jupyter-notebook.service.ts"]
  file_src_modules_jupyter_jupyter_notebook_service_unit_test_ts["src/modules/jupyter/jupyter-notebook.service.unit.test.ts"]
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
  file_src_modules_markdown_markdown_nodes_service_ts["src/modules/markdown/markdown-nodes.service.ts"]
  file_src_modules_markdown_markdown_nodes_service_unit_test_ts["src/modules/markdown/markdown-nodes.service.unit.test.ts"]
  file_src_modules_markdown_markdown_tree_service_ts["src/modules/markdown/markdown-tree.service.ts"]
  file_src_modules_markdown_markdown_tree_service_unit_test_ts["src/modules/markdown/markdown-tree.service.unit.test.ts"]
  file_src_modules_markdown_markdown_constants_ts["src/modules/markdown/markdown.constants.ts"]
  file_src_modules_markdown_markdown_module_ts["src/modules/markdown/markdown.module.ts"]
  file_src_modules_markdown_markdown_module_unit_test_ts["src/modules/markdown/markdown.module.unit.test.ts"]
  file_src_modules_markdown_markdown_service_ts["src/modules/markdown/markdown.service.ts"]
  file_src_modules_markdown_markdown_service_unit_test_ts["src/modules/markdown/markdown.service.unit.test.ts"]
  file_src_modules_markdown_markdown_types_ts["src/modules/markdown/markdown.types.ts"]
  file_src_modules_python_python_bridge_service_ts["src/modules/python/python-bridge.service.ts"]
  file_src_modules_python_python_bridge_service_unit_test_ts["src/modules/python/python-bridge.service.unit.test.ts"]
  file_src_modules_python_python_constants_ts["src/modules/python/python.constants.ts"]
  file_src_modules_python_python_module_ts["src/modules/python/python.module.ts"]
  file_src_modules_python_python_module_unit_test_ts["src/modules/python/python.module.unit.test.ts"]
  file_src_modules_python_python_service_ts["src/modules/python/python.service.ts"]
  file_src_modules_python_python_service_unit_test_ts["src/modules/python/python.service.unit.test.ts"]
  file_src_modules_python_python_types_ts["src/modules/python/python.types.ts"]
  file_src_modules_text_text_constants_ts["src/modules/text/text.constants.ts"]
  file_src_modules_text_text_module_ts["src/modules/text/text.module.ts"]
  file_src_modules_text_text_module_unit_test_ts["src/modules/text/text.module.unit.test.ts"]
  file_src_modules_text_text_service_ts["src/modules/text/text.service.ts"]
  file_src_modules_text_text_service_unit_test_ts["src/modules/text/text.service.unit.test.ts"]
  file_src_modules_text_text_types_ts["src/modules/text/text.types.ts"]
  file_src_modules_typescript_typescript_comments_service_ts["src/modules/typescript/typescript-comments.service.ts"]
  file_src_modules_typescript_typescript_comments_service_unit_test_ts["src/modules/typescript/typescript-comments.service.unit.test.ts"]
  file_src_modules_typescript_typescript_nodes_service_ts["src/modules/typescript/typescript-nodes.service.ts"]
  file_src_modules_typescript_typescript_nodes_service_unit_test_ts["src/modules/typescript/typescript-nodes.service.unit.test.ts"]
  file_src_modules_typescript_typescript_tree_service_ts["src/modules/typescript/typescript-tree.service.ts"]
  file_src_modules_typescript_typescript_tree_service_unit_test_ts["src/modules/typescript/typescript-tree.service.unit.test.ts"]
  file_src_modules_typescript_typescript_constants_ts["src/modules/typescript/typescript.constants.ts"]
  file_src_modules_typescript_typescript_module_ts["src/modules/typescript/typescript.module.ts"]
  file_src_modules_typescript_typescript_module_unit_test_ts["src/modules/typescript/typescript.module.unit.test.ts"]
  file_src_modules_typescript_typescript_service_ts["src/modules/typescript/typescript.service.ts"]
  file_src_modules_typescript_typescript_service_unit_test_ts["src/modules/typescript/typescript.service.unit.test.ts"]
  file_src_modules_typescript_typescript_types_ts["src/modules/typescript/typescript.types.ts"]
  file_testing_mocks_ts["testing/mocks.ts"]
  file_testing_setup_ts["testing/setup.ts"]
  file_vitest_config_ts["vitest.config.ts"]
  file_src_modules_json_json_comparison_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_comparison_service_unit_test_ts --> file_src_modules_json_json_comparison_service_ts
  file_src_modules_json_json_comparison_service_unit_test_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_module_ts --> file_src_modules_json_json_comparison_service_ts
  file_src_modules_json_json_module_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_module_ts
  file_src_modules_json_json_module_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_comparison_service_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_constants_ts
  file_src_modules_json_json_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_json_json_service_unit_test_ts --> file_src_modules_json_json_comparison_service_ts
  file_src_modules_json_json_service_unit_test_ts --> file_src_modules_json_json_service_ts
  file_src_modules_jupyter_jupyter_notebook_service_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_jupyter_jupyter_notebook_service_unit_test_ts --> file_src_modules_jupyter_jupyter_notebook_service_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_jupyter_jupyter_notebook_service_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_jupyter_jupyter_module_ts --> file_src_modules_python_python_module_ts
  file_src_modules_jupyter_jupyter_module_unit_test_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_jupyter_jupyter_module_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_json_json_comparison_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_json_json_types_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_notebook_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_constants_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_jupyter_jupyter_types_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_jupyter_jupyter_service_ts --> file_src_modules_python_python_bridge_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_json_json_comparison_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_jupyter_jupyter_notebook_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_markdown_markdown_tree_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_jupyter_jupyter_service_unit_test_ts --> file_src_modules_python_python_bridge_service_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_json_json_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_python_python_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_text_text_module_ts
  file_src_modules_languages_languages_module_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_json_json_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_jupyter_jupyter_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_languages_languages_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_python_python_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_text_text_module_ts
  file_src_modules_languages_languages_module_unit_test_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_json_json_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_jupyter_jupyter_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_languages_languages_types_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_python_python_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_text_text_service_ts
  file_src_modules_languages_languages_service_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_languages_languages_module_ts
  file_src_modules_languages_languages_service_unit_test_ts --> file_src_modules_languages_languages_service_ts
  file_src_modules_markdown_markdown_nodes_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_nodes_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_nodes_service_unit_test_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_markdown_markdown_nodes_service_unit_test_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_tree_service_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_markdown_markdown_tree_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_tree_service_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_tree_service_unit_test_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_markdown_markdown_tree_service_unit_test_ts --> file_src_modules_markdown_markdown_tree_service_ts
  file_src_modules_markdown_markdown_tree_service_unit_test_ts --> file_src_modules_markdown_markdown_types_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_tree_service_ts
  file_src_modules_markdown_markdown_module_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_module_ts
  file_src_modules_markdown_markdown_module_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_tree_service_ts
  file_src_modules_markdown_markdown_service_ts --> file_src_modules_markdown_markdown_constants_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_nodes_service_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_tree_service_ts
  file_src_modules_markdown_markdown_service_unit_test_ts --> file_src_modules_markdown_markdown_service_ts
  file_src_modules_python_python_bridge_service_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_python_python_bridge_service_ts --> file_src_modules_python_python_types_ts
  file_src_modules_python_python_bridge_service_unit_test_ts --> file_src_modules_python_python_bridge_service_ts
  file_src_modules_python_python_module_ts --> file_src_modules_python_python_bridge_service_ts
  file_src_modules_python_python_module_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_module_unit_test_ts --> file_src_modules_python_python_module_ts
  file_src_modules_python_python_module_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_python_python_service_ts --> file_src_modules_python_python_bridge_service_ts
  file_src_modules_python_python_service_ts --> file_src_modules_python_python_constants_ts
  file_src_modules_python_python_service_unit_test_ts --> file_src_modules_python_python_bridge_service_ts
  file_src_modules_python_python_service_unit_test_ts --> file_src_modules_python_python_service_ts
  file_src_modules_text_text_module_ts --> file_src_modules_text_text_service_ts
  file_src_modules_text_text_module_unit_test_ts --> file_src_modules_text_text_module_ts
  file_src_modules_text_text_module_unit_test_ts --> file_src_modules_text_text_service_ts
  file_src_modules_text_text_service_ts --> file_src_modules_text_text_constants_ts
  file_src_modules_text_text_service_ts --> file_src_modules_text_text_types_ts
  file_src_modules_text_text_service_unit_test_ts --> file_src_modules_text_text_service_ts
  file_src_modules_typescript_typescript_comments_service_ts --> file_src_modules_typescript_typescript_constants_ts
  file_src_modules_typescript_typescript_comments_service_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_comments_service_unit_test_ts --> file_src_modules_typescript_typescript_comments_service_ts
  file_src_modules_typescript_typescript_nodes_service_unit_test_ts --> file_src_modules_typescript_typescript_nodes_service_ts
  file_src_modules_typescript_typescript_tree_service_ts --> file_src_modules_typescript_typescript_nodes_service_ts
  file_src_modules_typescript_typescript_tree_service_ts --> file_src_modules_typescript_typescript_types_ts
  file_src_modules_typescript_typescript_tree_service_unit_test_ts --> file_src_modules_typescript_typescript_nodes_service_ts
  file_src_modules_typescript_typescript_tree_service_unit_test_ts --> file_src_modules_typescript_typescript_tree_service_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_typescript_comments_service_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_typescript_nodes_service_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_typescript_tree_service_ts
  file_src_modules_typescript_typescript_module_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_typescript_module_ts
  file_src_modules_typescript_typescript_module_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_comments_service_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_tree_service_ts
  file_src_modules_typescript_typescript_service_ts --> file_src_modules_typescript_typescript_constants_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_comments_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_nodes_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_tree_service_ts
  file_src_modules_typescript_typescript_service_unit_test_ts --> file_src_modules_typescript_typescript_service_ts
```
<!-- codependix:end name="codependix-imports" -->

<!-- CODE_STATISTICS_START -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-6205-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-203.40_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-11-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-73-3178c6?style=flat-square)

### Measured Targets

![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-30.46_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-65-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-22-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-22-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-150-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-0-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-22-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-15-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-22-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-312-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-128-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-423-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-17-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-288-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-255-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-70-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-287-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-606-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-5-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-8-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-405-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-3-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-19-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-1-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-21-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-2-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-18-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-44-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-7-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-7-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-149-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-32-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-13-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-95-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-80-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-35-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-134-dc2626?style=flat-square)
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

![Module Files](https://img.shields.io/badge/Module_Files-7-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-15-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-7-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-7-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-22-ca8a04?style=flat-square)
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
