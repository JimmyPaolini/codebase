import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  REPORT_ERROR_DETAIL_INDENT,
  REPORT_FILE_DETAIL_INDENT,
  REPORT_FILE_INDENT,
  REPORT_SUCCESS_MESSAGE,
} from "./reporting.constants";

import type { ConformanceError } from "../errors/errors.types";
import type { ValidationFileResult } from "../language/language.types";
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
    error: ConformanceError;
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

  // 🌎 Public Methods

  /**
   * Renders every failing file as one report string. Returns a success message
   * when there is nothing to report, so callers never print an empty report.
   */
  public formatReport(args: FormatReportArguments): string {
    if (args.fileResults.length === 0) {
      return REPORT_SUCCESS_MESSAGE;
    }

    return args.fileResults
      .flatMap((fileResult, index) => {
        return this.formatFileResult({
          fileResult,
          index,
          workingDirectory: args.workingDirectory,
        });
      })
      .join("\n")
      .trimStart();
  }
}
