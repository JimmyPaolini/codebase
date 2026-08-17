// ♟️ Constants

/**
 * Smallest graph the ambient-module rule is allowed to fire on.
 *
 * Below this a module imported by everything else is just a small graph, not a
 * global one: in a two-module project the only import there is would qualify.
 */
export const NESTJS_MODULE_GRAPH_AMBIENT_MINIMUM_MODULES = 4;

/**
 * Modules NestJS creates to host a dynamic module's providers.
 *
 * These are implementation details of `forRoot`/`forRootAsync` rather than
 * anything a project declares — `TypeOrmModule` is in a project's design and
 * stays in the graph, while the `TypeOrmCoreModule` it builds underneath is
 * not. The synthetic root belongs here for the same reason: this command
 * created it, so it is not part of the package.
 */
export const NESTJS_MODULE_GRAPH_IGNORED_MODULES: RegExp[] = [
  /^ConfigHostModule$/,
  /^SyntheticRootModule$/,
  /^TypeOrmCoreModule$/,
];

/** Marker block name that carries the graph inside a project's markdown files. */
export const NESTJS_MODULE_GRAPH_MARKER = "nestjs-module-graph";

/** Mermaid diagram type and direction the graph is rendered as. */
export const NESTJS_MODULE_GRAPH_MERMAID_HEADER = "flowchart LR";

/** File suffix that marks a NestJS module definition. */
export const NESTJS_MODULE_GRAPH_MODULE_FILE_SUFFIX = ".module.ts";

/** Project tag that marks a project as one this command graphs. */
export const NESTJS_MODULE_GRAPH_PROJECT_TAG = "framework:nestjs";

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
 * Path, relative to a project root, of the module a project bootstraps.
 *
 * A project without one is a library rather than an application, and gets a
 * synthetic root built from every module it defines instead.
 */
export const NESTJS_MODULE_GRAPH_ROOT_MODULE_FILE = "src/main.module.ts";

/**
 * Additionally ignored when the root is synthetic.
 *
 * The synthetic root supplies a global `ConfigModule` so that a package whose
 * modules read configuration in a `useFactory` can be scanned at all. That
 * scaffolding is this command's, not the package's, so it stays out of the
 * graph.
 */
export const NESTJS_MODULE_GRAPH_SYNTHETIC_IGNORED_MODULES: RegExp[] = [
  /^ConfigModule$/,
];

/** Project markdown files that embed the module graph. */
export const NESTJS_MODULE_GRAPH_TARGET_FILES: string[] = [
  "AGENTS.md",
  "README.md",
];
