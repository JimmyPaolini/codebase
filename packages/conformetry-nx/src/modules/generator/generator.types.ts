// 🏷️ Types

/** Arguments for emitting the consumer's generator plugin. */
export interface EmitPluginArguments {
  readonly configurationPath: string;
  /** Directory the plugin is written to, relative to the workspace root. */
  readonly outputPath: string;
  /** Package name the emitted plugin is addressed by, as in `nx g <name>:x`. */
  readonly packageName: string;
}

/** One file the generator emits, with its workspace-relative path. */
export interface EmittedFile {
  readonly content: string;
  readonly filePath: string;
}
