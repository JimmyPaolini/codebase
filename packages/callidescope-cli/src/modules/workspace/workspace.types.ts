// 🏷️ Types

/** Arguments for building the set of paths a run will not trace. */
export interface BuildExclusionsArguments {
  readonly exclude: readonly string[];
  readonly excludeFrom: readonly string[];
  readonly workspaceRoot: string;
}

/** Arguments for discovering the projects a run will trace. */
export interface DiscoverProjectsArguments {
  /** Nx project names to keep. Every discovered project when empty. */
  readonly projectNames: readonly string[];
  readonly workspaceRoot: string;
}

/** Decides whether a file is traced. */
export interface FileFilter {
  /** True when the file should be left out of the graph. */
  readonly isExcluded: (workspaceRelativePath: string) => boolean;
}

/** One Nx project discovered from its `project.json`. */
export interface WorkspaceProject {
  /** Absolute path to the project's `tsconfig.json`. */
  readonly configurationPath: string;
  readonly name: string;
  /** Workspace-relative project root, POSIX separators. */
  readonly root: string;
}
