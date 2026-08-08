// 🏷️ Types

/**
 * Arguments required to invoke a conformetry generator through the shared runtime.
 */
export interface RunConformetryGeneratorArguments {
  generatorName: string;
  options: Record<string, unknown>;
  pluginOptions?: Record<string, unknown>;
  tree: unknown;
}
