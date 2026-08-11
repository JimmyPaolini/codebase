import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { DirectoryEntry, FileSystemAdapter } from "./nx-adapter.types.js";
import type { Tree } from "@nx/devkit";

/**
 * Implements the filesystem adapter contract using an Nx tree.
 */
@Injectable()
export class NxFileSystemAdapter implements FileSystemAdapter {
  constructor(tree: Tree) {
    this.tree = tree;
  }

  private readonly tree: Tree;

  /**
   * Determines whether a tree entry is a directory.
   */
  private isDirectory(pathName: string): boolean {
    if (!this.tree.exists(pathName)) {
      return false;
    }

    try {
      this.tree.read(pathName);
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Checks whether a path exists in the Nx tree.
   */
  public async exists(pathName: string): Promise<boolean> {
    await Promise.resolve();
    return this.tree.exists(pathName);
  }

  /**
   * Lists the children of a directory in the Nx tree.
   */
  public async listDirectory(directoryPath: string): Promise<DirectoryEntry[]> {
    await Promise.resolve();

    if (!this.tree.exists(directoryPath)) {
      return [];
    }

    const entries = this.tree
      .children(directoryPath)
      .map((entryName: string) => {
        const entryPath = path.join(directoryPath, entryName);

        return {
          isDirectory: this.isDirectory(entryPath),
          name: entryName,
        };
      });

    return entries.toSorted((left, right) => {
      return left.name.localeCompare(right.name);
    });
  }

  /**
   * Creates a directory in the Nx tree without introducing extra files.
   */
  public async makeDirectory(_directoryPath: string): Promise<void> {
    await Promise.resolve();
  }

  /**
   * Reads a file from the Nx tree.
   */
  public async readFile(filePath: string): Promise<string> {
    await Promise.resolve();

    const fileContent = this.tree.read(filePath);

    if (typeof fileContent === "string") {
      return fileContent;
    }

    if (fileContent instanceof Buffer) {
      return fileContent.toString("utf8");
    }

    return String(fileContent);
  }

  /**
   * Writes a file into the Nx tree.
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    await Promise.resolve();
    this.tree.write(filePath, content);
  }
}
