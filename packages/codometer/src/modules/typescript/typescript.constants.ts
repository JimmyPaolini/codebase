// ♟️ Constants

import type { TypescriptResult } from "./typescript.types";

/** Regex matching TODO and FIXME annotations inside comments. */
export const TODO_REGEX =
  /\/\/.*\b(?:TODO|FIXME)\b|\/\*[\s\S]*?\b(?:TODO|FIXME)\b[\s\S]*?\*\//g;

/** Regex matching JSDoc/TSDoc tags inside doc comments. */
export const DOC_TAG_REGEX = /@([a-zA-Z][a-zA-Z0-9-]*)/g;

/** File extensions treated as JavaScript (not TypeScript). */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** Empty metrics used to initialize analyzer state. */
export const EMPTY_TYPESCRIPT_RESULT: TypescriptResult = {
  asyncFunctions: 0,
  blockComments: 0,
  classes: 0,
  commentLines: 0,
  comments: 0,
  constants: 0,
  decorators: 0,
  docComments: 0,
  docTags: {},
  enums: 0,
  exported: 0,
  externalPackages: new Set<string>(),
  functions: 0,
  genericDeclarations: 0,
  imports: 0,
  interfaces: 0,
  jsFiles: 0,
  lineComments: 0,
  lines: 0,
  methods: 0,
  syncFunctions: 0,
  testFiles: 0,
  todos: 0,
  tsFiles: 0,
};
