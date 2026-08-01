import { access } from "node:fs/promises";
import path from "node:path";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for text files.
 */
export function createTextValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks that text files exist",
      fileExtensions: [".txt"],
      name: "text",
    },
    validate: async ({ filePaths, workingDirectory }) => {
      const issues: string[] = [];

      for (const filePath of filePaths) {
        const resolvedPath = path.resolve(workingDirectory, filePath);
        if (!(await pathExists(resolvedPath))) {
          issues.push(`Missing text path ${resolvedPath}`);
        }
      }

      return {
        checkedPaths: filePaths,
        ok: issues.length === 0,
        pluginName: "text",
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
