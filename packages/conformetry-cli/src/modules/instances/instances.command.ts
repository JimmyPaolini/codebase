import { InputService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_CONFIGURATION_PATH } from "../../constants.js";
import {
  DETAIL_INDENT,
  ENTRY_INDENT,
  JSON_INDENT,
  PAIRING_INDENT,
} from "../inventory/inventory.constants.js";
import { InventoryService } from "../inventory/inventory.service";

import {
  NO_INSTANCES_MESSAGE,
  NO_MATCHES_MESSAGE,
  TEMPLATES_HEADING,
} from "./instances.constants.js";

import type { InventoriedInstance } from "../inventory/inventory.types.js";
import type { InstancesCommandOptions } from "./instances.types.js";

/**
 * Lists every instance the configured globs find, and which templates explain
 * each one.
 *
 * Each path printed is usable as the `--instances` argument to the templates
 * command, so the two read as one pair: this side answers "what is generated
 * code here", the other answers "what standard does this path answer to".
 *
 * Output goes to standard output rather than through the logger, which asserts
 * every message opens with an emoji and a verb — right for a log line, wrong
 * for a listing.
 */
@Command({
  description: "Run the instances command",
  name: "instances",
})
@Injectable()
export class InstancesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly inputService: InputService,
    private readonly inventoryService: InventoryService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(InstancesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders one instance as readable lines. */
  private describeInstance(instance: InventoriedInstance): string[] {
    const lines = [
      `${ENTRY_INDENT}${instance.path}`,
      `${DETAIL_INDENT}${TEMPLATES_HEADING}`,
    ];

    for (const template of instance.templates) {
      lines.push(
        `${PAIRING_INDENT}${template.name} ` +
          `${String(template.matchedFileCount)}/${String(template.templateFileCount)} files ${this.inventoryService.formatPercentage(
            template.matchRatio,
          )}`,
      );
    }

    return lines;
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

  /** Parses the optional template filter. */
  @Option({
    description:
      "Comma-separated template names; report only the instances they explain",
    flags: "--templates [names]",
  })
  public parseTemplates(value: string | undefined): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Writes every instance found, filtered to the given templates. */
  public async run(
    _passedParameters: string[],
    options: InstancesCommandOptions,
  ): Promise<void> {
    const instances = await this.inventoryService.resolveInstances({
      configurationPath: options.config ?? DEFAULT_CONFIGURATION_PATH,
      ...(options.templates === undefined
        ? {}
        : { templateNames: options.templates }),
      workingDirectory: process.cwd(),
    });

    if (options.json === true) {
      console.info(JSON.stringify(instances, undefined, JSON_INDENT));
      return;
    }

    if (instances.length === 0) {
      console.info(
        options.templates === undefined
          ? NO_INSTANCES_MESSAGE
          : NO_MATCHES_MESSAGE,
      );
      return;
    }

    for (const instance of instances) {
      console.info(this.describeInstance(instance).join("\n"));
    }
  }
}
