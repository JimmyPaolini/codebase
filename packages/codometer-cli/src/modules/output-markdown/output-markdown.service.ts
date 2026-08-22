import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  CODOMETER_SECTION_HEADING,
  REGEX_SPECIAL_CHARACTERS,
  TRAILING_NEWLINES,
} from "./output-markdown.constants";
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
  buildTargetsGroup,
  buildTomlGroup,
  buildTypescriptGroup,
  buildYamlGroup,
} from "./output-markdown.utilities";

import type {
  BuildAnchorHelpersArguments,
  RenderBadgesArguments,
  RenderDocumentArguments,
  SyncAnchoredBlockArguments,
  SyncDocumentArguments,
  SyncMarkdownArguments,
  WrapInAnchorsArguments,
} from "./output-markdown.types";
import type { MarkdownAnchorHelpers } from "@codometer/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Writes generated code statistics badges into a markdown file.
 */
@Injectable()
/* v8 ignore stop */
export class OutputMarkdownService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(OutputMarkdownService.name);
  }

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
   * Assemble the badge groups, in the order they are rendered.
   *
   * Every counter the measurement pipeline produces gets a badge, grouped
   * under a heading naming the language it was measured from. Only the first
   * group spans languages; the rest report one language each, so a number
   * that moves can be traced to the analyzer that produced it rather than to
   * a sum that silently mixes several. That first group is named for the
   * run's scope — `Repository` for the whole tree, `Project` for one project.
   *
   * `Measured Targets` is the one group not counting anything the language analyzers
   * produced: it reports the size of each declared target this run measured,
   * which is how a project's README carries the compressed size of what it
   * ships. It renders nothing when the run declared no target, so the
   * whole-repository report is byte for byte what it was.
   */
  private buildBadgeGroups(args: RenderDocumentArguments): string {
    const { statistics } = args;

    return [
      buildRepositoryGroup(statistics, args.scope),
      buildTargetsGroup(args.targets),
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
   * The markdown a destination produces, whoever produced it.
   *
   * A configured `render` replaces the built-in badges and is handed them
   * anyway, so a renderer that wants to add to the default report never has to
   * reimplement it.
   */
  private renderContent(args: RenderBadgesArguments): string {
    const { destination } = args;
    const renderBadges = (): string => this.renderBadges(args);

    return destination.render === undefined
      ? renderBadges()
      : destination.render({
          description: destination.description,
          renderBadges,
          statistics: args.statistics,
        });
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
      // Exactly one blank line between what was already there and the block,
      // whatever the file ended with. Appending to text that already ended in a
      // newline used to leave two, which `MD012/no-multiple-blanks` fails and
      // `markdownlint --fix` does not repair — so every README the block was
      // first written into failed lint for whoever ran it next.
      const preamble =
        existingMarkdown === ""
          ? ""
          : `${existingMarkdown.replace(TRAILING_NEWLINES, "")}\n\n`;

      this.writeMarkdownFile(resolvedPath, `${preamble}${generatedBlock}\n`);
      return true;
    }

    // Replaced through a function so that a `$` in the rendered markdown stays
    // a `$` rather than being read as a replacement pattern.
    this.writeMarkdownFile(
      resolvedPath,
      existingMarkdown.replace(blockRegex, () => generatedBlock),
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

  /** Write markdown to a file, and record that it happened. */
  private writeMarkdownFile(resolvedPath: string, content: string): void {
    writeFileSync(resolvedPath, content, "utf8");
    this.logger.info("📝 Wrote the markdown badges", undefined, {
      path: resolvedPath,
    });
  }

  // 🌎 Public Methods

  /**
   * Render the badge block for a destination, description and all.
   *
   * The block a splice destination places between its markers, and the body of
   * the document a whole-file destination writes. Both are the same markdown,
   * which is why the two sinks never disagree about a number.
   */
  renderBadges(args: RenderBadgesArguments): string {
    return this.renderDocument({
      description: args.destination.description,
      scope: args.scope,
      statistics: args.statistics,
      targets: args.targets,
    });
  }

  /**
   * Render the badge block wrapped in its destination's anchor markers.
   *
   * What a splice would place, without placing it — the form a run that writes
   * nothing shows on the console.
   */
  renderBlock(args: RenderBadgesArguments): string {
    return this.wrapInAnchors({
      content: this.renderContent(args),
      destination: args.destination,
    });
  }

  /**
   * Render the badges as a document of their own.
   *
   * No anchor markers: nothing else is in the file, so there is nothing to
   * anchor the block against.
   *
   * Every run, whatever its scope, heads its figures with the same section
   * heading, because the heading lives inside the markers now rather than
   * being written by hand above them — one owner instead of one per
   * document. The groups underneath still distinguish `Repository` from
   * `Project` by scope, so only the top-level heading unifies.
   */
  renderDocument(args: RenderDocumentArguments): string {
    const sections: string[] = [CODOMETER_SECTION_HEADING];

    if (args.description !== undefined) {
      sections.push(args.description);
    }

    sections.push(this.buildBadgeGroups(args));

    return sections.join("\n\n");
  }

  /**
   * Sync a splice destination with the current statistics.
   *
   * Rendering and writing are separate seams, each replaceable from the
   * configuration on its own: `render` decides what the markdown says, `write`
   * decides which file it lands in and how. The built-in pair renders badges
   * and splices them between the configured anchor markers.
   *
   * Returns `false` only when checking, and only when the destination is
   * missing or stale.
   */
  sync(args: SyncMarkdownArguments): boolean {
    const { destination } = args;
    const content = this.renderContent(args);
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
      statistics: args.statistics,
    });
  }

  /**
   * Sync a whole markdown document with the rendered badges.
   *
   * The file is the content and nothing else, so it is replaced outright
   * rather than spliced into.
   */
  syncDocument(args: SyncDocumentArguments): boolean {
    const resolvedPath = path.resolve(args.path);
    const document = `${args.content}\n`;

    if (args.check) {
      return this.readExisting(resolvedPath) === document;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    this.writeMarkdownFile(resolvedPath, document);

    return true;
  }
}
