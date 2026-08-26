// 🏷️ Types

/**
 * Configuration authored in a `codependix.config.ts` file.
 *
 * Every field is optional: a workspace with no configuration file at all
 * resolves every graph type for every project to `target: "none"`, so
 * codependix produces nothing until it is told where to write.
 */
export interface CodependixConfiguration {
  /**
   * Export configuration applied to a project naming no override of its own.
   *
   * Named `defaults` rather than `default`: a configuration module's default
   * export is unwrapped by name during loading (see
   * `ConfigurationService.readDefaultExport`), and a field also called
   * `default` would collide with that unwrapping.
   */
  defaults?: CodependixProjectConfiguration | undefined;
  /** Project names or roots excluded from every graph, as globs. */
  exclude?: string[] | undefined;
  /** Project names or roots participating in graph export, as globs. */
  include?: string[] | undefined;
  /** Per-project overrides, keyed by the Nx project name. */
  projects?: Record<string, CodependixProjectConfiguration> | undefined;
  /**
   * Export configuration for the whole-workspace Workspace Graph.
   *
   * Separate from `defaults`/`projects`: the Workspace Graph is exported once
   * for the entire repository rather than once per project, so it carries no
   * per-project override and is unaffected by `include`/`exclude`.
   */
  workspace?: CodependixWorkspaceConfiguration | undefined;
}

/**
 * Where a graph type's export lands for a project.
 *
 * `both` writes the JSON and the Markdown export together. Named explicitly
 * rather than inferred from which destinations are configured, so a project
 * carrying a `json` destination it does not want written yet can leave it in
 * place with the target set to `markdown`.
 */
export type CodependixExportTarget = "both" | "json" | "markdown" | "none";

/** How one graph type's export is configured for a project. */
export interface CodependixGraphOutput {
  json?: CodependixJsonOutput | undefined;
  markdown?: CodependixMarkdownOutput | undefined;
  target?: CodependixExportTarget | undefined;
}

/** A level of dependency graph codependix can build. */
export type CodependixGraphType = "imports" | "nestjs" | "nx" | "pythonImports";

/** Where a graph's JSON export is written. */
export interface CodependixJsonOutput {
  path: string;
}

/**
 * Where a graph's Markdown export is written.
 *
 * Naming `anchor` places the export inside a named anchor block in the file at
 * `path` — an existing Markdown file such as a project's `README.md`, defaulted
 * to `README.md` when `path` is left out. Leaving `anchor` unset instead writes
 * the export as the whole contents of a standalone file, whose `path` must then
 * be given explicitly since there is no default worth guessing for it.
 */
export interface CodependixMarkdownOutput {
  anchor?: string | undefined;
  path?: string | undefined;
}

/**
 * A project's export configuration, keyed by graph type.
 *
 * Written out field by field rather than as `Partial<Record<...>>`: under
 * `exactOptionalPropertyTypes`, `Partial` makes a field optional without
 * widening its type to include `undefined`, which then rejects the very
 * "unset" value every default-resolution path needs to assign.
 */
export interface CodependixProjectConfiguration {
  imports?: CodependixGraphOutput | undefined;
  nestjs?: CodependixGraphOutput | undefined;
  nx?: CodependixGraphOutput | undefined;
  pythonImports?: CodependixGraphOutput | undefined;
}

/**
 * The Workspace Graph's export configuration, keyed by graph type.
 *
 * Only `nx` is declared: the Workspace Graph is a whole-repository Nx project
 * graph, and neither `codependix-nestjs` nor `codependix-imports` builds a
 * workspace-wide graph of its own.
 */
export interface CodependixWorkspaceConfiguration {
  nx?: CodependixGraphOutput | undefined;
}

/** Arguments accepted when loading a configuration file. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/**
 * Configuration with every default applied.
 *
 * `projects` is kept in its authored, unresolved shape: a project's actual
 * export configuration is produced on demand by
 * `ConfigurationService.resolveForProject`, which is also where include and
 * exclude globs are applied.
 */
export interface ResolvedCodependixConfiguration {
  defaults: CodependixProjectConfiguration;
  exclude: string[];
  include: string[];
  projects: Record<string, CodependixProjectConfiguration>;
  workspace: CodependixWorkspaceConfiguration;
}

/** A graph type's export configuration with every default applied. */
export interface ResolvedCodependixGraphOutput {
  json: ResolvedCodependixJsonOutput | undefined;
  markdown: ResolvedCodependixMarkdownOutput | undefined;
  target: CodependixExportTarget;
}

/** JSON output destination, unresolved beyond what `CodependixJsonOutput` is. */
export type ResolvedCodependixJsonOutput = CodependixJsonOutput;

/** Markdown output destination with its path defaulted. */
export interface ResolvedCodependixMarkdownOutput {
  anchor: string | undefined;
  path: string;
}

/** Arguments accepted when resolving one project's export configuration. */
export interface ResolveForProjectArguments {
  configuration: ResolvedCodependixConfiguration;
  graphType: CodependixGraphType;
  projectName: string;
  /**
   * The project's root, relative to the workspace, as read from the Nx
   * project graph.
   *
   * Optional so a caller with no root handy — a test, or a host that only
   * knows a project by name — still resolves against `include`/`exclude`
   * globs written against project names.
   */
  projectRoot?: string | undefined;
}
