import type { FormatterAdapter } from "./nx-generation-runtime";

/**
 * Provides a formatter adapter stub for Nx tree generation.
 */
export class NxFormatterAdapter implements FormatterAdapter {
  /**
   * Formats a single file in the Nx tree.
   */
  public async formatFile(_filePath: string): Promise<void> {
    await Promise.resolve();
  }

  /**
   * Formats every provided file in the Nx tree.
   */
  public async formatFiles(_filePaths: string[]): Promise<void> {
    await Promise.resolve();
  }
}
