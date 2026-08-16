// 🏷️ Types

/**
 * Aggregated statistics produced by the Python analyzer.
 */
export interface PythonResult {
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docstringLines: number;
  docstrings: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
}
