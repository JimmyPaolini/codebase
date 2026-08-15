// 🏷️ Types

/**
 * One error as the bridge emits it.
 *
 * Field names are snake_case because they cross a process boundary from
 * Python; every value is `unknown` because nothing about a subprocess's stdout
 * can be trusted until it is narrowed.
 */
export type PythonBridgeError = Readonly<Record<string, unknown>>;

/** The bridge's response envelope. */
export interface PythonBridgeResponse {
  readonly errors: PythonBridgeError[];
}

/** Arguments for one bridge invocation. */
export interface RunPythonBridgeArguments {
  readonly filename: string;
  readonly instance: string;
  /** Template source, already rendered on the TypeScript side. */
  readonly template: string;
}
