// 🏷️ Types

/** Options the `depth` and `breadth` executors accept. */
export interface AddressExecutorOptions {
  /** `<file>#<qualified-name>`, the form every callidescope stack prints. */
  readonly address?: string | undefined;
  readonly configurationPath?: string | undefined;
  readonly format?: string | undefined;
  /** Nx project names to resolve against, replacing the target's own project. */
  readonly projects?: string[] | undefined;
  /** Nx project tags to resolve against, matching a project carrying any of them. */
  readonly tags?: string[] | undefined;
  /** Widen the selection along the Nx dependency graph. Defaults to true. */
  readonly withDependencies?: boolean | undefined;
}
