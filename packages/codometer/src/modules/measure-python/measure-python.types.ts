// 🏷️ Types

/**
 * Aggregated statistics produced by the Python analyzer.
 */
export interface MeasurePythonResult {
  classes: number;
  constants: number;
  decorators: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
}
