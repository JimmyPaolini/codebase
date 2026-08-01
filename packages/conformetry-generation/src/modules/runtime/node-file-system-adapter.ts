import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DirectoryEntry, FileSystemAdapter } from "./runtime.types.js";

/**
 * Filesystem adapter backed by Node.js promises APIs.
 */
export class NodeFileSystemAdapter implements FileSystemAdapter {
  /**
   * Returns whether a path exists.
   */
  public async exists(pathName: string): Promise<boolean> {
    try {
      await access(pathName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads the entries in a directory.
   */
  public async listDirectory(directoryPath: string): Promise<DirectoryEntry[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    return entries.map((entry) => {
      return {
        isDirectory: entry.isDirectory(),
        name: entry.name,
      };
    });
  }

  /**
   * Creates a directory path recursively.
   */
  public async makeDirectory(directoryPath: string): Promise<void> {
    await mkdir(directoryPath, { recursive: true });
  }

  /**
   * Reads a UTF-8 file.
   */
  public async readFile(filePath: string): Promise<string> {
    return readFile(filePath, "utf8");
  }

  /**
   * Writes a UTF-8 file and creates parent directories.
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
}
