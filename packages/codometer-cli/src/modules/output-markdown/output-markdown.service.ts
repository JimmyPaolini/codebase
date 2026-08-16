import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { REGEX_SPECIAL_CHARACTERS } from "./output-markdown.constants";
import { MissingMarkdownPathError } from "./output-markdown.errors";

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
   * Build a single shields.io badge markdown image.
   */
  private buildBadge(
    label: string,
    value: number | string,
    color: string,
  ): string {
    return `![${label}](https://img.shields.io/badge/${this.encodeValue(label)}-${this.encodeValue(value)}-${color}?style=flat-square)`;
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
   * Build one labelled group of badges.
   *
   * The label is what makes an unqualified counter readable: `Classes` under
   * the TypeScript group and `Python Classes` under the Python one are two
   * different measurements, and only the grouping says which is which.
   */
  private buildGroup(label: string, badges: string[]): string {
    // A real heading rather than a bold line: the block sits under an `##`
    // section, so `###` is the level that continues the document's outline
    // instead of imitating one, which is what markdownlint's MD036 rejects.
    return `### ${label}\n\n${badges.join("\n")}`;
  }

  /**
   * Encode a value so it can safely appear in a badge URL.
   */
  private encodeValue(input: number | string): string {
    return String(input)
      .replaceAll("-", "--")
      .replaceAll("_", "__")
      .replaceAll(" ", "_");
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
    const {
      javascript: js,
      json,
      jupyter: nb,
      markdown: md,
      python: py,
      typescript: ts,
    } = statistics;
    const groups = [
      this.buildGroup("Repository", [
        this.buildBadge("Lines of Code", statistics.linesOfCode, "22c55e"),
        this.buildBadge("Repo Size", `${statistics.repoSizeMiB} MiB`, "6b7280"),
        this.buildBadge("Folders", statistics.folders, "4a4a4a"),
        this.buildBadge("Source Files", statistics.sourceFiles, "3178c6"),
      ]),
      this.buildGroup("TypeScript & JavaScript", [
        this.buildBadge("TypeScript Files", ts.files, "3178c6"),
        this.buildBadge("JavaScript Files", js.files, "f7df1e"),
        this.buildBadge("Test Files", js.testFiles, "10b981"),
        this.buildBadge("External Packages", js.externalPackages, "8b5cf6"),
        this.buildBadge("Classes", js.classes, "7c3aed"),
        this.buildBadge("Functions", js.functions, "16a34a"),
        this.buildBadge("Methods", js.methods, "15803d"),
        this.buildBadge("Sync Functions", js.syncFunctions, "4ade80"),
        this.buildBadge("Async Functions", js.asyncFunctions, "059669"),
        this.buildBadge("Interfaces", ts.interfaces, "0ea5e9"),
        this.buildBadge(
          "Generic Declarations",
          ts.genericDeclarations,
          "0369a1",
        ),
        this.buildBadge("Enums", ts.enums, "f97316"),
        this.buildBadge("Constants", js.constants, "dc2626"),
        this.buildBadge("Imports", js.imports, "0284c7"),
        this.buildBadge("Decorators", ts.decorators, "db2777"),
        this.buildBadge("Exported Symbols", js.exported, "ea580c"),
        this.buildBadge("Doc Comments", ts.docComments, "6366f1"),
        this.buildBadge("Comments", js.comments, "64748b"),
        this.buildBadge("Comment Lines", js.commentLines, "475569"),
        this.buildBadge("TODO Comments", js.todos, "ca8a04"),
      ]),
      this.buildGroup("Python", [
        this.buildBadge("Python Files", py.files, "3776ab"),
        this.buildBadge("Python Lines", py.lines, "4b8bbe"),
        this.buildBadge("Python Classes", py.classes, "7c3aed"),
        this.buildBadge("Python Functions", py.functions, "16a34a"),
        this.buildBadge("Python Protocols", py.protocols, "0ea5e9"),
        this.buildBadge("Python Constants", py.constants, "dc2626"),
        this.buildBadge("Python Imports", py.imports, "0284c7"),
        this.buildBadge("Python Decorators", py.decorators, "db2777"),
        this.buildBadge("Docstrings", py.docstrings, "6366f1"),
        this.buildBadge("Docstring Lines", py.docstringLines, "818cf8"),
        this.buildBadge("Python Comments", py.comments, "64748b"),
        this.buildBadge("Python Comment Lines", py.commentLines, "475569"),
      ]),
      this.buildGroup("JSON", [
        this.buildBadge("JSON Files", json.files, "a16207"),
        this.buildBadge("JSON Lines", json.lines, "ca8a04"),
        this.buildBadge("JSON Objects", json.objects, "7c3aed"),
        this.buildBadge("JSON Arrays", json.arrays, "8b5cf6"),
        this.buildBadge("JSON Properties", json.properties, "0284c7"),
        this.buildBadge("JSON Strings", json.strings, "16a34a"),
        this.buildBadge("JSON Numbers", json.numbers, "059669"),
        this.buildBadge("JSON Booleans", json.booleans, "0ea5e9"),
        this.buildBadge("JSON Nulls", json.nulls, "64748b"),
        this.buildBadge("JSON Items", json.items, "475569"),
        this.buildBadge("JSON Nodes", json.totalNodes, "dc2626"),
        this.buildBadge("JSON Max Depth", json.maxDepth, "ea580c"),
      ]),
      this.buildGroup("Jupyter", [
        this.buildBadge("Notebooks", nb.files, "f37626"),
        this.buildBadge("Notebook Cells", nb.cells, "e8a33d"),
        this.buildBadge("Code Cells", nb.codeCells, "3776ab"),
        this.buildBadge("Markdown Cells", nb.markdownCells, "083fa1"),
        this.buildBadge("Raw Cells", nb.rawCells, "9ca3af"),
        this.buildBadge("Executed Cells", nb.executedCells, "16a34a"),
        this.buildBadge("Cell Outputs", nb.outputs, "059669"),
        this.buildBadge("Notebook Code Lines", nb.codeLines, "4b8bbe"),
        this.buildBadge("Notebook Classes", nb.classes, "7c3aed"),
        this.buildBadge("Notebook Functions", nb.functions, "22c55e"),
        this.buildBadge("Notebook Imports", nb.imports, "0284c7"),
        this.buildBadge("Notebook Decorators", nb.decorators, "db2777"),
        this.buildBadge("Notebook Prose Lines", nb.markdownLines, "1f6feb"),
        this.buildBadge("Notebook Headings", nb.headings, "a78bfa"),
        this.buildBadge("Notebook Links", nb.links, "10b981"),
        this.buildBadge("Notebook Images", nb.images, "34d399"),
        this.buildBadge("Notebook Code Blocks", nb.codeBlocks, "dc2626"),
        this.buildBadge("Notebook Properties", nb.properties, "ca8a04"),
        this.buildBadge("Notebook Nodes", nb.totalNodes, "a16207"),
        this.buildBadge("Notebook Max Depth", nb.maxDepth, "ea580c"),
      ]),
      this.buildGroup("Markdown", [
        this.buildBadge("Markdown Files", md.files, "083fa1"),
        this.buildBadge("Markdown Lines", md.lines, "1f6feb"),
        this.buildBadge("H1", md.headingLevel1, "7c3aed"),
        this.buildBadge("H2", md.headingLevel2, "8b5cf6"),
        this.buildBadge("H3", md.headingLevel3, "a78bfa"),
        this.buildBadge("H4", md.headingLevel4, "c4b5fd"),
        this.buildBadge("H5", md.headingLevel5, "ddd6fe"),
        this.buildBadge("H6", md.headingLevel6, "ede9fe"),
        this.buildBadge("Paragraphs", md.paragraphs, "64748b"),
        this.buildBadge("Lists", md.lists, "16a34a"),
        this.buildBadge("List Items", md.listItems, "22c55e"),
        this.buildBadge("Task List Items", md.taskListItems, "4ade80"),
        this.buildBadge("Tables", md.tables, "0284c7"),
        this.buildBadge("Table Rows", md.tableRows, "0ea5e9"),
        this.buildBadge("Links", md.links, "059669"),
        this.buildBadge("Images", md.images, "10b981"),
        this.buildBadge("Code Blocks", md.codeBlocks, "dc2626"),
        this.buildBadge("Inline Code", md.inlineCode, "ef4444"),
        this.buildBadge("Block Quotes", md.blockQuotes, "ca8a04"),
        this.buildBadge("Thematic Breaks", md.thematicBreaks, "a16207"),
      ]),
    ].join("\n\n");
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
