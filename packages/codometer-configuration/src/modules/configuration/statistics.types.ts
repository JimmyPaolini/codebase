// 🏷️ Types

// What a measurement produces, as opposed to what a configuration asks
// for. This half imports nothing, so the authoring vocabulary can read it
// without the two sides forming a cycle.

/**
 * Aggregated code statistics produced by the measurement pipeline,
 * grouped by the language each counter was measured from.
 *
 * This is the shape every configured callback is handed, which is why it lives
 * beside the configuration types rather than in the CLI that produces it: a
 * `codometer.config.ts` has to be able to name it.
 */
export interface CodeStatisticsResult {
  css: CssStatistics;
  custom: CustomStatisticResult[];
  folders: number;
  hcl: HclStatistics;
  javascript: JavascriptStatistics;
  json: JsonStatistics;
  jupyter: JupyterStatistics;
  linesOfCode: number;
  markdown: MarkdownStatistics;
  python: PythonStatistics;
  repoSizeMiB: number;
  shell: ShellStatistics;
  sourceFiles: number;
  sql: SqlStatistics;
  toml: TomlStatistics;
  typescript: TypescriptStatistics;
  yaml: YamlStatistics;
}

/**
 * A badge group a configured counter can be rendered into.
 *
 * Every group the report renders, plus `conventions` — the group that exists
 * for these counters and appears only when at least one is configured.
 */
export type CodometerStatisticGroup =
  | "conventions"
  | "css"
  | "hcl"
  | "json"
  | "jupyter"
  | "markdown"
  | "python"
  | "repository"
  | "shell"
  | "sql"
  | "toml"
  | "typescript"
  | "yaml";

/**
 * Structural statistics specific to CSS stylesheets.
 */
export interface CssStatistics {
  atRules: number;
  comments: number;
  customProperties: number;
  declarations: number;
  files: number;
  lines: number;
  mediaQueries: number;
  rules: number;
  selectors: number;
}

/**
 * What one configured counter found.
 *
 * `count` is files for a counter matching paths and declarations for one
 * matching symbols, which is why it is not called either.
 */
export interface CustomStatisticResult {
  color: string;
  count: number;
  group: CodometerStatisticGroup;
  label: string;
}

/**
 * Statistics specific to HCL, the Terraform configuration language.
 */
export interface HclStatistics {
  attributes: number;
  blocks: number;
  comments: number;
  files: number;
  interpolations: number;
  lines: number;
  outputs: number;
  resources: number;
  variables: number;
}

/** Code statistics specific to JavaScript source files. */
export interface JavascriptStatistics {
  asyncFunctions: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  exported: number;
  externalPackages: number;
  files: number;
  functions: number;
  imports: number;
  methods: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
}

/** Code statistics specific to JSON, JSONC, and JSONL files. */
export interface JsonStatistics {
  arrays: number;
  booleans: number;
  files: number;
  items: number;
  lines: number;
  maxDepth: number;
  nulls: number;
  numbers: number;
  objects: number;
  properties: number;
  strings: number;
  totalNodes: number;
}

/**
 * Statistics specific to Jupyter notebooks.
 *
 * A notebook is three languages in one file, so the counters come from three
 * analyzers: the notebook document itself is JSON, its code cells are Python,
 * and its markdown cells are prose. Cell and output counts are the notebook's
 * own, belonging to no single language.
 */
export interface JupyterStatistics {
  cells: number;
  classes: number;
  codeBlocks: number;
  codeCells: number;
  codeLines: number;
  decorators: number;
  executedCells: number;
  files: number;
  functions: number;
  headings: number;
  images: number;
  imports: number;
  links: number;
  markdownCells: number;
  markdownLines: number;
  maxDepth: number;
  outputs: number;
  properties: number;
  rawCells: number;
  totalNodes: number;
}

/** Structural statistics specific to markdown documents. */
export interface MarkdownStatistics {
  blockQuotes: number;
  codeBlocks: number;
  files: number;
  headingLevel1: number;
  headingLevel2: number;
  headingLevel3: number;
  headingLevel4: number;
  headingLevel5: number;
  headingLevel6: number;
  images: number;
  inlineCode: number;
  lines: number;
  links: number;
  listItems: number;
  lists: number;
  paragraphs: number;
  tableRows: number;
  tables: number;
  taskListItems: number;
  thematicBreaks: number;
}

/** Code statistics specific to Python source files. */
export interface PythonStatistics {
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docstringLines: number;
  docstrings: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
}

/**
 * Statistics specific to shell scripts.
 *
 * Counted with patterns rather than a parser: shell has no portable syntax
 * tree available without a native dependency, so these are the constructs a
 * reader recognizes on sight rather than everything the language admits.
 */
export interface ShellStatistics {
  commentLines: number;
  comments: number;
  conditionals: number;
  exports: number;
  files: number;
  functions: number;
  lines: number;
  loops: number;
  pipelines: number;
  shebangs: number;
  variables: number;
}

/**
 * Statistics specific to SQL scripts.
 */
export interface SqlStatistics {
  comments: number;
  commonTableExpressions: number;
  creates: number;
  deletes: number;
  files: number;
  inserts: number;
  joins: number;
  lines: number;
  selects: number;
  statements: number;
  updates: number;
}

/**
 * Structural statistics specific to TOML documents.
 */
export interface TomlStatistics {
  arrays: number;
  arrayTables: number;
  comments: number;
  files: number;
  keys: number;
  lines: number;
  tables: number;
}

/** Code statistics specific to TypeScript source files. */
export interface TypescriptStatistics {
  decorators: number;
  docComments: number;
  enums: number;
  files: number;
  genericDeclarations: number;
  interfaces: number;
}

/**
 * Structural statistics specific to YAML documents.
 *
 * A YAML file is a stream rather than a single value: one file can hold
 * several documents, which is why `documents` is counted apart from `files`.
 */
export interface YamlStatistics {
  aliases: number;
  anchors: number;
  comments: number;
  documents: number;
  files: number;
  keys: number;
  lines: number;
  mappings: number;
  maxDepth: number;
  scalars: number;
  sequences: number;
}
