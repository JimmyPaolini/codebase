import path from "node:path";

import { Injectable } from "@nestjs/common";

import { PERFECT_SCORE } from "../scoring/scoring.constants";

import {
  REPORT_ERROR_DETAIL_INDENT,
  REPORT_FILE_DETAIL_INDENT,
  REPORT_FILE_INDENT,
  REPORT_SCORES_HEADING,
  REPORT_SUCCESS_MESSAGE,
  SCORE_PERCENTAGE_DIGITS,
  SCORE_PERCENTAGE_SCALE,
} from "./reporting.constants";

import type { ConformetryError } from "../errors/errors.types";
import type { ValidationFileResult } from "../language/language.types";
import type { InstanceScore } from "../scoring/scoring.types";
import type {
  FormatLocationArguments,
  FormatReportArguments,
} from "./reporting.types";

/**
 * Renders structured conformance errors as human-readable text.
 *
 * Reports are grouped by file and then by error, and every error prints the
 * template requirement that produced it plus a concrete `fix` line. That last
 * part is the point: the output is meant to be actionable by whoever — or
 * whatever — is asked to make the file conform.
 */
@Injectable()
export class ReportingService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Renders one error: its message, where it was found in both the instance
   * and the template, the expected and actual values when known, and the fix.
   */
  private formatError(args: {
    error: ConformetryError;
    index: number;
  }): string[] {
    const { error } = args;

    return [
      "",
      `${REPORT_FILE_DETAIL_INDENT}${String(args.index + 1)}. ${error.message}`,
      ...this.formatLocation({
        column: error.instanceColumn,
        jsonPath: error.instancePath,
        line: error.instanceLine,
        prefix: "Instance",
      }),
      ...this.formatLocation({
        column: error.templateColumn,
        jsonPath: error.templatePath,
        line: error.templateLine,
        prefix: "Template",
      }),
      ...(error.expected === undefined
        ? []
        : [`${REPORT_ERROR_DETAIL_INDENT}Expected: \`${error.expected}\``]),
      ...(error.actual === undefined
        ? []
        : [`${REPORT_ERROR_DETAIL_INDENT}Actual  : \`${error.actual}\``]),
      `${REPORT_ERROR_DETAIL_INDENT}Fix     : ${error.fix}`,
    ];
  }

  /**
   * Renders one failing file: a numbered heading, the instance and template
   * paths relative to the working directory, then each of its errors.
   */
  private formatFileResult(args: {
    fileResult: ValidationFileResult;
    index: number;
    workingDirectory: string;
  }): string[] {
    const { fileResult } = args;

    return [
      "",
      `${REPORT_FILE_INDENT}${String(args.index + 1)}. file: ${fileResult.filename}`,
      `${REPORT_FILE_DETAIL_INDENT}Instance: ${path.relative(args.workingDirectory, fileResult.instanceFilePath)}`,
      `${REPORT_FILE_DETAIL_INDENT}Template: ${path.relative(args.workingDirectory, fileResult.templateFilePath)}`,
      ...fileResult.errors.flatMap((error, index) => {
        return this.formatError({ error, index });
      }),
    ];
  }

  /**
   * Renders a single location line, preferring line/column over a JSON path.
   * Returns nothing when the error carries neither, which is normal for
   * whole-file errors such as a missing file.
   */
  private formatLocation(args: FormatLocationArguments): string[] {
    if (args.line !== undefined) {
      const columnText =
        args.column === undefined ? "" : `, Column ${String(args.column)}`;

      return [
        `${REPORT_ERROR_DETAIL_INDENT}${args.prefix}: Line ${String(args.line)}${columnText}`,
      ];
    }

    if (args.jsonPath !== undefined) {
      return [
        `${REPORT_ERROR_DETAIL_INDENT}${args.prefix}: JSON path "${args.jsonPath}"`,
      ];
    }

    return [];
  }

  /**
   * Renders the summary of instances that did not score perfectly.
   *
   * Both sides of the comparison are printed, because a score alone does not
   * say whether the run failed: 94% passes under a threshold of 90 and fails
   * under 95, and a reader should not have to go looking for which applied.
   */
  private formatScores(scores: InstanceScore[]): string[] {
    const imperfect = scores.filter((score) => {
      return score.score < PERFECT_SCORE;
    });

    if (imperfect.length === 0) {
      return [];
    }

    return [
      REPORT_SCORES_HEADING,
      ...imperfect.map((score) => {
        const verdict = score.ok ? "within threshold" : "below threshold";

        return `${REPORT_FILE_INDENT}${score.ok ? "✓" : "✗"} ${score.instancePath} (${score.templateName}) — ${this.formatPercentage(score.score)} of ${String(score.totalWeight)}, threshold ${this.formatPercentage(score.threshold)}, ${verdict}`;
      }),
      "",
    ];
  }

  // 🌎 Public Methods

  /** Renders a 0-to-1 score as a percentage. */
  public formatPercentage(score: number): string {
    return `${(score * SCORE_PERCENTAGE_SCALE).toFixed(SCORE_PERCENTAGE_DIGITS)}%`;
  }

  /**
   * Renders every failing file as one report string, with a score summary
   * above it. Returns a success message when there is nothing to report, so
   * callers never print an empty report.
   *
   * Findings print whether or not their instance cleared its threshold: a
   * lowered threshold is permission to ship the drift, not a reason to stop
   * showing it.
   */
  public formatReport(args: FormatReportArguments): string {
    const scoreLines = this.formatScores(args.scores ?? []);

    if (args.fileResults.length === 0) {
      return [...scoreLines, REPORT_SUCCESS_MESSAGE].join("\n");
    }

    return [
      ...scoreLines,
      ...args.fileResults.flatMap((fileResult, index) => {
        return this.formatFileResult({
          fileResult,
          index,
          workingDirectory: args.workingDirectory,
        });
      }),
    ]
      .join("\n")
      .trimStart();
  }
}
