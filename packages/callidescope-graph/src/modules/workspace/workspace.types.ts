// 🏷️ Types

/** Arguments for building the set of paths a run will not trace. */
export interface BuildExclusionsArguments {
  readonly exclude: readonly string[];
  readonly excludeFrom: readonly string[];
  readonly workspaceRoot: string;
}

/** Arguments for discovering the projects a run will trace. */
export interface DiscoverProjectsArguments {
  /**
   * Project directories to trace, workspace-relative or absolute. Every
   * directory under the workspace root holding its own `tsconfig.json`
   * when empty.
   */
  readonly directories: readonly string[];
  /**
   * Decides which projects a run will not trace, judged on the
   * `tsconfig.json` that would identify each one.
   *
   * Applied here rather than only to the files a program yields, because a
   * `tsconfig.json` an exclusion already names should never be read at all —
   * one that does not parse, belonging to a directory nobody asked to trace,
   * is not a reason for the run to say anything.
   */
  readonly fileFilter?: FileFilter | undefined;
  readonly workspaceRoot: string;
}

/** Decides whether a file is traced. */
export interface FileFilter {
  /** True when the file should be left out of the graph. */
  readonly isExcluded: (workspaceRelativePath: string) => boolean;
}

/** Arguments for resolving the projects a set of starting roots' imports reach. */
export interface ResolveDependencyClosureArguments {
  /** Reports the workspace-relative paths one project's program pulled in. */
  readonly resolveProjectFiles: ResolveProjectFilesFunction;
  /** Project roots the traversal begins from. Always present in the result. */
  readonly startingProjects: readonly WorkspaceProject[];
  /**
   * Every project known to the workspace, not only the ones reached so far —
   * this is what lets a pulled-in file resolve to a project the traversal has
   * not visited yet.
   */
  readonly workspaceProjects: readonly WorkspaceProject[];
  /**
   * Where the projects sit on disk, read only to tell a project another one
   * may depend on from a directory of shared settings — see
   * `WorkspaceService.resolveDependencyClosure`.
   */
  readonly workspaceRoot: string;
}

/**
 * Reports the workspace-relative paths one project's program pulled in.
 *
 * How that project came to have a program at all — built fresh for this
 * traversal, reused from an earlier one — is entirely the implementation's
 * concern. `resolveDependencyClosure` reads only the paths that come back.
 */
export type ResolveProjectFilesFunction = (
  project: WorkspaceProject,
) => readonly string[];

/** One project discovered from a directory holding its own `tsconfig.json`. */
export interface WorkspaceProject {
  /** Absolute path to the project's `tsconfig.json`. */
  readonly configurationPath: string;
  /** Same as `root`: the project's own directory is its identity. */
  readonly name: string;
  /** Workspace-relative project root, POSIX separators. */
  readonly root: string;
}

/**
 * Names the directory layout a workspace uses, so module identity is not
 * tied to one repository's conventions.
 */
export interface WorkspaceStructure {
  /** The `src/` subdirectory a module identifier is derived from. */
  readonly modulesDirectory: string;
  /** Identifier used for a file sitting directly under the source root. */
  readonly rootModuleSegment: string;
}
