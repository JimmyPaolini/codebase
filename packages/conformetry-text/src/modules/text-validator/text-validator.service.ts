import { Injectable } from "@nestjs/common";

import { TEXT_VALIDATOR_DESCRIPTOR } from "./text-validator.constants";

import type { MissingLine } from "./text-validator.types";
import type {
  ConformetryDifference,
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/**
 * Checks that a text file contains every line its template requires.
 *
 * Matching is duplicate-aware: a template line that appears twice must appear
 * twice in the instance. Order is not enforced, so a file may add lines
 * anywhere — the template is a lower bound, not an exact specification.
 */
@Injectable()
export class TextValidatorService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = TEXT_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  /** Counts how many times each line occurs, for duplicate-aware matching. */
  private countLines(text: string): Map<string, number> {
    const lineCounts = new Map<string, number>();

    for (const line of text.split("\n")) {
      lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }

    return lineCounts;
  }

  /** Finds template lines the instance does not supply often enough. */
  private findMissingLines(
    document: PreparedValidationDocument,
  ): MissingLine[] {
    const remainingLines = this.countLines(document.instance);
    const missingLines: MissingLine[] = [];

    for (const [index, line] of document.renderedTemplate
      .split("\n")
      .entries()) {
      const remaining = remainingLines.get(line) ?? 0;

      if (remaining === 0) {
        missingLines.push({ line, templateLine: index + 1 });
      } else {
        remainingLines.set(line, remaining - 1);
      }
    }

    return missingLines;
  }

  // 🌎 Public Methods

  /**
   * Reports every template line missing from the instance.
   *
   * Every template line is one requirement, blank ones included: this
   * validator matches them literally, so a blank line the instance does not
   * supply is a real miss and counting it keeps the denominator honest.
   */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    const differences: ConformetryDifference[] = this.findMissingLines(
      document,
    ).map((missingLine) => {
      return {
        differenceType: "code",
        expected: missingLine.line,
        fix: `Add the line \`${missingLine.line}\` to the instance file.`,
        language: "text",
        message: `Missing line: ${missingLine.line}`,
        templateLine: missingLine.templateLine,
      };
    });

    return {
      differences,
      totalWeight: document.renderedTemplate.split("\n").length,
    };
  }
}
