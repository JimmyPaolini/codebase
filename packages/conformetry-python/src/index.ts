import { access } from "node:fs/promises";
import path from "node:path";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for Python files.
 */
export function createPythonValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks that Python files exist",
      fileExtensions: [".py"],
      name: "python",
    },
    validate: async ({ filePaths, workingDirectory }) => {
      const issues: string[] = [];

      for (const filePath of filePaths) {
        const resolvedPath = path.resolve(workingDirectory, filePath);
        if (!(await pathExists(resolvedPath))) {
          issues.push(`Missing Python path ${resolvedPath}`);
        }
      }

      return {
        checkedPaths: filePaths,
        ok: issues.length === 0,
        pluginName: "python",
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
