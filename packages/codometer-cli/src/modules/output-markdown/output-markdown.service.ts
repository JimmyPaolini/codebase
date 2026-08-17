import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { REGEX_SPECIAL_CHARACTERS } from "./output-markdown.constants";
import { MissingMarkdownPathError } from "./output-markdown.errors";
import {
  buildCssGroup,
  buildCustomGroup,
  buildHclGroup,
  buildJsonGroup,
  buildJupyterGroup,
  buildMarkdownGroup,
  buildPythonGroup,
  buildRepositoryGroup,
  buildShellGroup,
  buildSqlGroup,
  buildTomlGroup,
  buildTypescriptGroup,
  buildYamlGroup,
} from "./output-markdown.utilities";

import type {
  BuildAnchorHelpersArguments,
  RenderBadgesArguments,
  SyncAnchoredBlockArguments,
  SyncMarkdownArguments,
  WrapInAnchorsArguments,
} from "./output-markdown.types";
import type { MarkdownAnchorHelpers } from "@codometer/configuration";

/**
 * Writes generated code statistics badges into a markdown file.
 */
@Injectable()
export class OutputMarkdownService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Build the anchor helpers handed to a configured `write` function.
   *
   * Every helper is bound to this run's content, path, and mode, so a writer
   * that only wants the ordinary splice calls one method with no arguments.
   */
  private buildAnchorHelpers(
    args: BuildAnchorHelpersArguments,
  ): MarkdownAnchorHelpers {
    return {
      endMarker: args.destination.endMarker,
      startMarker: args.destination.startMarker,
      syncAnchoredBlock: (overrides = {}) =>
        this.syncAnchoredBlock({
          check: args.check,
          content: overrides.content ?? args.content,
          destination: args.destination,
          path: overrides.path ?? args.destination.path,
        }),
      wrapInAnchors: (content = args.content) =>
        this.wrapInAnchors({ content, destination: args.destination }),
    };
  }

  /**
   * Build the matcher for a block delimited by the configured markers.
   */
  private buildBlockRegex(args: {
    endMarker: string;
    startMarker: string;
  }): RegExp {
    return new RegExp(
      String.raw`${this.escapeRegex(args.startMarker)}[\s\S]*?${this.escapeRegex(args.endMarker)}`,
    );
  }

  /**
   * Escape a configured marker so it can be searched for literally.
   */
  private escapeRegex(input: string): string {
    return input.replaceAll(REGEX_SPECIAL_CHARACTERS, String.raw`\$&`);
  }

  /**
   * Read an existing markdown file, returning an empty string if absent.
   */
  private readExisting(markdownPath: string): string {
    try {
      return readFileSync(path.resolve(markdownPath), "utf8");
    } catch {
      return "";
    }
  }

  /**
   * Splice the anchored block into a file, or report whether it is current.
   *
   * Replaces the block when the markers are found, appends it when they are
   * absent, and creates the file when it does not exist. Check mode compares
   * and writes nothing.
   */
  private syncAnchoredBlock(args: SyncAnchoredBlockArguments): boolean {
    if (args.path === undefined) {
      throw new MissingMarkdownPathError();
    }

    const resolvedPath = path.resolve(args.path);
    const existingMarkdown = this.readExisting(resolvedPath);
    const generatedBlock = this.wrapInAnchors(args);
    const blockRegex = this.buildBlockRegex(args.destination);
    const currentBlock = blockRegex.exec(existingMarkdown)?.[0];

    if (args.check) {
      return currentBlock === generatedBlock;
    }

    if (!existingMarkdown.includes(args.destination.startMarker)) {
      writeFileSync(
        resolvedPath,
        `${existingMarkdown}\n\n${generatedBlock}\n`,
        "utf8",
      );
      return true;
    }

    // Replaced through a function so that a `$` in the rendered markdown stays
    // a `$` rather than being read as a replacement pattern.
    writeFileSync(
      resolvedPath,
      existingMarkdown.replace(blockRegex, () => generatedBlock),
      "utf8",
    );
    return true;
  }

  /**
   * Wrap rendered markdown in the configured anchor markers.
   */
  private wrapInAnchors(args: WrapInAnchorsArguments): string {
    // The blank line after the opening marker is what Prettier expects of a
    // paragraph following an HTML comment. Without it the generated markdown is
    // permanently one reformat away from clean, and `prettier --check` fails
    // on a file no human edited.
    return `${args.destination.startMarker}\n\n${args.content}\n${args.destination.endMarker}`;
  }

  // 🌎 Public Methods

  /**
   * Render the built-in badge report for the measured statistics.
   *
   * Every counter the measurement pipeline produces gets a badge, grouped
   * under a heading naming the language it was measured from. Only the
   * `Repository` group spans languages; the rest report one language each, so
   * a number that moves can be traced to the analyzer that produced it rather
   * than to a sum that silently mixes several.
   */
  renderBadges(args: RenderBadgesArguments): string {
    const { statistics } = args;
    const groups = [
      buildRepositoryGroup(statistics),
      buildTypescriptGroup(statistics),
      buildPythonGroup(statistics),
      buildJsonGroup(statistics),
      buildYamlGroup(statistics),
      buildTomlGroup(statistics),
      buildShellGroup(statistics),
      buildSqlGroup(statistics),
      buildHclGroup(statistics),
      buildCssGroup(statistics),
      buildCustomGroup(statistics),
      buildJupyterGroup(statistics),
      buildMarkdownGroup(statistics),
    ]
      .filter((group) => group !== "")
      .join("\n\n");
    const { description } = args.destination;

    return description === undefined ? groups : `${description}\n\n${groups}`;
  }

  /**
   * Sync a markdown destination with the current statistics.
   *
   * Rendering and writing are separate seams, each replaceable from the
   * configuration on its own: `render` decides what the markdown says, `write`
   * decides which file it lands in and how. The built-in pair renders badges
   * and splices them between the configured anchor markers.
   *
   * Returns `false` only in check mode, and only when the destination is
   * missing or stale.
   */
  sync(args: SyncMarkdownArguments): boolean {
    const { destination, statistics } = args;
    const renderBadges = (): string => this.renderBadges(args);
    const content =
      destination.render === undefined
        ? renderBadges()
        : destination.render({
            description: destination.description,
            renderBadges,
            statistics,
          });
    const anchors = this.buildAnchorHelpers({
      check: args.check,
      content,
      destination,
    });

    if (destination.write === undefined) {
      return anchors.syncAnchoredBlock();
    }

    // Anything but an explicit `false` counts as current: a writer that
    // returns nothing has written the file, not reported it stale.
    return destination.write({
      anchors,
      check: args.check,
      content,
      path: destination.path,
      statistics,
    });
  }
}
