import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  STATISTICS_BLOCK_END,
  STATISTICS_BLOCK_REGEX,
  STATISTICS_BLOCK_START,
} from "./writing.constants";

import type { CodeStatisticsResult } from "../codometer/codometer.types";

/**
 * Writes generated code statistics badges into a README file.
 */
@Injectable()
export class WritingService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

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
   * Build one labelled group of badges.
   *
   * The label is what makes an unqualified counter readable: `Classes` under
   * the TypeScript group and `Python Classes` under the Python one are two
   * different measurements, and only the grouping says which is which.
   */
  private buildGroup(label: string, badges: string[]): string {
    // The label shares a paragraph with its badges rather than standing alone.
    // A lone emphasized line is a heading wearing a disguise, which is what
    // markdownlint's MD036 rejects; kept inline it is simply the row's lead-in.
    return `**${label}**\n${badges.join("\n")}`;
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
   * Read an existing README file, returning an empty string if absent.
   */
  private readExisting(readmePath: string): string {
    try {
      return readFileSync(path.resolve(readmePath), "utf8");
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /**
   * Build the full badge block that represents the repository statistics.
   *
   * Every counter the measurement pipeline produces gets a badge, grouped by
   * the language it was measured from. Only the `Repository` group spans
   * languages; the rest report one language each, so a number that moves can
   * be traced to the analyzer that produced it rather than to a sum that
   * silently mixes several.
   */
  buildBadgeBlock(statistics: CodeStatisticsResult): string {
    const {
      javascript: js,
      json,
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

    // The blank line after the opening marker is what Prettier expects of a
    // paragraph following an HTML comment. Without it the generated README is
    // permanently one reformat away from clean, and `prettier --check` fails
    // on a file no human edited.
    return `${STATISTICS_BLOCK_START}\n\n${groups}\n${STATISTICS_BLOCK_END}`;
  }

  /**
   * Sync the README badge block with the current statistics.
   *
   * - **Write mode** (default): replaces the block when the anchor markers are
   *   found, or appends the block to the bottom of the file when they are
   *   absent. Creates the file if it does not yet exist.
   * - **Check mode**: returns `true` when the block is already up to date,
   *   `false` when it is missing or stale (does not write any changes).
   */
  syncReadme(
    readmePath: string,
    statistics: CodeStatisticsResult,
    check = false,
  ): boolean {
    const resolvedReadmePath = path.resolve(readmePath);
    const existingReadme = this.readExisting(readmePath);
    const generatedBlock = this.buildBadgeBlock(statistics);
    const currentBlock = STATISTICS_BLOCK_REGEX.exec(existingReadme)?.[0];
    const isCurrent = currentBlock === generatedBlock;

    if (check) {
      return isCurrent;
    }

    if (!existingReadme.includes(STATISTICS_BLOCK_START)) {
      writeFileSync(
        resolvedReadmePath,
        `${existingReadme}\n\n${generatedBlock}\n`,
        "utf8",
      );
      return true;
    }

    writeFileSync(
      resolvedReadmePath,
      existingReadme.replace(STATISTICS_BLOCK_REGEX, generatedBlock),
      "utf8",
    );
    return true;
  }
}
