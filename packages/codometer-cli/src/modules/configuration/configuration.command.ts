import path from "node:path";

import { InputService } from "@codometer/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import {
  CONFIGURATION_FORMATS,
  DEFAULT_CONFIGURATION_FORMAT,
} from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";
import { RenderConfigurationService } from "./render-configuration.service";

import type { ConfigurationCommandOptions } from "./configuration.types";

/**
 * CLI entry point for listing what a repository configures.
 *
 * Reports configuration and never measurement: no build is required, nothing
 * is compressed, and no limit is evaluated. That separation is the point — a
 * repository whose limits live one per project has no single place left to
 * read them as a set, and this is that place, without waiting on the builds
 * a measurement would need.
 */
@Command({
  description: "List the codometer configuration found beneath a directory",
  name: "configuration",
})
@Injectable()
export class ConfigurationCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly renderConfigurationService: RenderConfigurationService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ConfigurationCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Parse the directory to look for configuration files beneath. */
  @Option({
    description: "Directory to look for configuration files beneath",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: unknown): string {
    return this.inputService.parseDirectoryOption(value);
  }

  /** Parse the output format the listing is rendered in. */
  @Option({
    description: `Output format, one of ${CONFIGURATION_FORMATS.join(", ")}`,
    flags: "-f, --format [format]",
  })
  public parseFormat(value: unknown): string {
    return this.inputService.parseDefaultedOption(
      value,
      DEFAULT_CONFIGURATION_FORMAT,
    );
  }

  /** Parse whether to list only the limits. */
  @Option({
    description: "List only the configured limits",
    flags: "--limits",
  })
  public parseLimits(): boolean {
    return true;
  }

  /**
   * Lists what the tree beneath the given directory configures.
   *
   * Writes to standard output rather than a file: the listing is something a
   * reader looks at or pipes onward, and unlike a measurement it has no report
   * anything else consumes.
   */
  async run(
    _passedParameters: string[],
    options: ConfigurationCommandOptions = {},
  ): Promise<void> {
    const format = options.format ?? DEFAULT_CONFIGURATION_FORMAT;

    if (!(CONFIGURATION_FORMATS as readonly string[]).includes(format)) {
      throw new Error(
        `--format does not accept "${format}". It takes one of ${CONFIGURATION_FORMATS.join(" and ")}.`,
      );
    }

    const workingDirectory = path.resolve(options.directory ?? process.cwd());
    const described =
      await this.configurationService.describeConfigurations(workingDirectory);

    this.logger.info("🔧 Listed the codometer configuration", undefined, {
      configurationCount: described.length,
      unreadableCount: described.filter((entry) => entry.error !== undefined)
        .length,
    });

    const document = this.renderConfigurationService.render({
      described,
      format,
      limitRows: this.configurationService.toLimitRows(described),
      limitsOnly: options.limits === true,
    });

    process.stdout.write(`${document}\n`);
  }
}
