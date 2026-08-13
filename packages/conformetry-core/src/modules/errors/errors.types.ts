// 🏷️ Types

/** Arguments for building a missing-directory conformance error. */
export interface BuildMissingDirectoryErrorArguments {
  readonly instanceDirectoryPath: string;
  readonly templateDirectoryPath: string;
}

/** Arguments for building a missing-file conformance error. */
export interface BuildMissingFileErrorArguments {
  readonly instanceFilePath: string;
  readonly templateFilePath: string;
}

/**
 * A structured conformance error produced by any validator.
 *
 * Two discriminating fields identify the error category:
 * - `errorType` — what kind of element is missing
 * - `language` — which validator / file format produced the error.
 *
 * All errors represent a *missing* or *mismatched* element; there is no
 * separate action field. Consumers render these through `ReportingService`
 * rather than formatting them ad hoc, so every validator reports identically.
 */
export interface ConformanceError {
  /** Actual value found in the instance (populated for value-mismatch errors). */
  readonly actual?: string;
  /** Category of missing element. */
  readonly errorType: ConformanceErrorType;
  /** Snippet of the template content that should be present in the instance. */
  readonly expected?: string;
  /** One-line actionable suggestion for the reader (human or coding agent). */
  readonly fix: string;
  /** 1-based column number in the instance file where the error was detected. */
  readonly instanceColumn?: number;
  /** 1-based line number in the instance file where the error was detected. */
  readonly instanceLine?: number;
  /** JSON dot-notation path in the instance document, e.g. `"scripts.build[0]"`. */
  readonly instancePath?: string;
  /**
   * File format of the validator that produced this error.
   * Absent for `"file"` and `"directory"` errors.
   */
  readonly language?: ConformanceErrorLanguage;
  /** Short human-readable description of what is missing. */
  readonly message: string;
  /** 1-based column number in the rendered template that defines the requirement. */
  readonly templateColumn?: number;
  /** 1-based line number in the rendered template that defines the requirement. */
  readonly templateLine?: number;
  /** JSON dot-notation path in the template document. */
  readonly templatePath?: string;
}

/**
 * The language / file format processed by the validator that produced the
 * error. Absent for `"file"` and `"directory"` errors, which are language
 * agnostic and raised by `conformetry-files`.
 */
export type ConformanceErrorLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "python"
  | "text"
  | "typescript";

/** Category of the missing element that caused the conformance failure. */
export type ConformanceErrorType = "code" | "comment" | "directory" | "file";
