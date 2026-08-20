import { InputService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_CONFIGURATION_PATH } from "../../constants.js";
import {
  ALIAS_SEPARATOR,
  DETAIL_INDENT,
  ENTRY_INDENT,
  JSON_INDENT,
  PAIRING_INDENT,
} from "../inventory/inventory.constants.js";
import { InventoryService } from "../inventory/inventory.service";

import {
  INSTANCES_HEADING,
  NO_MATCHES_MESSAGE,
  NO_TEMPLATES_MESSAGE,
  TEMPLATE_LABEL,
} from "./templates.constants.js";

import type { InventoriedTemplate } from "../inventory/inventory.types.js";
import type { TemplatesCommandOptions } from "./templates.types.js";

/**
 * Names every template the configuration declares, and which instances each
 * explains.
 *
 * With `--instances` it answers the other direction — which templates explain a
 * given path. That is one command rather than two because a path can belong to
 * several templates at once: nothing records where an instance came from, so
 * attribution is inferred from file overlap and ties are real.
 *
 * Output goes to standard output rather than through the logger, which asserts
 * every message opens with an emoji and a verb — right for a log line, wrong
 * for a listing.
 */
@Command({
  description: "Run the templates command",
  name: "templates",
})
@Injectable()
export class TemplatesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly inputService: InputService,
    private readonly inventoryService: InventoryService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(TemplatesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Renders one template as readable lines.
   *
   * The instances are listed only when the caller narrowed by path. A bare
   * listing is a registry — naming every instance of every template there
   * would bury the ten names somebody actually asked for.
   */
  private describeTemplate(args: {
    showInstances: boolean;
    template: InventoriedTemplate;
  }): string[] {
    const { template } = args;
    const lines = [
      template.aliases.length === 0
        ? `${ENTRY_INDENT}${template.name}`
        : `${ENTRY_INDENT}${template.name} (${template.aliases.join(ALIAS_SEPARATOR)})`,
    ];

    if (template.description !== "") {
      lines.push(`${DETAIL_INDENT}${template.description}`);
    }
    lines.push(`${DETAIL_INDENT}${TEMPLATE_LABEL}${template.templatePath}`);

    if (args.showInstances && template.instances.length > 0) {
      lines.push(`${DETAIL_INDENT}${INSTANCES_HEADING}`);
      for (const instance of template.instances) {
        lines.push(
          `${PAIRING_INDENT}${instance.name} ` +
            `${String(instance.matchedFileCount)}/${String(instance.templateFileCount)} files ${this.inventoryService.formatPercentage(
              instance.matchRatio,
            )}`,
        );
      }
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

  /** Parses the optional instance filter. */
  @Option({
    description:
      "Comma-separated paths or globs; report only the templates that explain them",
    flags: "--instances [globs]",
  })
  public parseInstances(value: string | undefined): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Selects the machine-readable listing. */
  @Option({
    description: "Write the listing as JSON",
    flags: "--json",
  })
  public parseJson(): boolean {
    return true;
  }

  /** Writes every declared template, filtered to the given instances. */
  public async run(
    _passedParameters: string[],
    options: TemplatesCommandOptions,
  ): Promise<void> {
    const templates = await this.inventoryService.resolveTemplates({
      configurationPath: options.config ?? DEFAULT_CONFIGURATION_PATH,
      ...(options.instances === undefined
        ? {}
        : { instancePatterns: options.instances }),
      workingDirectory: process.cwd(),
    });

    if (options.json === true) {
      console.info(JSON.stringify(templates, undefined, JSON_INDENT));
      return;
    }

    if (templates.length === 0) {
      console.info(
        options.instances === undefined
          ? NO_TEMPLATES_MESSAGE
          : NO_MATCHES_MESSAGE,
      );
      return;
    }

    for (const template of templates) {
      console.info(
        this.describeTemplate({
          showInstances: options.instances !== undefined,
          template,
        }).join("\n"),
      );
    }
  }
}
