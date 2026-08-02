// 🏷️ Types

/** Input to the TypeScript/JavaScript AST analysis step. */
export interface TypescriptAnalysisInput {
  sourceFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from walking TypeScript and JavaScript ASTs. */
export interface TypescriptAnalysisResult {
  asyncFunctions: number;
  classes: number;
  constants: number;
  decorators: number;
  enums: number;
  exported: number;
  externalPackages: Set<string>;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  lines: number;
  methods: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
  tsFiles: number;
}
