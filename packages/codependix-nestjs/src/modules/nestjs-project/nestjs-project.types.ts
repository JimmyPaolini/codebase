// 🏷️ Types

/** A workspace project tagged `framework:nestjs`. */
export interface NestjsProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
  /**
   * Absolute path of the project's root module file, when it has one.
   *
   * Undefined for a library package, whose container is rooted in a
   * synthetic module built from every module the package defines.
   */
  readonly rootModuleFile: string | undefined;
}
