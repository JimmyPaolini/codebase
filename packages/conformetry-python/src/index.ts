import { access } from "node:fs/promises";
import path from "node:path";

import {
  prepareTemplateValidationPayload,
  type ConformetryValidatorPlugin,
  type PreparedValidationDocument,
} from "@jimmypaolini/conformetry-validation";
import { parse } from "jsonc-parser";

type JsonValue =
  | boolean
  | JsonValue[]
  | null
  | number
  | string
  | { [key: string]: JsonValue };

/**
 * Creates a validator plugin for Python files.
 */
export function createPythonValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks Python and notebook conformance against templates",
      fileExtensions: [".ipynb", ".py"],
      name: "python",
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
          pluginName: "python",
          violations: pathViolations,
        };
      }

      const payload = await prepareTemplateValidationPayload({
        configurationPath,
        fileExtensions: [".ipynb", ".py"],
        filePaths,
        ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
        workingDirectory,
      });

      const issues: string[] = [];

      for (const document of payload.documents) {
        const extension = path.extname(document.filename);
        const violations =
          extension === ".ipynb"
            ? validateNotebookDocument(document)
            : validatePythonSourceDocument(document);

        for (const violation of violations) {
          issues.push(
            `${document.instanceFilePath}: ${violation} (template: ${document.templateFilePath})`,
          );
        }
      }

      issues.push(...payload.violations);

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
 * Builds duplicate-aware line counts.
 */
function buildLineCounts(text: string): Map<string, number> {
  const lineCounts = new Map<string, number>();
  for (const line of text.split("\n")) {
    lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
  }

  return lineCounts;
}

/**
 * Formats a JSON path array into readable dot/bracket notation.
 */
function formatPath(pathSegments: (number | string)[]): string {
  return pathSegments.reduce<string>((pathValue, segment) => {
    if (typeof segment === "number") {
      return `${pathValue}[${String(segment)}]`;
    }

    return pathValue === "" ? segment : `${pathValue}.${segment}`;
  }, "");
}

/**
 * Type guard for plain JSON objects.
 */
function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Type guard for JSON primitives.
 */
function isJsonPrimitive(
  value: JsonValue,
): value is boolean | null | number | string {
  return value === null || typeof value !== "object";
}

/**
 * Validates Jupyter notebook structure using JSON superset checks.
 */
function validateNotebookDocument(
  document: PreparedValidationDocument,
): string[] {
  const templateValue = parse(document.renderedTemplate) as JsonValue;
  const instanceValue = parse(document.instance) as JsonValue;

  return validateJsonDepthFirstSearch({
    instanceValue,
    templateValue,
  });
}

/**
 * Validates Python source by duplicate-aware line presence.
 */
function validatePythonSourceDocument(
  document: PreparedValidationDocument,
): string[] {
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
 * Recursively validates that template JSON is a subset of instance JSON.
 */
function validateJsonDepthFirstSearch(args: {
  instanceValue: JsonValue;
  pathSegments?: (number | string)[];
  templateValue: JsonValue;
}): string[] {
  const pathSegments = args.pathSegments ?? [];

  if (Array.isArray(args.templateValue) && Array.isArray(args.instanceValue)) {
    return validateJsonArrays({
      instanceArray: args.instanceValue,
      pathSegments,
      templateArray: args.templateValue,
    });
  }

  if (isJsonObject(args.templateValue) && isJsonObject(args.instanceValue)) {
    return validateJsonObjects({
      instanceObject: args.instanceValue,
      pathSegments,
      templateObject: args.templateValue,
    });
  }

  if (args.templateValue !== args.instanceValue) {
    const pathValue = formatPath(pathSegments);
    return [
      `Expected ${JSON.stringify(args.templateValue)} at \"${pathValue}\" but found ${JSON.stringify(args.instanceValue)}`,
    ];
  }

  return [];
}

/**
 * Validates that each template array element is represented in instance array.
 */
function validateJsonArrays(args: {
  instanceArray: JsonValue[];
  pathSegments: (number | string)[];
  templateArray: JsonValue[];
}): string[] {
  return args.templateArray.flatMap((templateItem) => {
    const pathValue = formatPath(args.pathSegments);

    if (isJsonPrimitive(templateItem)) {
      return args.instanceArray.includes(templateItem)
        ? []
        : [
            `Missing required array value ${JSON.stringify(templateItem)} at \"${pathValue}\"`,
          ];
    }

    if (args.instanceArray.length === 0) {
      return [`Missing required array structure at \"${pathValue}\"`];
    }

    const violationCandidates = args.instanceArray.map(
      (instanceItem, index) => {
        return validateJsonDepthFirstSearch({
          instanceValue: instanceItem,
          pathSegments: [...args.pathSegments, index],
          templateValue: templateItem,
        });
      },
    );

    return violationCandidates.reduce(
      (minimumViolations, candidateViolations) => {
        return candidateViolations.length < minimumViolations.length
          ? candidateViolations
          : minimumViolations;
      },
    );
  });
}

/**
 * Validates that each template object key exists in the instance object.
 */
function validateJsonObjects(args: {
  instanceObject: Record<string, JsonValue>;
  pathSegments: (number | string)[];
  templateObject: Record<string, JsonValue>;
}): string[] {
  return Object.keys(args.templateObject).flatMap((key) => {
    const currentPathSegments = [...args.pathSegments, key];
    const pathValue = formatPath(currentPathSegments);

    if (!(key in args.instanceObject)) {
      return [`Missing required key \"${pathValue}\"`];
    }

    return validateJsonDepthFirstSearch({
      instanceValue: args.instanceObject[key] ?? null,
      pathSegments: currentPathSegments,
      templateValue: args.templateObject[key] ?? null,
    });
  });
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
      issues.push(`Missing Python path ${resolvedPath}`);
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
