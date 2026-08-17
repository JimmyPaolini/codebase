import path from "node:path";

import { Injectable } from "@nestjs/common";

import type {
  ConformetryLanguageValidator,
  LanguageValidatorResult,
  PreparedValidationDocument,
  RunLanguageValidatorArguments,
  ValidationFileResult,
} from "./language.types";

/**
 * Runs a language validator over a prepared document set.
 *
 * This is the shared envelope every language package used to reimplement:
 * select the documents this validator claims, compare each one, group the
 * errors under their file, and assemble the result. Centralizing it means a
 * language package contains only its comparison logic, and that every
 * validator reports its outcome identically.
 */
@Injectable()
export class LanguageService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Returns whether a validator claims a document, by matching the instance
   * file's extension against the validator descriptor.
   */
  private claimsDocument(args: {
    document: PreparedValidationDocument;
    validator: ConformetryLanguageValidator;
  }): boolean {
    const extension = path.extname(args.document.filename);

    return args.validator.descriptor.fileExtensions.includes(extension);
  }

  /** Compares one document and keeps its findings with its requirement size. */
  private validateDocument(args: {
    document: PreparedValidationDocument;
    validator: ConformetryLanguageValidator;
  }): ValidationFileResult {
    const { errors, totalWeight } = args.validator.validateDocument(
      args.document,
    );

    return {
      errors,
      filename: args.document.filename,
      instanceFilePath: args.document.instanceFilePath,
      templateFilePath: args.document.templateFilePath,
      totalWeight,
    };
  }

  // 🌎 Public Methods

  /**
   * Selects the documents a validator claims and returns its aggregated
   * result.
   *
   * Documents the validator does not claim are skipped silently — several
   * validators run over the same document set and each takes only its own
   * extensions.
   *
   * Every claimed document contributes its weight, but only the failing ones
   * are kept as file results. Reports should list faults, not files; scores
   * need the whole denominator. Dropping clean documents before totalling
   * would score an instance against only the parts of itself that are wrong,
   * which reads as near-zero for an instance with one bad file among twenty.
   */
  public runValidator(
    args: RunLanguageValidatorArguments,
  ): LanguageValidatorResult {
    const documentResults = args.documents
      .filter((document) => {
        return this.claimsDocument({ document, validator: args.validator });
      })
      .map((document) => {
        return this.validateDocument({ document, validator: args.validator });
      });
    const fileResults = documentResults.filter((fileResult) => {
      return fileResult.errors.length > 0;
    });

    return {
      checkedPaths: args.checkedPaths,
      fileResults,
      languageName: args.validator.descriptor.name,
      ok: fileResults.length === 0,
      totalWeight: documentResults.reduce((total, fileResult) => {
        return total + fileResult.totalWeight;
      }, 0),
    };
  }
}
