import { ConfigurationService, InputService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_CONFIGURATION_PATH } from "../../constants.js";

import {
  ALIAS_SEPARATOR,
  DETAIL_INDENT,
  GENERATOR_INDENT,
  JSON_INDENT,
  NO_GENERATORS_MESSAGE,
  TEMPLATE_LABEL,
} from "./list.constants.js";

import type { ListCommandOptions, ListedGenerator } from "./list.types.js";
import type { ConformetryGeneratorDefinition } from "@conformetry/configuration";

/**
 * Names every generator the configuration declares.
 *
 * Nothing else tells an agent what it may generate: a name it guesses at is
 * rejected, and an alias only resolves through the Nx host. Reading the live
 * configuration is what keeps this answer true as generators come and go.
 *
 * Output goes to standard output rather than through the logger, which asserts
 * every message opens with an emoji and a verb — right for a log line, wrong
 * for a listing. `console.info` rather than `console.log` because both write
 * to the same stream and only the former is allowed without suppressing a lint
 * rule.
 */
@Command({
  description: "Run the list command",
  name: "list",
})
@Injectable()
export class ListCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ListCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Renders one already-normalized generator as readable lines.
   *
   * A generator need declare neither aliases nor a description, so both lines
   * are omitted rather than printed empty. The template always exists.
   */
  private describeGenerator(generator: ListedGenerator): string[] {
    const lines = [
      generator.aliases.length === 0
        ? `${GENERATOR_INDENT}${generator.name}`
        : `${GENERATOR_INDENT}${generator.name} (${generator.aliases.join(ALIAS_SEPARATOR)})`,
    ];

    if (generator.description !== "") {
      lines.push(`${DETAIL_INDENT}${generator.description}`);
    }
    lines.push(`${DETAIL_INDENT}${TEMPLATE_LABEL}${generator.templatePath}`);

    return lines;
  }

  /**
   * Reduces one generator to the fields a listing carries.
   *
   * Both output forms read this, so an absent alias list or description is
   * defaulted once rather than once per form.
   */
  private toListedGenerator(
    generator: ConformetryGeneratorDefinition,
  ): ListedGenerator {
    return {
      aliases: generator.aliases ?? [],
      description: generator.description ?? "",
      name: generator.name,
      templatePath: generator.templatePath,
    };
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

  /** Selects the machine-readable listing. */
  @Option({
    description: "Write the listing as JSON",
    flags: "--json",
  })
  public parseJson(): boolean {
    return true;
  }

  /** Writes every declared generator to standard output. */
  public async run(
    _passedParameters: string[],
    options: ListCommandOptions,
  ): Promise<void> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const listed = configuration.map((generator) =>
      this.toListedGenerator(generator),
    );

    if (options.json === true) {
      console.info(JSON.stringify(listed, undefined, JSON_INDENT));
      return;
    }

    if (listed.length === 0) {
      console.info(NO_GENERATORS_MESSAGE);
      return;
    }

    for (const generator of listed) {
      console.info(this.describeGenerator(generator).join("\n"));
    }
  }
}
