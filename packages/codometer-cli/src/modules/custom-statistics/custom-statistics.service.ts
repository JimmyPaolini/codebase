import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { CustomStatisticsInput } from "./custom-statistics.types";
import type { CustomStatisticResult } from "@codometer/configuration";
import type { TypescriptSymbolCounter } from "@codometer/languages";

/**
 * Counts the conventions a repository holds itself to.
 *
 * The languages a repository is written in are the same everywhere; what a
 * `*.service.ts` means, or whether a static method is something to keep an
 * eye on, is not — which is why these counters come from the configuration
 * rather than from this package.
 *
 * A counter measures files by path or declarations by shape. The file half is
 * done here; the declaration half is tallied by the TypeScript analyzer during
 * the walk it already makes, and arrives here as counts to be labelled.
 */
@Injectable()
export class CustomStatisticsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Counts the target's files that at least one of the globs claims.
   *
   * A file matching several globs of the same counter is one file, not
   * several: the counter asks how many files there are, not how many times
   * they matched.
   */
  private countMatches(files: string[], patterns: string[]): number {
    return files.filter((filePath) =>
      patterns.some((pattern) => path.matchesGlob(filePath, pattern)),
    ).length;
  }

  // 🌎 Public Methods

  /** Count every configured statistic over the discovered files. */
  analyze({
    files,
    statistics,
    symbolCounts,
  }: CustomStatisticsInput): CustomStatisticResult[] {
    return statistics.map((statistic) => ({
      color: statistic.color,
      count:
        statistic.symbols === undefined
          ? this.countMatches(files, statistic.patterns)
          : (symbolCounts[statistic.label] ?? 0),
      group: statistic.group,
      label: statistic.label,
    }));
  }

  /**
   * Pick out the counters the TypeScript analyzer has to tally.
   *
   * Handed to that analyzer rather than parsed again here: it already walks
   * every source file, and a second walk would double the slowest part of a
   * run to learn what the first one passed straight over.
   */
  buildSymbolCounters(
    statistics: CustomStatisticsInput["statistics"],
  ): TypescriptSymbolCounter[] {
    return statistics.flatMap((statistic) =>
      statistic.symbols === undefined
        ? []
        : [
            {
              kinds: statistic.symbols.kinds,
              label: statistic.label,
              modifiers: statistic.symbols.modifiers ?? [],
              patterns: statistic.patterns,
            },
          ],
    );
  }
}
