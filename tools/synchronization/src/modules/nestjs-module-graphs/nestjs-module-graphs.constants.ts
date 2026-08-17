// ♟️ Constants

/** Marker block name that carries the graph inside a project's markdown files. */
export const NESTJS_MODULE_GRAPH_MARKER = "nestjs-module-graph";

/** Mermaid diagram type and direction the graph is rendered as. */
export const NESTJS_MODULE_GRAPH_MERMAID_HEADER = "flowchart LR";

/**
 * Workspace directories that hold projects.
 *
 * The same three the codebase structure rules allow, so a project can only be
 * missed here by being somewhere lint already rejects.
 */
export const NESTJS_MODULE_GRAPH_PROJECT_DIRECTORIES: string[] = [
  "applications",
  "packages",
  "tools",
];

/** Export a root module file is expected to provide. */
export const NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT = "MainModule";

/**
 * Path, relative to a project root, of the module a NestJS project bootstraps.
 *
 * Its presence is what makes a project a NestJS project for this command:
 * packages that only export modules have no root to explore from.
 */
export const NESTJS_MODULE_GRAPH_ROOT_MODULE_FILE = "src/main.module.ts";

/** Project markdown files that embed the module graph. */
export const NESTJS_MODULE_GRAPH_TARGET_FILES: string[] = [
  "AGENTS.md",
  "README.md",
];
