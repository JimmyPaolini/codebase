// 🏷️ Types

/** Options accepted from this plugin's `nx.json` registration. */
export interface CallidescopePluginOptions {
  /** Where the callidescope configuration lives, workspace-root relative. */
  readonly configurationPath: string;
  /** Name of the inferred per-project trace target. */
  readonly traceTargetName: string;
}
