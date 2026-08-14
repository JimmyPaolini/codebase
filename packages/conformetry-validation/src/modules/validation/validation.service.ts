import path from "node:path";

import { DiscoveryService } from "@jimmypaolini/conformetry-configuration";
import { LanguageService } from "@jimmypaolini/conformetry-core";
import { FilesService } from "@jimmypaolini/conformetry-files";
import { Injectable } from "@nestjs/common";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationLanguagesService } from "./validation-languages.service";

import type {
  InstanceFileResults,
  RunValidationArguments,
  RunValidationResult,
} from "./validation.types";
import type { MatchedInstance } from "@jimmypaolini/conformetry-configuration";
import type {
  ConformetryLanguageValidator,
  ValidationFileResult,
} from "@jimmypaolini/conformetry-core";

/**
 * Runs a full conformetry validation: match candidates to templates, check the
 * files exist, then compare contents language by language.
 *
 * The candidates arrive from the caller. This package used to scan the
 * workspace for `project.json` files and infer scope from generator name
 * suffixes, which made a generic package depend on one repository's layout.
 */
@Injectable()
export class ValidationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly filesService: FilesService,
    private readonly languageService: LanguageService,
    private readonly validationDeduplicationService: ValidationDeduplicationService,
    private readonly validationFindingsService: ValidationFindingsService,
    private readonly validationLanguagesService: ValidationLanguagesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Every distinct file extension the matched templates declare. */
  private readTemplateExtensions(instances: MatchedInstance[]): string[] {
    return [
      ...new Set(
        instances.flatMap((instance) => {
          return instance.template.filePaths.map((filePath) => {
            return path.extname(filePath);
          });
        }),
      ),
    ];
  }

  /** Narrows the resolved validators to the names the caller asked for. */
  private selectValidators(args: {
    languageNames: string[] | undefined;
    validators: ConformetryLanguageValidator[];
  }): ConformetryLanguageValidator[] {
    if (args.languageNames === undefined || args.languageNames.length === 0) {
      return args.validators;
    }

    return args.validators.filter((validator) => {
      return args.languageNames?.includes(validator.descriptor.name) ?? false;
    });
  }

  /**
   * Checks one instance's files exist, then compares the documents whose
   * extensions the selected validators claim.
   *
   * File existence comes first because a missing file cannot be compared, and
   * reporting it once is clearer than every language reporting it in turn.
   */
  private validateInstance(args: {
    instance: MatchedInstance;
    validators: ConformetryLanguageValidator[];
  }): ValidationFileResult[] {
    const [prepared] = this.discoveryService.prepareDocuments({
      fileExtensions: args.validators.flatMap((validator) => {
        return [...validator.descriptor.fileExtensions];
      }),
      instances: [args.instance],
    });

    return [
      ...this.filesService.checkInstanceFiles({ instances: [args.instance] }),
      ...args.validators.flatMap((validator) => {
        return this.languageService.runValidator({
          checkedPaths: [args.instance.candidate.instancePath],
          documents: prepared?.documents ?? [],
          validator,
        }).fileResults;
      }),
    ];
  }

  // 🌎 Public Methods

  /**
   * Validates every candidate and returns the differences found.
   *
   * Candidates that matched no template are reported alongside the content
   * differences rather than skipped, so one report covers both "this file is
   * wrong" and "conformetry cannot tell what this path was generated from".
   */
  public async validate(
    args: RunValidationArguments,
  ): Promise<RunValidationResult> {
    const { matched, unmatched } = this.discoveryService.resolveInstances({
      candidates: args.candidates,
      templates: args.templates,
    });
    const validators = this.selectValidators({
      languageNames: args.languageNames,
      validators: await this.validationLanguagesService.resolveValidators({
        extensions: this.readTemplateExtensions(matched),
        ...(args.loadLanguageModule === undefined
          ? {}
          : { loadLanguageModule: args.loadLanguageModule }),
      }),
    });
    const groups: InstanceFileResults[] = matched.map((instance) => {
      return {
        fileResults: this.validateInstance({ instance, validators }),
        instance,
      };
    });
    const fileResults = [
      ...this.validationDeduplicationService.deduplicate(groups),
      ...this.validationFindingsService.buildUnmatchedResults({
        templates: args.templates,
        unmatched,
      }),
    ];

    return {
      checkedPaths: matched.map((instance) => {
        return instance.candidate.instancePath;
      }),
      fileResults,
      ok: fileResults.length === 0,
      unmatched,
    };
  }
}
