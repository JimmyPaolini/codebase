import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { CustomStatisticsInput } from "./custom-statistics.types";
import type { CustomStatisticResult } from "@codometer/configuration";

/**
 * Counts the files a repository names by convention.
 *
 * The languages a repository is written in are the same everywhere; what a
 * `*.service.ts` or a `*.unit.test.ts` means is not, which is why these
 * counters come from the configuration rather than from this package.
 */
@Injectable()
export class CustomStatisticsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Counts the tracked files at least one of the globs claims.
   *
   * A file matching several globs of the same counter is one file, not
   * several: the counter asks how many files there are, not how many times
   * they matched.
   */
  private countMatches(trackedFiles: string[], patterns: string[]): number {
    return trackedFiles.filter((filePath) =>
      patterns.some((pattern) => path.matchesGlob(filePath, pattern)),
    ).length;
  }

  // 🌎 Public Methods

  /** Count every configured statistic over the discovered files. */
  analyze({
    statistics,
    trackedFiles,
  }: CustomStatisticsInput): CustomStatisticResult[] {
    return statistics.map((statistic) => ({
      color: statistic.color,
      files: this.countMatches(trackedFiles, statistic.patterns),
      label: statistic.label,
    }));
  }
}
