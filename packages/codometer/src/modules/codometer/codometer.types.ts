// 🏷️ Types

/**
 * Aggregated code statistics produced by the measurement pipeline.
 */
export interface CodeStatisticsResult {
  asyncFunctions: number;
  classes: number;
  constants: number;
  decorators: number;
  enums: number;
  exported: number;
  externalPackages: number;
  folders: number;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  linesOfCode: number;
  markdownBlockquotes: number;
  markdownCodeBlocks: number;
  markdownElements: number;
  markdownFiles: number;
  markdownHeaders: number;
  markdownImages: number;
  markdownInlineCode: number;
  markdownLines: number;
  markdownLinks: number;
  markdownListItems: number;
  markdownLists: number;
  markdownOtherElements: number;
  markdownParagraphs: number;
  markdownTables: number;
  markdownThematicBreaks: number;
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
