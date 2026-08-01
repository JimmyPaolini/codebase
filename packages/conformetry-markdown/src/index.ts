import { access } from "node:fs/promises";
import path from "node:path";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for Markdown files.
 */
export function createMarkdownValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks that Markdown files exist",
      fileExtensions: [".md"],
      name: "markdown",
    },
    validate: async ({ filePaths, workingDirectory }) => {
      const issues: string[] = [];

      for (const filePath of filePaths) {
        const resolvedPath = path.resolve(workingDirectory, filePath);
        if (!(await pathExists(resolvedPath))) {
          issues.push(`Missing Markdown path ${resolvedPath}`);
        }
      }

      return {
        checkedPaths: filePaths,
        ok: issues.length === 0,
        pluginName: "markdown",
        violations: issues,
      };
    },
  };
}

/**
 * Resolves whether a file path exists.
 */
async function pathExists(pathName: string): Promise<boolean> {
  try {
    await access(pathName);
    return true;
  } catch {
    return false;
  }
}
