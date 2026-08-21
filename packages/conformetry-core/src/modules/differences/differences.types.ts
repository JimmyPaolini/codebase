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
 * - `differenceType` — what kind of element is missing
 * - `language` — which validator / file format produced the error.
 *
 * All differences represent a *missing* or *mismatched* element; there is no
 * separate action field. Consumers render these through `ReportingService`
 * rather than formatting them ad hoc, so every validator reports identically.
 */
export interface ConformetryDifference {
  /** Actual value found in the instance (populated for value-mismatch differences). */
  readonly actual?: string;
  /** Category of missing element. */
  readonly differenceType: ConformetryDifferenceType;
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
   * Absent for `"file"` and `"directory"` differences.
   */
  readonly language?: ConformetryDifferenceLanguage;
  /** Short human-readable description of what is missing. */
  readonly message: string;
  /** 1-based column number in the rendered template that defines the requirement. */
  readonly templateColumn?: number;
  /** 1-based line number in the rendered template that defines the requirement. */
  readonly templateLine?: number;
  /** JSON dot-notation path in the template document. */
  readonly templatePath?: string;
  /**
   * How many template requirements this one finding accounts for.
   *
   * A validator reports a missing element once, however much of the template
   * that element contained: deleting a class is one error, not one per member.
   * The weight restores the proportion — a missing class stands in for its
   * whole subtree, a missing import stands only for itself — so an instance's
   * score reflects how much of the template is actually absent.
   *
   * Defaults to 1 when absent, which is right for any leaf requirement.
   */
  readonly weight?: number;
}

/**
 * The language / file format processed by the validator that produced the
 * error. Absent for `"file"` and `"directory"` differences, which are language
 * agnostic and raised by `conformetry-files`.
 */
export type ConformetryDifferenceLanguage =
  | "javascript"
  | "json"
  | "markdown"
  | "python"
  | "text"
  | "typescript";

/**
 * Category of the element that caused the conformance failure.
 *
 * `"instance"` is the odd one out: it does not name a missing element inside a
 * file but a directory or file the caller declared to be generated code, which
 * conformetry could not attribute to any single template.
 */
export type ConformetryDifferenceType =
  | "code"
  | "comment"
  | "directory"
  | "file"
  | "instance";
