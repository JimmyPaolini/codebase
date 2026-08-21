import {
  ConfigurationService,
  InputService,
  InstanceDiscoveryService,
  TemplateDiscoveryService,
} from "@conformetry/configuration";
import { ReportingService } from "@conformetry/core";
import { ValidationService } from "@conformetry/validation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_CONFIGURATION_PATH } from "../../constants.js";

import type { ValidateCommandOptions } from "./validate.types.js";
import type {
  ConformetryInstanceGroup,
  Instance,
} from "@conformetry/configuration";
import type { RunValidationResult } from "@conformetry/validation";

/**
 * Validates instances against their conformetry templates.
 *
 * Which paths are instances comes from the configuration's `instances` globs,
 * which `--instances` overrides for a one-off run. Every option is optional
 * and none is ever prompted for: an absent filter means "everything", which is
 * a meaningful default rather than a missing answer.
 */
@Command({
  description:
    "Measure instances against their templates and report every difference",
  name: "validate",
})
@Injectable()
export class ValidateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly instanceDiscoveryService: InstanceDiscoveryService,
    private readonly templateDiscoveryService: TemplateDiscoveryService,
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
   * Describes why the run failed, naming the instances that fell short.
   *
   * A file count alone stopped being the whole story once thresholds existed:
   * findings can be printed for an instance that still passed, so the message
   * has to say which instances actually failed and by how much.
   */
  private describeFailure(result: RunValidationResult): string {
    const failed = result.scores.filter((score) => !score.ok);
    const reasons = [
      ...failed.map((score) => {
        return `${score.instancePath} scored ${this.reportingService.formatPercentage(score.score)} against ${score.templateName} (threshold ${this.reportingService.formatPercentage(score.threshold)})`;
      }),
      ...(result.unmatched.length === 0
        ? []
        : [
            `${String(result.unmatched.length)} instance(s) matched no template`,
          ]),
    ];

    return `Validation failed: ${reasons.join("; ")}.`;
  }

  /**
   * Expands every configured glob group into instances, or the single
   * override group `--instances` supplies.
   *
   * Groups exist so that substitutions can differ per glob: `type` is
   * `packages` for one set of paths and `applications` for another, and no
   * generic rule can tell them apart.
   */
  private findInstances(args: {
    groups: ConformetryInstanceGroup[];
    workingDirectory: string;
  }): Instance[] {
    return args.groups.flatMap((group) => {
      return this.instanceDiscoveryService.findInstances({
        // A group may name only labels, which this host has nothing to match
        // them against — it locates instances by glob alone.
        patterns: group.patterns ?? [],
        ...(group.substitutions === undefined
          ? {}
          : { substitutions: group.substitutions }),
        ...(group.threshold === undefined
          ? {}
          : { threshold: group.threshold }),
        workingDirectory: args.workingDirectory,
      });
    });
  }

  /** Reads every configured generator's template folder. */
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

  /** Parses the optional run-level conformance threshold. */
  @Option({
    description:
      "Lowest conformance score an instance may have, from 0 to 1. Overridden by a generator's own threshold and by an instance group's",
    flags: "--threshold [ratio]",
  })
  public parseThreshold(value: string | undefined): number | undefined {
    return this.inputService.parseThresholdOption(value);
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
      instances: this.findInstances({
        groups:
          options.instances === undefined
            ? configuration.flatMap((generator) => generator.instances)
            : [{ patterns: options.instances }],
        workingDirectory,
      }),
      ...(options.threshold === undefined
        ? {}
        : { threshold: options.threshold }),
      ...(options.languages === undefined
        ? {}
        : { languageNames: options.languages }),
      templates: this.templateDiscoveryService.collectTemplates({
        configuration,
        workingDirectory,
      }),
    });

    // The report is the command's product, not a log line: it is a multi-line
    // document written for a reader, and routing it through the logger would
    // both bury it in log framing and force prose no telemetry can group on.
    process.stdout.write(
      `${this.reportingService.formatReport({
        fileResults: result.fileResults,
        scores: result.scores,
        workingDirectory,
      })}\n`,
    );
    this.logger.log("👔 Validated conformetry instances", undefined, {
      count: result.checkedPaths.length,
      failedCount: result.scores.filter((score) => !score.ok).length,
      unmatchedCount: result.unmatched.length,
    });

    if (!result.ok) {
      process.exitCode = 1;
      throw new Error(this.describeFailure(result));
    }
  }
}
