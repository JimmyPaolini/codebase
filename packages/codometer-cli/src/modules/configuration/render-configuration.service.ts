import { Injectable } from "@nestjs/common";

import {
  CONFIGURATION_HEADING,
  LIMIT_TABLE_COLUMNS,
} from "./configuration.constants";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
  RenderConfigurationArguments,
} from "./configuration.types";

/**
 * Turns a resolved configuration listing into the document a reader gets.
 *
 * Markdown by default because the listing is a table and a repository already
 * reads codometer's output as markdown; JSON when something downstream parses
 * it. Kept apart from the command so the shape of the document is testable
 * without a command line, and apart from the service so gathering the
 * configuration never depends on how it will be shown.
 */
@Injectable()
export class RenderConfigurationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders everything one configuration file resolved to. */
  private renderDirectory(entry: ConfiguredDirectory): string {
    const { configuration } = entry;

    if (configuration === undefined) {
      return [
        `## ${entry.directory}`,
        "",
        `Declared in \`${entry.path}\`.`,
        "",
        `- ⚠️ Could not be read: ${entry.error ?? "unknown error"}`,
      ].join("\n");
    }

    return [
      `## ${entry.directory}`,
      "",
      `Declared in \`${entry.path}\`.`,
      "",
      `- Targets: ${this.renderNames(configuration.targets.map((target) => target.name))}`,
      `- Limits: ${String(configuration.limits.length)}`,
      `- Custom statistics: ${this.renderNames(configuration.statistics.map((statistic) => statistic.label))}`,
      `- Documentation check: ${configuration.documentation === undefined ? "off" : "on"}`,
      `- Python command: \`${configuration.python.command}\``,
      `- Excluded globs: ${String(configuration.exclude.length)}`,
      `- Exclude files: ${this.renderNames(configuration.excludeFrom)}`,
    ].join("\n");
  }

  /** Renders the limits as a markdown table, or a line saying there are none. */
  private renderLimitsTable(rows: readonly ConfiguredLimitRow[]): string {
    if (rows.length === 0) {
      return "No limits are configured.";
    }

    return [
      this.renderRow(LIMIT_TABLE_COLUMNS),
      this.renderRow(LIMIT_TABLE_COLUMNS.map(() => "---")),
      ...rows.map((row) =>
        this.renderRow([
          row.directory,
          `\`${row.metric}\``,
          row.label,
          row.severity,
          row.value,
          `\`${row.path}\``,
        ]),
      ),
    ].join("\n");
  }

  /** Renders a list of names, or an em dash when the list is empty. */
  private renderNames(names: readonly string[]): string {
    return names.length === 0 ? "—" : names.join(", ");
  }

  /** Renders one markdown table row, escaping nothing a path may not hold. */
  private renderRow(cells: readonly string[]): string {
    return `| ${cells.join(" | ")} |`;
  }

  // 🌎 Public Methods

  /** Renders the listing in the requested format. */
  public render(args: RenderConfigurationArguments): string {
    if (args.format === "json") {
      return JSON.stringify(
        args.limitsOnly
          ? { limits: args.limitRows }
          : { configurations: args.described },
        undefined,
        2,
      );
    }

    if (args.limitsOnly) {
      return [
        `${CONFIGURATION_HEADING}: Limits`,
        "",
        this.renderLimitsTable(args.limitRows),
      ].join("\n");
    }

    return [
      CONFIGURATION_HEADING,
      "",
      ...args.described.map((entry) => this.renderDirectory(entry)),
      "",
      `${CONFIGURATION_HEADING}: Limits`.replace("# 🔧", "## 🔧"),
      "",
      this.renderLimitsTable(args.limitRows),
    ].join("\n");
  }
}
