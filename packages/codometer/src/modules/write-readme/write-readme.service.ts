import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  STATISTICS_BLOCK_END,
  STATISTICS_BLOCK_REGEX,
  STATISTICS_BLOCK_START,
} from "./write-readme.constants";

import type { CodeStatisticsResult } from "../codometer/codometer.types";

/**
 * Writes generated code statistics badges into a README file.
 */
@Injectable()
export class WriteReadmeService {
  // 🏗 Dependency Injection

  constructor() {}

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
   */
  buildBadgeBlock(statistics: CodeStatisticsResult): string {
    const badges = [
      this.buildBadge("Lines of Code", statistics.linesOfCode, "22c55e"),
      this.buildBadge("Repo Size", `${statistics.repoSizeMiB} MiB`, "6b7280"),
      this.buildBadge("Folders", statistics.folders, "4a4a4a"),
      this.buildBadge("Source Files", statistics.sourceFiles, "3178c6"),
      this.buildBadge("Test Files", statistics.testFiles, "10b981"),
      this.buildBadge(
        "External Packages",
        statistics.externalPackages,
        "8b5cf6",
      ),
      this.buildBadge("Classes", statistics.classes, "7c3aed"),
      this.buildBadge("Functions", statistics.functions, "16a34a"),
      this.buildBadge("Sync Functions", statistics.syncFunctions, "4ade80"),
      this.buildBadge("Async Functions", statistics.asyncFunctions, "059669"),
      this.buildBadge("Interfaces", statistics.interfaces, "0ea5e9"),
      this.buildBadge(
        "Generic Declarations",
        statistics.genericDeclarations,
        "0369a1",
      ),
      this.buildBadge("Enums", statistics.enums, "f97316"),
      this.buildBadge("Constants", statistics.constants, "dc2626"),
      this.buildBadge("Imports", statistics.imports, "0284c7"),
      this.buildBadge("Decorators", statistics.decorators, "db2777"),
      this.buildBadge("Exported Symbols", statistics.exported, "ea580c"),
      this.buildBadge("TODO Comments", statistics.todos, "ca8a04"),
    ].join("\n");

    return `${STATISTICS_BLOCK_START}\n${badges}\n${STATISTICS_BLOCK_END}`;
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
