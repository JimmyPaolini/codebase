// 🏷️ Types

/**
 * Aggregated code statistics produced by the measurement pipeline.
 */
export interface CodeStatisticsResult {
  asyncFunctions: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docComments: number;
  docstringLines: number;
  docstrings: number;
  enums: number;
  exported: number;
  externalPackages: number;
  folders: number;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  jsonArrays: number;
  jsonBooleans: number;
  jsonFiles: number;
  jsonItems: number;
  jsonLines: number;
  jsonMaxDepth: number;
  jsonNulls: number;
  jsonNumbers: number;
  jsonObjects: number;
  jsonProperties: number;
  jsonStrings: number;
  jsonTotalNodes: number;
  linesOfCode: number;
  methods: number;
  pythonClasses: number;
  pythonConstants: number;
  pythonDecorators: number;
  pythonFiles: number;
  pythonFunctions: number;
  pythonImports: number;
  pythonLines: number;
  pythonProtocols: number;
  repoSizeMiB: string;
  sourceFiles: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
  tsFiles: number;
}
