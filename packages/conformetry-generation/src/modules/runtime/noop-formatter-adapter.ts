import type { FormatterAdapter } from "./runtime.types.js";

/**
 * Formatter adapter that intentionally does nothing.
 */
export class NoopFormatterAdapter implements FormatterAdapter {
  /**
   * Ignores single-file formatting requests.
   */
  public async formatFile(_filePath: string): Promise<void> {
    await Promise.resolve();
  }

  /**
   * Ignores batch formatting requests.
   */
  public async formatFiles(_filePaths: string[]): Promise<void> {
    await Promise.resolve();
  }
}
