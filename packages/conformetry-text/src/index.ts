import { access } from "node:fs/promises";
import path from "node:path";

import {
  prepareTemplateValidationPayload,
  type ConformetryValidatorPlugin,
  type PreparedValidationDocument,
} from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for text files.
 */
export function createTextValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks text files using duplicate-aware line conformance",
      fileExtensions: [".txt"],
      name: "text",
    },
    validate: async ({
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    }) => {
      if (configurationPath === undefined) {
        const pathViolations = await validatePathExistence({
          filePaths,
          workingDirectory,
        });

        return {
          checkedPaths: filePaths,
          ok: pathViolations.length === 0,
          pluginName: "text",
          violations: pathViolations,
        };
      }

      const payload = await prepareTemplateValidationPayload({
        configurationPath,
        fileExtensions: [".txt"],
        filePaths,
        ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
        workingDirectory,
      });
      const issues: string[] = [];

      for (const document of payload.documents) {
        const lineViolations = validateTextDocument(document);
        for (const violation of lineViolations) {
          issues.push(
            `${document.instanceFilePath}: ${violation} (template: ${document.templateFilePath})`,
          );
        }
      }

      issues.push(...payload.violations);

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
 * Builds a multiset of exact lines for duplicate-aware conformance checks.
 */
function buildLineCounts(text: string): Map<string, number> {
  const lineCounts = new Map<string, number>();
  for (const line of text.split("\n")) {
    lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
  }

  return lineCounts;
}

/**
 * Validates that each rendered template line appears in the instance text.
 */
function validateTextDocument(document: PreparedValidationDocument): string[] {
  const instanceLineCounts = buildLineCounts(document.instance);
  const templateLines = document.renderedTemplate.split("\n");
  const violations: string[] = [];

  for (const [index, line] of templateLines.entries()) {
    const lineCount = instanceLineCounts.get(line) ?? 0;
    if (lineCount === 0) {
      violations.push(`Missing line at template line ${index + 1}: ${line}`);
      continue;
    }

    instanceLineCounts.set(line, lineCount - 1);
  }

  return violations;
}

/**
 * Validates that each provided path exists.
 */
async function validatePathExistence(args: {
  filePaths: string[];
  workingDirectory: string;
}): Promise<string[]> {
  const issues: string[] = [];

  for (const filePath of args.filePaths) {
    const resolvedPath = path.resolve(args.workingDirectory, filePath);
    if (!(await pathExists(resolvedPath))) {
      issues.push(`Missing text path ${resolvedPath}`);
    }
  }

  return issues;
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
