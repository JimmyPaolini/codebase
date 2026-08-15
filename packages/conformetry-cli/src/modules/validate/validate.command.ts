import path from "node:path";

import {
  ConfigurationService,
  DiscoveryService,
  InputService,
} from "@conformetry/configuration";
import { ReportingService } from "@conformetry/core";
import { ValidationService } from "@conformetry/validation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

import { DEFAULT_CONFIGURATION_PATH } from "./validate.constants";

import type { ValidateCommandOptions } from "./validate.types.js";
import type {
  ConformetryConfiguration,
  ConformetryInstanceGroup,
  InstanceCandidate,
  TemplateDefinition,
} from "@conformetry/configuration";

/**
 * Validates instances against their conformetry templates.
 *
 * Which paths are instances comes from the configuration's `instances` globs,
 * which `--instances` overrides for a one-off run. Every option is optional
 * and none is ever prompted for: an absent filter means "everything", which is
 * a meaningful default rather than a missing answer.
 */
@Command({
  description: "Run the validate command",
  name: "validate",
})
@Injectable()
export class ValidateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly discoveryService: DiscoveryService,
    private readonly inputService: InputService,
    private readonly reportingService: ReportingService,
    private readonly validationService: ValidationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ValidateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Expands every configured glob group into candidates, or the single
   * override group `--instances` supplies.
   *
   * Groups exist so that substitutions can differ per glob: `type` is
   * `packages` for one set of paths and `applications` for another, and no
   * generic rule can tell them apart.
   */
  private resolveCandidates(args: {
    groups: ConformetryInstanceGroup[];
    workingDirectory: string;
  }): InstanceCandidate[] {
    return args.groups.flatMap((group) => {
      return this.discoveryService.resolveCandidates({
        // A group may name only labels, which this host has nothing to match
        // them against — it locates instances by glob alone.
        patterns: group.patterns ?? [],
        ...(group.substitutions === undefined
          ? {}
          : { substitutions: group.substitutions }),
        workingDirectory: args.workingDirectory,
      });
    });
  }

  /** Reads every configured generator's template folder. */
  private resolveTemplates(args: {
    configuration: ConformetryConfiguration;
    workingDirectory: string;
  }): TemplateDefinition[] {
    return args.configuration.map((generator) => {
      return this.discoveryService.collectTemplate({
        name: generator.name,
        templatePath: path.resolve(
          args.workingDirectory,
          generator.templatePath,
        ),
      });
    });
  }

  // 🌎 Public Methods

  /** Parses the optional configuration path. */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses the optional instance glob override. */
  @Option({
    description:
      "Comma-separated glob patterns to validate, overriding the configuration",
    flags: "--instances [globs]",
  })
  public parseInstances(value: string | undefined): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Parses the optional language filter. */
  @Option({
    description: "Comma-separated language names to run",
    flags: "--languages [languages]",
  })
  public parseLanguages(value: string | undefined): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Runs validation and reports every difference found. */
  public async run(
    _passedParameters: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    const workingDirectory = process.cwd();
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const result = await this.validationService.validate({
      candidates: this.resolveCandidates({
        groups:
          options.instances === undefined
            ? configuration.flatMap((generator) => generator.instances)
            : [{ patterns: options.instances }],
        workingDirectory,
      }),
      ...(options.languages === undefined
        ? {}
        : { languageNames: options.languages }),
      templates: this.resolveTemplates({ configuration, workingDirectory }),
    });

    this.logger.log(
      this.reportingService.formatReport({
        fileResults: result.fileResults,
        workingDirectory,
      }),
    );

    if (!result.ok) {
      process.exitCode = 1;
      throw new Error(
        `Validation failed: ${String(result.fileResults.length)} file(s) do not conform.`,
      );
    }
  }
}
