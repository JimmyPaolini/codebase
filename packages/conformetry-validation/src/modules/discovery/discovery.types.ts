// 🏷️ Types

/**
 * Where a generator's templates apply within a project.
 *
 * - `project` — the project root, for scaffolding generators.
 * - `module` — each directory under `src/modules`, for module generators.
 *
 * Without this, a module generator's templates were only ever compared against
 * a project root, so nothing under `src/modules/*` was checked at all.
 */
export type GeneratorScopeKind = "module" | "project";

/** One directory to validate, with the generators that could govern it. */
export interface ScopedPath {
  readonly generatorNames: string[];
  readonly path: string;
}

/** A real project discovered in the workspace. */
export interface WorkspaceProject {
  readonly name: string;
  /** Workspace-relative root, POSIX-separated. */
  readonly rootPath: string;
  readonly tags: string[];
}
