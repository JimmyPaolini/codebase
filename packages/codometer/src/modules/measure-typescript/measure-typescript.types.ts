// 🏷️ Types

/** Input to the TypeScript/JavaScript AST analysis step. */
export interface MeasureTypescriptInput {
  sourceFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from walking TypeScript and JavaScript ASTs. */
export interface MeasureTypescriptResult {
  asyncFunctions: number;
  blockComments: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docComments: number;
  docTags: Record<string, number>;
  enums: number;
  exported: number;
  externalPackages: Set<string>;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  lineComments: number;
  lines: number;
  methods: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
  tsFiles: number;
}
