import { Injectable } from "@nestjs/common";
import { parse } from "jsonc-parser";

import { ValidatorTemplateService } from "./validator-template.service";

import type { TemplateConformanceArguments } from "./validator-template.types";
import type { ConformanceError, JsonValue } from "./validator.types";

/**
 * Validates JSON and JSONC instance files against template structure.
 */
@Injectable()
export class ValidatorJsonService {
  // 🏗 Dependency Injection

  constructor(
    private readonly validatorTemplateService: ValidatorTemplateService,
  ) {}

  /**
   * Build mismatch error.
   */
  private buildMismatchError(
    path: string,
    template: JsonValue,
    instance: JsonValue,
  ): ConformanceError {
    return {
      actual: JSON.stringify(instance),
      errorType: "code",
      expected: JSON.stringify(template),
      fix: `Change the value at "${path}" in the instance file to ${JSON.stringify(template)}.`,
      instancePath: path,
      language: "json",
      message: `Key "${path}": expected ${JSON.stringify(template)}, got ${JSON.stringify(instance)}`,
      templatePath: path,
    };
  }

  /**
   * Build missing error.
   */
  private buildMissingError(itemPath: string): ConformanceError {
    return {
      errorType: "code",
      fix: `Add the missing value at "${itemPath}" to the instance file.`,
      instancePath: itemPath,
      language: "json",
      message: `Missing required value: "${itemPath}"`,
      templatePath: itemPath,
    };
  }

  /**
   * Formats a path array as a readable string (for example, ["a", "b", 0] to "a.b[0]").
   */
  private formatPath(path: (number | string)[]): string {
    return path.reduce<string>((accumulator, segment) => {
      if (typeof segment === "number") {
        return `${accumulator}[${String(segment)}]`;
      }

      return accumulator === "" ? segment : `${accumulator}.${segment}`;
    }, "");
  }

  /**
   * Is json object.
   */
  private isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Is json primitive.
   */
  private isJsonPrimitive(
    value: JsonValue,
  ): value is boolean | null | number | string {
    return value === null || typeof value !== "object";
  }

  /**
   * Recursively compares template against instance and reports missing keys and mismatches.
   */
  private validateDepthFirstSearch(
    template: JsonValue,
    instance: JsonValue,
    path: (number | string)[] = [],
  ): ConformanceError[] {
    if (Array.isArray(template) && Array.isArray(instance)) {
      return this.validateJsonArrays(template, instance, path);
    }

    if (this.isJsonObject(template) && this.isJsonObject(instance)) {
      return this.validateJsonObjects(template, instance, path);
    }

    if (template !== instance) {
      return [
        this.buildMismatchError(this.formatPath(path), template, instance),
      ];
    }

    return [];
  }

  /**
   * Validate json arrays.
   */
  private validateJsonArrays(
    template: JsonValue[],
    instance: JsonValue[],
    path: (number | string)[],
  ): ConformanceError[] {
    return template.flatMap((templateItem) => {
      const currentPath = this.formatPath(path);

      if (this.isJsonPrimitive(templateItem)) {
        return instance.includes(templateItem)
          ? []
          : [
              this.buildMissingError(
                `${currentPath}[${JSON.stringify(templateItem)}]`,
              ),
            ];
      }

      // For objects/arrays, find an instance element with the fewest errors.
      if (instance.length === 0) {
        return [this.buildMissingError(currentPath)];
      }

      const candidateErrors = instance.map((instanceItem, index) =>
        this.validateDepthFirstSearch(templateItem, instanceItem, [
          ...path,
          index,
        ]),
      );

      const initialBestMatch = candidateErrors[0] ?? [];

      return candidateErrors.reduce<ConformanceError[]>(
        (minimumErrors, currentErrors) =>
          currentErrors.length < minimumErrors.length
            ? currentErrors
            : minimumErrors,
        initialBestMatch,
      );
    });
  }

  /**
   * Validate json objects.
   */
  private validateJsonObjects(
    template: Record<string, JsonValue>,
    instance: Record<string, JsonValue>,
    path: (number | string)[],
  ): ConformanceError[] {
    return Object.keys(template).flatMap((key) => {
      const currentPath = this.formatPath([...path, key]);

      return key in instance
        ? this.validateDepthFirstSearch(
            template[key] ?? null,
            instance[key] ?? null,
            [...path, key],
          )
        : [this.buildMissingError(currentPath)];
    });
  }

  /**
   * Validates that an instance JSON/JSONC file is a structural superset of its template.
   */
  validateJsonConformance(args: {
    data: TemplateConformanceArguments["data"];
    filename: TemplateConformanceArguments["filename"];
    instance: TemplateConformanceArguments["instance"];
    template: TemplateConformanceArguments["template"];
  }): { errors: ConformanceError[] } {
    const { instance, renderedTemplate } =
      this.validatorTemplateService.prepareConformanceTexts(args);

    const templateObject = parse(renderedTemplate) as JsonValue;
    const instanceObject = parse(instance) as JsonValue;

    const structuralErrors = this.validateDepthFirstSearch(
      templateObject,
      instanceObject,
    );

    return { errors: structuralErrors };
  }
}
