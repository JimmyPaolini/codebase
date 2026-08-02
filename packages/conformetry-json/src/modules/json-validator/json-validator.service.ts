import { access } from "node:fs/promises";
import path from "node:path";

import { prepareTemplateValidationPayload } from "@jimmypaolini/conformetry-validation";
import { Injectable } from "@nestjs/common";
import { parse } from "jsonc-parser";

import {
  JSON_VALIDATOR_FILE_EXTENSIONS,
  JSON_VALIDATOR_PLUGIN_DESCRIPTOR,
} from "./json-validator.constants.js";

import type {
  JsonValidatorValidateArguments,
  JsonValidatorValidateResult,
  JsonValue,
  ValidateJsonArraysArguments,
  ValidateJsonDepthFirstSearchArguments,
  ValidateJsonObjectsArguments,
  ValidateJsonSupersetArguments,
  ValidatePathExistenceArguments,
} from "./json-validator.types.js";

/**
 * Validates JSON files against conformetry templates.
 */
@Injectable()
export class JsonValidatorService {
  public readonly pluginDescriptor = JSON_VALIDATOR_PLUGIN_DESCRIPTOR;

  // 🌎 Public Methods

  /** Internal helper. */
  private formatPath(pathSegments: (number | string)[]): string {
    return pathSegments.reduce<string>((pathValue, segment) => {
      if (typeof segment === "number") {
        return `${pathValue}[${String(segment)}]`;
      }

      return pathValue === "" ? segment : `${pathValue}.${segment}`;
    }, "");
  }

  // 🔏 Private Methods

  /** Internal helper. */
  private isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /** Internal helper. */
  private isJsonPrimitive(
    value: JsonValue,
  ): value is boolean | null | number | string {
    return value === null || typeof value !== "object";
  }

  /** Internal helper. */
  private async pathExists(pathName: string): Promise<boolean> {
    try {
      await access(pathName);
      return true;
    } catch {
      return false;
    }
  }

  /** Internal helper. */
  private validateJsonArrays(
    arguments_: ValidateJsonArraysArguments,
  ): string[] {
    return arguments_.templateArray.flatMap((templateItem) => {
      const pathValue = this.formatPath(arguments_.pathSegments);

      if (this.isJsonPrimitive(templateItem)) {
        return arguments_.instanceArray.includes(templateItem)
          ? []
          : [
              `Missing required array value ${JSON.stringify(templateItem)} at "${pathValue}"`,
            ];
      }

      if (arguments_.instanceArray.length === 0) {
        return [`Missing required array structure at "${pathValue}"`];
      }

      const violationCandidates = arguments_.instanceArray.map(
        (instanceItem, index) => {
          return this.validateJsonDepthFirstSearch({
            instanceValue: instanceItem,
            pathSegments: [...arguments_.pathSegments, index],
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

  /** Internal helper. */
  private validateJsonDepthFirstSearch(
    arguments_: ValidateJsonDepthFirstSearchArguments,
  ): string[] {
    const pathSegments = arguments_.pathSegments ?? [];

    if (
      Array.isArray(arguments_.templateValue) &&
      Array.isArray(arguments_.instanceValue)
    ) {
      return this.validateJsonArrays({
        instanceArray: arguments_.instanceValue,
        pathSegments,
        templateArray: arguments_.templateValue,
      });
    }

    if (
      this.isJsonObject(arguments_.templateValue) &&
      this.isJsonObject(arguments_.instanceValue)
    ) {
      return this.validateJsonObjects({
        instanceObject: arguments_.instanceValue,
        pathSegments,
        templateObject: arguments_.templateValue,
      });
    }

    if (arguments_.templateValue !== arguments_.instanceValue) {
      const pathValue = this.formatPath(pathSegments);
      return [
        `Expected ${JSON.stringify(arguments_.templateValue)} at "${pathValue}" but found ${JSON.stringify(arguments_.instanceValue)}`,
      ];
    }

    return [];
  }

  /** Internal helper. */
  private validateJsonObjects(
    arguments_: ValidateJsonObjectsArguments,
  ): string[] {
    return Object.keys(arguments_.templateObject).flatMap((key) => {
      const currentPathSegments = [...arguments_.pathSegments, key];
      const pathValue = this.formatPath(currentPathSegments);

      if (!(key in arguments_.instanceObject)) {
        return [`Missing required key "${pathValue}"`];
      }

      return this.validateJsonDepthFirstSearch({
        instanceValue: arguments_.instanceObject[key] ?? null,
        pathSegments: currentPathSegments,
        templateValue: arguments_.templateObject[key] ?? null,
      });
    });
  }

  /** Internal helper. */
  private validateJsonSuperset(
    arguments_: ValidateJsonSupersetArguments,
  ): string[] {
    return this.validateJsonDepthFirstSearch({
      instanceValue: arguments_.instanceValue,
      templateValue: arguments_.templateValue,
    });
  }

  /** Internal helper. */
  private async validatePathExistence(
    arguments_: ValidatePathExistenceArguments,
  ): Promise<string[]> {
    const issues: string[] = [];

    for (const filePath of arguments_.filePaths) {
      const resolvedPath = path.resolve(arguments_.workingDirectory, filePath);
      if (!(await this.pathExists(resolvedPath))) {
        issues.push(`Missing JSON path ${resolvedPath}`);
      }
    }

    return issues;
  }

  /** Internal helper. */
  public async validate(
    arguments_: JsonValidatorValidateArguments,
  ): Promise<JsonValidatorValidateResult> {
    const {
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    } = arguments_;

    if (configurationPath === undefined) {
      const pathViolations = await this.validatePathExistence({
        filePaths,
        workingDirectory,
      });

      return {
        checkedPaths: filePaths,
        ok: pathViolations.length === 0,
        pluginName: JSON_VALIDATOR_PLUGIN_DESCRIPTOR.name,
        violations: pathViolations,
      };
    }

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: JSON_VALIDATOR_FILE_EXTENSIONS,
      filePaths,
      ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
      workingDirectory,
    });

    const issues: string[] = [];

    for (const document of payload.documents) {
      const templateValue = parse(document.renderedTemplate) as JsonValue;
      const instanceValue = parse(document.instance) as JsonValue;
      const violations = this.validateJsonSuperset({
        instanceValue,
        templateValue,
      });

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
      pluginName: JSON_VALIDATOR_PLUGIN_DESCRIPTOR.name,
      violations: issues,
    };
  }
}
