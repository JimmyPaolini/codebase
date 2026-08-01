import { access } from "node:fs/promises";
import path from "node:path";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for JSON files.
 */
export function createJsonValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks that JSON files exist",
      fileExtensions: [".json", ".jsonc"],
      name: "json",
    },
    validate: async ({ filePaths, workingDirectory }) => {
      const issues: string[] = [];

      for (const filePath of filePaths) {
        const resolvedPath = path.resolve(workingDirectory, filePath);
        if (!(await pathExists(resolvedPath))) {
          issues.push(`Missing JSON path ${resolvedPath}`);
        }
      }

      return {
        checkedPaths: filePaths,
        ok: issues.length === 0,
        pluginName: "json",
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
