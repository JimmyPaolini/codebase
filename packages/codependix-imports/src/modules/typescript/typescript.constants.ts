// ♟️ Constants

/** Extension a program's root files carry when they are declaration-only. */
export const DECLARATION_FILE_EXTENSION = ".d.ts";

/** Header declaring the mermaid diagram type and its default layout direction. */
export const TYPESCRIPT_IMPORT_GRAPH_MERMAID_HEADER = "graph LR";

/** Rendered in place of a diagram for a project with no internal file imports. */
export const TYPESCRIPT_IMPORT_GRAPH_UNCONNECTED =
  "_This project has no internal file imports._";

/** File name a project must carry to be discovered as a TypeScript project. */
export const TYPESCRIPT_PROJECT_CONFIG_FILE = "tsconfig.json";
