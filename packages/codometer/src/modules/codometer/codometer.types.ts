// 🏷️ Types

/**
 * Aggregated code statistics produced by the measurement pipeline,
 * grouped by language.
 */
export interface CodeStatisticsResult {
  folders: number;
  json: JsonStatistics;
  linesOfCode: number;
  python: PythonStatistics;
  repoSizeMiB: string;
  sourceFiles: number;
  typescriptJavascript: TypescriptJavascriptStatistics;
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
 * Code statistics specific to TypeScript and JavaScript source files.
 */
export interface TypescriptJavascriptStatistics {
  asyncFunctions: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docComments: number;
  enums: number;
  exported: number;
  externalPackages: number;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  methods: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
  tsFiles: number;
}
