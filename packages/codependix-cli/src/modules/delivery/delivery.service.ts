import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { AnchorNotFoundError } from "../anchors/anchors.errors";
import { AnchorsService } from "../anchors/anchors.service";

import { JSON_INDENTATION } from "./delivery.constants";

import type {
  DeliverFileArguments,
  DeliverGraphOutputArguments,
  MarkdownSectionArguments,
  ProjectRunResult,
} from "./delivery.types";

/**
 * Delivers a resolved graph export to whichever destinations it names.
 *
 * Every codependix graph type — the Nx Neighborhood, the Nx Workspace Graph,
 * and the NestJS module graph — resolves to the same
 * `ResolvedCodependixGraphOutput` shape and is delivered the same way: a JSON
 * file, an anchored or standalone Markdown file, or both. This service is
 * the one place that shape is turned into file I/O, so `CodependixService`
 * only has to render each graph type's own JSON and diagram content and hand
 * it over.
 */
@Injectable()
export class DeliveryService {
  // 🏗 Dependency Injection

  constructor(private readonly anchorsService: AnchorsService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Splices content into a named anchor block, or checks it is current.
   *
   * A missing anchor is treated differently by mode: `--check` reports it as
   * stale rather than throwing, consistent with every other kind of drift
   * this tool reports, and `--write` auto-creates the section via
   * `AnchorsService.insertAnchorSection` when `markdownSection` was supplied,
   * or falls back to the historical hard failure when it was not. The file
   * itself not existing at all is always an error, regardless of mode — a
   * project with no README is a more serious problem than a missing anchor.
   */
  private deliverAnchoredMarkdown(
    args: DeliverFileArguments & {
      anchorName: string;
      markdownSection: MarkdownSectionArguments | undefined;
    },
  ): boolean {
    const resolvedPath = path.resolve(args.absoluteRoot, args.relativePath);

    if (!existsSync(resolvedPath)) {
      throw new AnchorNotFoundError(args.anchorName, resolvedPath);
    }

    const fileContent = readFileSync(resolvedPath, "utf8");
    const anchorExists = this.anchorsService.hasAnchor({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
    });

    if (args.mode === "check") {
      if (!anchorExists) {
        return false;
      }

      return this.anchorsService.checkAnchor({
        anchorName: args.anchorName,
        fileContent,
        filePath: resolvedPath,
        freshContent: args.content,
      }).isCurrent;
    }

    if (!anchorExists) {
      return this.writeAutoCreatedAnchorSection({
        anchorName: args.anchorName,
        content: args.content,
        fileContent,
        markdownSection: args.markdownSection,
        resolvedPath,
      });
    }

    const updated = this.anchorsService.replaceAnchorContent({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
      newContent: args.content,
    });

    if (updated !== fileContent) {
      writeFileSync(resolvedPath, updated, "utf8");
    }

    return true;
  }

  /** Writes or checks a whole file's rendered content. */
  private deliverFile(args: DeliverFileArguments): boolean {
    const resolvedPath = path.resolve(args.absoluteRoot, args.relativePath);

    if (args.mode === "check") {
      return this.readFileOrEmpty(resolvedPath) === args.content;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, args.content, "utf8");

    return true;
  }

  /** Delivers a JSON destination, recording it as stale if needed. */
  private deliverJson(args: {
    absoluteRoot: string;
    content: string;
    mode: DeliverFileArguments["mode"];
    path: string;
    stalePaths: string[];
  }): void {
    const isCurrent = this.deliverFile({
      absoluteRoot: args.absoluteRoot,
      content: args.content,
      mode: args.mode,
      relativePath: args.path,
    });

    if (!isCurrent) {
      args.stalePaths.push(args.path);
    }
  }

  /** Delivers a Markdown destination, recording it as stale if needed. */
  private deliverMarkdown(args: {
    absoluteRoot: string;
    anchor: string | undefined;
    content: string;
    markdownSection: MarkdownSectionArguments | undefined;
    mode: DeliverFileArguments["mode"];
    path: string;
    stalePaths: string[];
  }): void {
    const deliverArguments: DeliverFileArguments = {
      absoluteRoot: args.absoluteRoot,
      content: args.content,
      mode: args.mode,
      relativePath: args.path,
    };
    const isCurrent =
      args.anchor === undefined
        ? this.deliverFile({
            ...deliverArguments,
            content: `${args.content}\n`,
          })
        : this.deliverAnchoredMarkdown({
            ...deliverArguments,
            anchorName: args.anchor,
            markdownSection: args.markdownSection,
          });

    if (!isCurrent) {
      args.stalePaths.push(args.path);
    }
  }

  /** Reads a file's content, or an empty string when it does not exist yet. */
  private readFileOrEmpty(filePath: string): string {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  /**
   * Resolves the JSON destination a graph output should deliver to, or
   * `undefined` when the target does not touch JSON, no destination was
   * configured, or the caller rendered no JSON content for it.
   */
  private resolveJsonDelivery(
    args: DeliverGraphOutputArguments,
  ): undefined | { content: string; path: string } {
    const { jsonContent, resolvedOutput } = args;
    const touchesJson =
      resolvedOutput.target === "both" || resolvedOutput.target === "json";

    if (!touchesJson || resolvedOutput.json === undefined) return undefined;
    if (jsonContent === undefined) return undefined;

    return { content: jsonContent, path: resolvedOutput.json.path };
  }

  /**
   * Resolves the Markdown destination a graph output should deliver to, or
   * `undefined` when the target does not touch Markdown, no destination was
   * configured, or the caller rendered no diagram content for it.
   */
  private resolveMarkdownDelivery(args: DeliverGraphOutputArguments):
    | undefined
    | {
        anchor: string | undefined;
        content: string;
        path: string;
      } {
    const { markdownContent, resolvedOutput } = args;
    const touchesMarkdown =
      resolvedOutput.target === "both" || resolvedOutput.target === "markdown";

    if (!touchesMarkdown || resolvedOutput.markdown === undefined) {
      return undefined;
    }
    if (markdownContent === undefined) return undefined;

    return {
      anchor: resolvedOutput.markdown.anchor,
      content: markdownContent,
      path: resolvedOutput.markdown.path,
    };
  }

  /**
   * Auto-creates a missing anchor's `## 🕸️ Codependix` section and writes it.
   *
   * Falls back to the historical hard failure when the caller supplied no
   * `markdownSection` — there is nothing safe to build without a heading and
   * intro line, and `CodependixService` always supplies one for every real
   * anchored destination it delivers.
   */
  private writeAutoCreatedAnchorSection(args: {
    anchorName: string;
    content: string;
    fileContent: string;
    markdownSection: MarkdownSectionArguments | undefined;
    resolvedPath: string;
  }): boolean {
    if (args.markdownSection === undefined) {
      throw new AnchorNotFoundError(args.anchorName, args.resolvedPath);
    }

    const updated = this.anchorsService.insertAnchorSection({
      anchorName: args.anchorName,
      content: args.content,
      fileContent: args.fileContent,
      introLine: args.markdownSection.introLine,
      subheading: args.markdownSection.subheading,
    });

    writeFileSync(args.resolvedPath, updated, "utf8");

    return true;
  }

  // 🌎 Public Methods

  /**
   * Delivers whichever destinations a resolved graph output names.
   *
   * `jsonContent`/`markdownContent` are read only when the resolved target
   * actually touches that destination, mirroring how a project whose target
   * is `"json"` never renders a diagram nobody configured.
   */
  deliverGraphOutput(args: DeliverGraphOutputArguments): ProjectRunResult {
    const { markdownSection, mode, project } = args;
    const stalePaths: string[] = [];
    const jsonDelivery = this.resolveJsonDelivery(args);
    const markdownDelivery = this.resolveMarkdownDelivery(args);

    if (jsonDelivery !== undefined) {
      this.deliverJson({
        absoluteRoot: project.absoluteRoot,
        content: jsonDelivery.content,
        mode,
        path: jsonDelivery.path,
        stalePaths,
      });
    }

    if (markdownDelivery !== undefined) {
      this.deliverMarkdown({
        absoluteRoot: project.absoluteRoot,
        anchor: markdownDelivery.anchor,
        content: markdownDelivery.content,
        markdownSection,
        mode,
        path: markdownDelivery.path,
        stalePaths,
      });
    }

    return {
      isCurrent: stalePaths.length === 0,
      projectName: project.name,
      stalePaths,
    };
  }

  /** Renders an export as JSON the same way every run of codependix would. */
  renderJson(exportedGraph: unknown): string {
    return `${JSON.stringify(exportedGraph, null, JSON_INDENTATION)}\n`;
  }
}
