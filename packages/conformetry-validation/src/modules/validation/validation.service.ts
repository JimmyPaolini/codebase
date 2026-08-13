import {
  ConfigurationService,
  DiscoveryService as TemplateDiscoveryService,
} from "@jimmypaolini/conformetry-configuration";
import { LanguageService } from "@jimmypaolini/conformetry-core";
import { FilesService } from "@jimmypaolini/conformetry-files";
import { Injectable } from "@nestjs/common";

import { DiscoveryScopeService } from "../discovery/discovery-scope.service";
import { DiscoveryService } from "../discovery/discovery.service";

import { ValidationLanguagesService } from "./validation-languages.service";
import { ValidationSelectionService } from "./validation-selection.service";
import { DEFAULT_CONFIGURATION_PATH } from "./validation.constants";

import type {
  RunValidationArguments,
  RunValidationResult,
} from "./validation.types";
import type {
  ConformetryLanguageValidator,
  ValidationFileResult,
} from "@jimmypaolini/conformetry-core";

/**
 * Runs a full conformetry validation: discover projects, resolve which
 * templates apply where, check files exist, then compare contents.
 *
 * Configuration is loaded once per run and threaded through. It used to be
 * re-read from disk by every language validator on every call — seven reads
 * for a single command.
 */
@Injectable()
export class ValidationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly discoveryScopeService: DiscoveryScopeService,
    private readonly discoveryService: DiscoveryService,
    private readonly filesService: FilesService,
    private readonly languageService: LanguageService,
    private readonly validationLanguagesService: ValidationLanguagesService,
    private readonly templateDiscoveryService: TemplateDiscoveryService,
    private readonly validationSelectionService: ValidationSelectionService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Compares one scoped directory's documents with every selected validator. */
  private async validateScopedPath(args: {
    configurationPath: string;
    generatorNames: string[];
    scopedPath: string;
    validators: ConformetryLanguageValidator[];
    workingDirectory: string;
  }): Promise<ValidationFileResult[]> {
    const fileExtensions = args.validators.flatMap((validator) => {
      return [...validator.descriptor.fileExtensions];
    });
    const documents =
      await this.templateDiscoveryService.prepareValidationPayload({
        configurationPath: args.configurationPath,
        fileExtensions,
        projectPaths: [args.scopedPath],
        templateRuleNames: args.generatorNames,
        workingDirectory: args.workingDirectory,
      });

    return args.validators.flatMap((validator) => {
      return this.languageService.runValidator({
        checkedPaths: [args.scopedPath],
        documents,
        validator,
      }).fileResults;
    });
  }

  // 🌎 Public Methods

  /**
   * Validates the requested projects and returns every difference found.
   *
   * File existence is checked first: a missing file cannot be compared, and
   * reporting it once is clearer than reporting it from each language.
   */
  public async validate(
    args: RunValidationArguments,
  ): Promise<RunValidationResult> {
    const configurationPath =
      args.configurationPath ?? DEFAULT_CONFIGURATION_PATH;
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        configurationPath,
      );
    const allValidators = this.validationLanguagesService.readValidators();
    const { generatorNames, languageNames } =
      this.validationSelectionService.partitionRuleNames({
        languageNames: allValidators.map(
          (validator) => validator.descriptor.name,
        ),
        ruleNames: args.ruleNames,
      });
    const validators =
      languageNames.length === 0
        ? allValidators
        : allValidators.filter((validator) => {
            return languageNames.includes(validator.descriptor.name);
          });
    const projects = this.validationSelectionService.selectProjects({
      projects: this.discoveryService.discoverProjects(args.workingDirectory),
      selectors: args.projectPaths,
      workingDirectory: args.workingDirectory,
    });
    const scopedPaths = projects.flatMap((project) => {
      return this.discoveryScopeService
        .resolveScopedPaths({
          configuration,
          project,
          workingDirectory: args.workingDirectory,
        })
        .map((scopedPath) => {
          return generatorNames.length === 0
            ? scopedPath
            : {
                ...scopedPath,
                generatorNames: scopedPath.generatorNames.filter((name) => {
                  return generatorNames.includes(name);
                }),
              };
        })
        .filter((scopedPath) => scopedPath.generatorNames.length > 0);
    });
    const fileResults: ValidationFileResult[] = [];

    for (const scopedPath of scopedPaths) {
      fileResults.push(
        ...(await this.filesService.checkProjectFiles({
          configurationPath,
          projectPaths: [scopedPath.path],
          templateRuleNames: scopedPath.generatorNames,
          workingDirectory: args.workingDirectory,
        })),
        ...(await this.validateScopedPath({
          configurationPath,
          generatorNames: scopedPath.generatorNames,
          scopedPath: scopedPath.path,
          validators,
          workingDirectory: args.workingDirectory,
        })),
      );
    }

    return {
      checkedPaths: scopedPaths.map((scopedPath) => scopedPath.path),
      fileResults,
      ok: fileResults.length === 0,
    };
  }
}
