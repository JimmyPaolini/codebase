import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import type {
  BuildReportArguments,
  SyncJsonArguments,
} from "./output-json.types";

/**
 * Writes the measured statistics to a JSON report file.
 *
 * The report holds the statistics and nothing else — no timestamp, no tool
 * version. Anything that changes between two runs over the same tree would
 * make check mode fail on a repository nobody touched.
 */
@Injectable()
export class OutputJsonService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Read an existing report, returning an empty string if absent.
   */
  private readExisting(reportPath: string): string {
    try {
      return readFileSync(path.resolve(reportPath), "utf8");
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /**
   * Render the JSON report for the measured statistics.
   *
   * Ends with a newline so the file matches what a formatter would leave
   * behind, and so check mode does not fail over the one byte every other tool
   * in the repository adds.
   */
  buildReport(args: BuildReportArguments): string {
    return `${JSON.stringify(args.statistics, null, args.destination.indentation)}\n`;
  }

  /**
   * Sync the configured JSON file with the current statistics.
   *
   * - **Write mode**: writes the report, creating parent directories as needed.
   * - **Check mode**: returns `true` when the file already holds the current
   *   report, `false` when it is missing or stale (does not write anything).
   */
  sync(args: SyncJsonArguments): boolean {
    const resolvedPath = path.resolve(args.destination.path);
    const generatedReport = this.buildReport(args);

    if (args.check) {
      return this.readExisting(args.destination.path) === generatedReport;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, generatedReport, "utf8");

    return true;
  }
}
