import { Injectable } from "@nestjs/common";

import type {
  CompareJsonArguments,
  JsonComparisonLanguage,
  JsonPathSegment,
  JsonValue,
} from "./json-validator.types";
import type { ConformanceError } from "@conformetry/core";

/**
 * Structurally compares two JSON documents.
 *
 * The template is treated as a **subset** requirement, not an exact match: the
 * instance may add keys and array entries freely, but every key and value the
 * template declares must be present. That is what makes a generated file
 * editable after generation without immediately failing validation.
 *
 * Exported from this package so `conformetry-jupyter` can reuse it for
 * notebooks, which are JSON documents, rather than duplicating the walk.
 */
@Injectable()
export class JsonComparisonService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds one structural error at a JSON path. */
  private buildError(args: {
    actual?: string;
    expected?: string;
    fix: string;
    language: JsonComparisonLanguage;
    message: string;
    pathValue: string;
  }): ConformanceError {
    return {
      ...(args.actual === undefined ? {} : { actual: args.actual }),
      errorType: "code",
      ...(args.expected === undefined ? {} : { expected: args.expected }),
      fix: args.fix,
      instancePath: args.pathValue,
      language: args.language,
      message: args.message,
      templatePath: args.pathValue,
    };
  }

  /**
   * Compares two arrays.
   *
   * Required scalars must appear somewhere in the instance array, order
   * independent. For a required object, the instance entry that produces the
   * fewest errors is taken as the intended match — an array entry has no key, so
   * there is nothing better to match on.
   */
  private compareArrays(args: {
    instanceArray: JsonValue[];
    language: JsonComparisonLanguage;
    pathSegments: JsonPathSegment[];
    templateArray: JsonValue[];
  }): ConformanceError[] {
    return args.templateArray.flatMap((templateItem) => {
      const pathValue = this.formatPath(args.pathSegments);

      if (this.isJsonPrimitive(templateItem)) {
        return args.instanceArray.includes(templateItem)
          ? []
          : [
              this.buildError({
                expected: JSON.stringify(templateItem),
                fix: `Add ${JSON.stringify(templateItem)} to the array at "${pathValue}".`,
                language: args.language,
                message: `Missing required array value ${JSON.stringify(templateItem)} at "${pathValue}"`,
                pathValue,
              }),
            ];
      }

      if (args.instanceArray.length === 0) {
        return [
          this.buildError({
            fix: `Add the required entry to the array at "${pathValue}".`,
            language: args.language,
            message: `Missing required array structure at "${pathValue}"`,
            pathValue,
          }),
        ];
      }

      return this.pickClosestMatch(
        args.instanceArray.map((instanceItem, index) => {
          return this.compare({
            instanceValue: instanceItem,
            language: args.language,
            pathSegments: [...args.pathSegments, index],
            templateValue: templateItem,
          });
        }),
      );
    });
  }

  /** Compares two objects, requiring every template key to be present. */
  private compareObjects(args: {
    instanceObject: Record<string, JsonValue>;
    language: JsonComparisonLanguage;
    pathSegments: JsonPathSegment[];
    templateObject: Record<string, JsonValue>;
  }): ConformanceError[] {
    return Object.keys(args.templateObject).flatMap((key) => {
      const pathSegments = [...args.pathSegments, key];
      const pathValue = this.formatPath(pathSegments);

      if (!(key in args.instanceObject)) {
        return [
          this.buildError({
            expected: JSON.stringify(args.templateObject[key]),
            fix: `Add the key "${pathValue}" to the instance document.`,
            language: args.language,
            message: `Missing required key "${pathValue}"`,
            pathValue,
          }),
        ];
      }

      return this.compare({
        instanceValue: args.instanceObject[key] ?? null,
        language: args.language,
        pathSegments,
        templateValue: args.templateObject[key] ?? null,
      });
    });
  }

  /** Renders a path as `scripts.build[0]` for error messages. */
  private formatPath(pathSegments: JsonPathSegment[]): string {
    return pathSegments.reduce<string>((pathValue, segment) => {
      if (typeof segment === "number") {
        return `${pathValue}[${String(segment)}]`;
      }

      return pathValue === "" ? segment : `${pathValue}.${segment}`;
    }, "");
  }

  /** Returns whether a value is a plain JSON object. */
  private isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /** Returns whether a value is a JSON scalar. */
  private isJsonPrimitive(
    value: JsonValue,
  ): value is boolean | null | number | string {
    return value === null || typeof value !== "object";
  }

  /** Picks the candidate comparison that produced the fewest errors. */
  private pickClosestMatch(
    candidates: ConformanceError[][],
  ): ConformanceError[] {
    return candidates.reduce((fewest, candidate) => {
      return candidate.length < fewest.length ? candidate : fewest;
    });
  }

  // 🌎 Public Methods

  /**
   * Compares a template value against an instance value, returning every way
   * the instance fails to contain what the template requires.
   */
  public compare(args: CompareJsonArguments): ConformanceError[] {
    const pathSegments = args.pathSegments ?? [];

    if (
      Array.isArray(args.templateValue) &&
      Array.isArray(args.instanceValue)
    ) {
      return this.compareArrays({
        instanceArray: args.instanceValue,
        language: args.language,
        pathSegments,
        templateArray: args.templateValue,
      });
    }

    if (
      this.isJsonObject(args.templateValue) &&
      this.isJsonObject(args.instanceValue)
    ) {
      return this.compareObjects({
        instanceObject: args.instanceValue,
        language: args.language,
        pathSegments,
        templateObject: args.templateValue,
      });
    }

    if (args.templateValue === args.instanceValue) {
      return [];
    }

    const pathValue = this.formatPath(pathSegments);

    return [
      this.buildError({
        actual: JSON.stringify(args.instanceValue),
        expected: JSON.stringify(args.templateValue),
        fix: `Set "${pathValue}" to ${JSON.stringify(args.templateValue)}.`,
        language: args.language,
        message: `Expected ${JSON.stringify(args.templateValue)} at "${pathValue}" but found ${JSON.stringify(args.instanceValue)}`,
        pathValue,
      }),
    ];
  }
}
