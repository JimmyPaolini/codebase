// 🏷️ Types

import type { ConformetryError } from "../errors/errors.types";

/**
 * A validator for one language or file format.
 *
 * Implementations supply only their descriptor and a single-document
 * comparison. Extension filtering, result grouping, and result assembly are
 * handled once by `LanguageService`, so no validator repeats that envelope.
 *
 * Not to be confused with an Nx plugin — this is the contract between
 * `conformetry-validation` and packages such as `conformetry-typescript`.
 */
export interface ConformetryLanguageValidator {
  readonly descriptor: LanguageValidatorDescriptor;
  /**
   * Compares one already-rendered template against its instance and returns
   * every difference, plus how much was asked of the instance. Called only for
   * documents whose extension this validator claims, so implementations never
   * need to re-check the extension.
   */
  validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult;
}

/**
 * What comparing one document produced: the differences, and the size of the
 * requirement the comparison weighed them against.
 *
 * The total is reported even when nothing is wrong. A conforming document is
 * still evidence — it is the part of the instance that *did* honour its
 * template — and leaving it out of the denominator would score an instance
 * only against the files it got wrong.
 */
export interface DocumentValidationResult {
  readonly errors: ConformetryError[];
  /** Combined weight of the template requirements this document imposes. */
  readonly totalWeight: number;
}

/** Identifies a language validator and declares which files it claims. */
export interface LanguageValidatorDescriptor {
  /** Human-readable summary shown in CLI help and reports. */
  readonly description?: string;
  /** Extensions this validator claims, including the leading dot. */
  readonly fileExtensions: readonly string[];
  /** Stable identifier, also usable as a `--languages` filter value. */
  readonly name: string;
}

/** Outcome of running one language validator over a document set. */
export interface LanguageValidatorResult {
  readonly checkedPaths: string[];
  readonly fileResults: ValidationFileResult[];
  readonly languageName: string;
  readonly ok: boolean;
  /**
   * Combined weight of every document this validator claimed, conforming ones
   * included — see `DocumentValidationResult.totalWeight`.
   */
  readonly totalWeight: number;
}

/**
 * A template file paired with the instance file it governs, with the template
 * already rendered against the project's substitutions. Producing these is
 * `conformetry-configuration`'s job; validators only compare them.
 *
 * A document exists only when both sides are present on disk — missing files
 * are reported by `conformetry-files` before validators ever run.
 */
export interface PreparedValidationDocument {
  /** Basename of the instance file, used to pick a parser. */
  readonly filename: string;
  /** Verbatim contents of the instance file. */
  readonly instance: string;
  /** Absolute path to the instance file, used in error messages. */
  readonly instanceFilePath: string;
  /** Template contents after substitutions have been applied. */
  readonly renderedTemplate: string;
  /** Absolute path to the source template, used in error messages. */
  readonly templateFilePath: string;
}

/** The document pairs discovered for one validation run. */
export interface PreparedValidationPayload {
  readonly checkedPaths: string[];
  readonly documents: PreparedValidationDocument[];
}

/** Arguments for running one language validator over a prepared document set. */
export interface RunLanguageValidatorArguments {
  readonly checkedPaths: string[];
  readonly documents: PreparedValidationDocument[];
  readonly validator: ConformetryLanguageValidator;
}

/**
 * Every error found in one instance file, kept grouped by file so reports can
 * print a per-file heading with its originating template.
 */
export interface ValidationFileResult {
  readonly errors: ConformetryError[];
  readonly filename: string;
  readonly instanceFilePath: string;
  readonly templateFilePath: string;
  /** Combined weight of the template requirements checked in this file. */
  readonly totalWeight: number;
}
