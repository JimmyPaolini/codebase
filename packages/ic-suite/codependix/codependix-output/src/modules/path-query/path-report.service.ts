import { CODEPENDIX_GRAPH_TYPES } from "@codependix/configuration";
import { Injectable } from "@nestjs/common";

import {
  FORMAT_JSON,
  FORMAT_MARKDOWN,
  GRAPH_TYPE_MARKDOWN_SUBHEADINGS,
} from "../combined-output/combined-output.constants";
import { JSON_INDENTATION } from "../delivery/delivery.constants";

import {
  buildNoPathMessage,
  FORMAT_MERMAID,
  PATH_ARROW,
  PATH_FORMAT_NAMES,
  PATH_MERMAID_HEADER,
} from "./path-query.constants";

import type {
  CombinedPathResults,
  PathFormat,
  PathQueryResult,
  PathReportArguments,
} from "./path-query.types";

/**
 * Renders path query results in markdown, JSON, or mermaid format.
 */
@Injectable()
export class PathReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders every active graph type's path as Markdown text. */
  private renderMarkdown(results: CombinedPathResults): string {
    const sections: string[] = [];

    for (const graphType of CODEPENDIX_GRAPH_TYPES) {
      const entry = results[graphType];
      if (entry === undefined) continue;

      const heading = `### ${GRAPH_TYPE_MARKDOWN_SUBHEADINGS[graphType]}`;
      const body = this.renderMarkdownEntry(entry);

      sections.push(`${heading}\n\n${body}`);
    }

    return sections.join("\n\n");
  }

  /** Renders one graph type's path result as Markdown text. */
  private renderMarkdownEntry(entry: PathQueryResult): string {
    if (entry.path === null || entry.path.length === 0) {
      return buildNoPathMessage(entry.from, entry.to);
    }

    return entry.path.map((node) => `\`${node}\``).join(PATH_ARROW);
  }

  /** Renders every active graph type's path as a Mermaid diagram. */
  private renderMermaid(results: CombinedPathResults): string {
    const sections: string[] = [];

    for (const graphType of CODEPENDIX_GRAPH_TYPES) {
      const entry = results[graphType];
      if (entry === undefined) continue;

      sections.push(this.renderMermaidEntry(entry));
    }

    return sections.join("\n\n");
  }

  /** Renders one graph type's path result as a Mermaid diagram. */
  private renderMermaidEntry(entry: PathQueryResult): string {
    const pathNodes = entry.path;
    if (pathNodes === null || pathNodes.length === 0) {
      return buildNoPathMessage(entry.from, entry.to);
    }

    const lines = [
      "```mermaid",
      PATH_MERMAID_HEADER,
      ...pathNodes.map((node) => `  ${this.toNodeIdentifier(node)}["${node}"]`),
      ...pathNodes.slice(0, -1).map((node, index) => {
        const next = pathNodes[index + 1] ?? "";
        return `  ${this.toNodeIdentifier(node)} --> ${this.toNodeIdentifier(next)}`;
      }),
      "```",
    ];

    return lines.join("\n");
  }

  /** Turns a node name into a valid Mermaid node identifier. */
  private toNodeIdentifier(name: string): string {
    return name.replaceAll(/[^\dA-Za-z]/gu, "_");
  }

  // 🌎 Public Methods

  /** Renders combined path query results according to the selected format. */
  render(args: PathReportArguments): string {
    if (args.format === FORMAT_JSON) {
      return JSON.stringify(args.results, null, JSON_INDENTATION);
    }

    if (args.format === FORMAT_MERMAID) {
      return this.renderMermaid(args.results);
    }

    return this.renderMarkdown(args.results);
  }

  /**
   * Reads `--format` into what the run prints, falling back to
   * `FORMAT_MARKDOWN` when the flag was left off entirely.
   */
  resolveFormat(value: string | undefined): {
    errors: string[];
    format: PathFormat;
  } {
    if (value === undefined) {
      return { errors: [], format: FORMAT_MARKDOWN };
    }

    const matched = PATH_FORMAT_NAMES.find((name) => name === value);

    if (matched === undefined) {
      return {
        errors: [
          `--format does not accept "${value}". It takes one of ${PATH_FORMAT_NAMES.map((name) => `"${name}"`).join(" and ")}, as in "--format ${FORMAT_MARKDOWN}".`,
        ],
        format: FORMAT_MARKDOWN,
      };
    }

    return { errors: [], format: matched };
  }
}
