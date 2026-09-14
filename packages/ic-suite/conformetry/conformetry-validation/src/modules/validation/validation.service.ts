import path from "node:path";

import { InstanceDiscoveryService } from "@conformetry/configuration";
import { RunnerService } from "@conformetry/core";
import { FilesService } from "@conformetry/files";
import { LanguagesService } from "@conformetry/languages";
import { Injectable } from "@nestjs/common";

import { ValidationDeduplicationService } from "./validation-deduplication.service";
import { ValidationFindingsService } from "./validation-findings.service";
import { ValidationScoringService } from "./validation-scoring.service";

import type {
  InstanceFileResults,
  RunValidationArguments,
  RunValidationResult,
} from "./validation.types";
import type { MatchedInstance } from "@conformetry/configuration";
import type { ConformetryLanguageValidator } from "@conformetry/core";

/**
 * Runs a full conformetry validation: match instances to templates, check the
 * files exist, then compare contents language by language.
 *
 * The instances arrive from the caller. This package used to scan the
 * workspace for `project.json` files and infer scope from generator name
 * suffixes, which made a generic package depend on one repository's layout.
 */
@Injectable()
export class ValidationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly instanceDiscoveryService: InstanceDiscoveryService,
    private readonly filesService: FilesService,
    private readonly languagesService: LanguagesService,
    private readonly runnerService: RunnerService,
    private readonly validationDeduplicationService: ValidationDeduplicationService,
    private readonly validationFindingsService: ValidationFindingsService,
    private readonly validationScoringService: ValidationScoringService,
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
    const { languageNames } = args;

    if (languageNames === undefined || languageNames.length === 0) {
      return args.validators;
    }

    // Bound to a local so the narrowing above survives into the closure,
    // which otherwise needs a fallback for a case that cannot happen.
    return args.validators.filter((validator) => {
      return languageNames.includes(validator.descriptor.name);
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
  }): InstanceFileResults {
    const [prepared] = this.instanceDiscoveryService.prepareDocuments({
      fileExtensions: args.validators.flatMap((validator) => {
        return [...validator.descriptor.fileExtensions];
      }),
      instances: [args.instance],
    });
    const files = this.filesService.checkInstanceFiles({
      instances: [args.instance],
    });
    const languages = args.validators.map((validator) => {
      return this.runnerService.runValidator({
        checkedPaths: [args.instance.instance.path],
        documents: prepared?.documents ?? [],
        validator,
      });
    });

    return {
      fileResults: [
        ...files.fileResults,
        ...languages.flatMap((language) => language.fileResults),
      ],
      instance: args.instance,
      // Existence and content are separate requirements over the same files:
      // a file can be present and still wrong, so neither total subsumes the
      // other and they add.
      totalWeight: languages.reduce((total, language) => {
        return total + language.totalWeight;
      }, files.totalWeight),
    };
  }

  // 🌎 Public Methods

  /**
   * Validates every instance and returns the differences found.
   *
   * Instances that matched no template are reported alongside the content
   * differences rather than skipped, so one report covers both "this file is
   * wrong" and "conformetry cannot tell what this path was generated from".
   *
   * Synchronous, because resolving the languages was the only step that ever
   * waited on anything: they were imported on demand, and now they are
   * injected.
   */
  public validate(args: RunValidationArguments): RunValidationResult {
    const { matched, unmatched } = this.instanceDiscoveryService.matchInstances(
      {
        instances: args.instances,
        templates: args.templates,
      },
    );
    const validators = this.selectValidators({
      languageNames: args.languageNames,
      validators: this.languagesService.resolveValidators({
        extensions: this.readTemplateExtensions(matched),
      }),
    });
    const groups: InstanceFileResults[] = matched.map((instance) => {
      return this.validateInstance({ instance, validators });
    });
    const scores = this.validationScoringService.scoreInstances({
      groups,
      runThreshold: args.threshold,
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
        return instance.instance.path;
      }),
      fileResults,
      // An unmatched instance always fails: no template explains it, so there
      // is no threshold it could be held to in the first place.
      ok: unmatched.length === 0 && scores.every((score) => score.ok),
      scores,
      unmatched,
    };
  }
}
