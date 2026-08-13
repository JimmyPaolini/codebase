import path from "node:path";

import { Injectable } from "@nestjs/common";

import { ConfigurationService } from "../configuration/configuration.service";

import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";

import type { ConformetryConfiguration } from "../configuration/configuration.types";
import type {
  ExpectedFile,
  PrepareValidationPayloadArguments,
  ResolveExpectedFilesArguments,
} from "./discovery.types";
import type { PreparedValidationDocument } from "@jimmypaolini/conformetry-core";

/**
 * Turns project paths into the rendered template/instance pairs that language
 * validators compare.
 *
 * This is the entry point for the discovery module: it loads the config once,
 * resolves which generators are in scope, matches each project to its
 * template, and reads the resulting document pairs.
 */
@Injectable()
export class DiscoveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly discoveryMatchingService: DiscoveryMatchingService,
    private readonly discoveryTemplatesService: DiscoveryTemplatesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Prepares every document for one project path.
   *
   * Returns nothing when no template matches — an unrecognized project is not
   * an error, it simply has no rules to check against.
   */
  public prepareDocumentsForProject(args: {
    configuration: ConformetryConfiguration;
    fileExtensions: string[];
    generatorNames: string[];
    projectPath: string;
    workingDirectory: string;
  }): PreparedValidationDocument[] {
    const candidate = this.discoveryMatchingService.resolveBestCandidate({
      configuration: args.configuration,
      generatorNames: args.generatorNames,
      projectPath: args.projectPath,
      workingDirectory: args.workingDirectory,
    });

    if (candidate === undefined) {
      return [];
    }

    const extensions = new Set(args.fileExtensions);

    return candidate.templateFilePaths
      .filter((templateFilePath) => {
        return extensions.has(path.extname(templateFilePath));
      })
      .map((templateFilePath) => {
        return this.discoveryTemplatesService.prepareDocument({
          projectPath: args.projectPath,
          substitutions: candidate.substitutions,
          templateDirectoryPath: candidate.absoluteTemplateDirectoryPath,
          templateFilePath,
        });
      })
      .filter((document) => document !== undefined);
  }

  /**
   * Loads the configuration and prepares documents for every requested path.
   */
  public async prepareValidationPayload(
    args: PrepareValidationPayloadArguments,
  ): Promise<PreparedValidationDocument[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const generatorNames = this.resolveGeneratorNames({
      configuration,
      ...(args.templateRuleNames === undefined
        ? {}
        : { templateRuleNames: args.templateRuleNames }),
    });

    return args.projectPaths.flatMap((projectPath) => {
      return this.prepareDocumentsForProject({
        configuration,
        fileExtensions: args.fileExtensions,
        generatorNames,
        projectPath: path.resolve(args.workingDirectory, projectPath),
        workingDirectory: args.workingDirectory,
      });
    });
  }

  /**
   * Lists every file the matched template requires of each project, whatever
   * its extension.
   *
   * Unlike `prepareValidationPayload`, this does not filter by extension and
   * does not read file contents — it answers "which files should exist", which
   * is what `conformetry-files` checks. Extension-less files such as
   * `.gitignore` are therefore covered here and nowhere else.
   */
  public async resolveExpectedFiles(
    args: ResolveExpectedFilesArguments,
  ): Promise<ExpectedFile[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const generatorNames = this.resolveGeneratorNames({
      configuration,
      ...(args.templateRuleNames === undefined
        ? {}
        : { templateRuleNames: args.templateRuleNames }),
    });

    return args.projectPaths.flatMap((rawProjectPath) => {
      const projectPath = path.resolve(args.workingDirectory, rawProjectPath);
      const candidate = this.discoveryMatchingService.resolveBestCandidate({
        configuration,
        generatorNames,
        projectPath,
        workingDirectory: args.workingDirectory,
      });

      if (candidate === undefined) {
        return [];
      }

      return candidate.templateFilePaths.map((templateFilePath) => {
        return {
          instanceFilePath: this.discoveryTemplatesService.resolveInstancePath({
            projectPath,
            substitutions: candidate.substitutions,
            templateDirectoryPath: candidate.absoluteTemplateDirectoryPath,
            templateFilePath,
          }),
          projectPath,
          templateFilePath,
        };
      });
    });
  }

  /**
   * Narrows the configured generators to those the caller asked for, or all of
   * them when no filter was given.
   */
  public resolveGeneratorNames(args: {
    configuration: ConformetryConfiguration;
    templateRuleNames?: string[];
  }): string[] {
    const configuredNames = Object.keys(args.configuration.generators);
    const requestedNames = args.templateRuleNames;

    if (requestedNames === undefined || requestedNames.length === 0) {
      return configuredNames;
    }

    return configuredNames.filter((generatorName) => {
      return requestedNames.includes(generatorName);
    });
  }
}
