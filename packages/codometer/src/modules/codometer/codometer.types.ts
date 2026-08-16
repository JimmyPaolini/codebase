// 🏷️ Types

/**
 * Aggregated code statistics produced by the measurement pipeline,
 * grouped by language.
 */
export interface CodeStatisticsResult {
  folders: number;
  javascript: JavascriptStatistics;
  json: JsonStatistics;
  linesOfCode: number;
  markdown: MarkdownStatistics;
  python: PythonStatistics;
  repoSizeMiB: number;
  sourceFiles: number;
  typescript: TypescriptStatistics;
}

/**
 * Options accepted by the codometer command.
 */
export interface CodometerCommandOptions {
  check?: boolean;
  directory?: string;
  readme?: string;
}

/**
 * Code statistics specific to JavaScript source files.
 */
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

/**
 * Code statistics specific to JSON, JSONC, and JSONL files.
 */
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
 * Structural statistics specific to markdown documents.
 */
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

/**
 * Code statistics specific to Python source files.
 */
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
 * Code statistics specific to TypeScript source files.
 */
export interface TypescriptStatistics {
  decorators: number;
  docComments: number;
  enums: number;
  files: number;
  genericDeclarations: number;
  interfaces: number;
}
