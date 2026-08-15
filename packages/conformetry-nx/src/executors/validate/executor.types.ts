// 🏷️ Types

/** Options accepted by the conformetry validate executor. */
export interface ValidateExecutorOptions {
  /** Where the conformetry configuration lives, workspace-root relative. */
  readonly configurationPath?: string;
  /** Language names to restrict the run to; every language when absent. */
  readonly languages?: string[];
}
