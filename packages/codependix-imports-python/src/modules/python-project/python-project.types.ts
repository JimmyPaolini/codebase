// 🏷️ Types

/**
 * A workspace project tagged `language:python`, discovered from the Nx
 * project graph the same way `codependix-nestjs`'s `NestjsProject` is —
 * Python has no per-project marker file as reliable as a NestJS project's
 * root module, since every Python project shares one workspace-root
 * `pyproject.toml` (see the `write-python` skill) even when it also carries
 * its own.
 */
export interface PythonProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
}
