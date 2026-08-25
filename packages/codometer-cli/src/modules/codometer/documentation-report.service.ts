import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import type {
  RenderDocumentationSectionArguments,
  ReportDocumentationBreachesArguments,
} from "./documentation-report.types";

/**
 * Reports breached documentation-length limits, and renders them as markdown.
 *
 * Split out of `CodometerCommand` so the gating and rendering logic for one
 * kind of finding — a JSDoc comment that ran over its kind's limit — has a
 * home of its own, mirroring `reportBreaches` and its limit-breach vocabulary.
 */
@Injectable()
export class DocumentationReportService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Render the breached documentation-length entries as a markdown section.
   *
   * Terse on purpose: the full per-declaration measurement already lives in
   * the JSON report, so only the breaches — the ones worth a reader's
   * attention — get a line here. Empty when nothing breached, so nothing is
   * appended to a clean run's markdown.
   */
  renderSection(args: RenderDocumentationSectionArguments): string {
    if (args.breaches.length === 0) {
      return "";
    }

    const bullets = args.breaches.map(
      (breach) =>
        `- \`${breach.file}:${breach.line}\` — \`${breach.declaration}\` (${breach.kind}): ${breach.measured}/${breach.limit} ${breach.unit}`,
    );

    return ["### 📝 Documentation", bullets.join("\n")].join("\n\n");
  }

  /**
   * Report every breached documentation length limit, and say whether one of
   * them fails the run. Mirrors `CodometerCommand`'s limit-breach reporting.
   */
  reportBreaches(args: ReportDocumentationBreachesArguments): boolean {
    const breached = args.documentation.filter((entry) => entry.breached);
    const failing = breached.filter((entry) => entry.severity === "fail");
    const warning = breached.filter((entry) => entry.severity === "warn");

    if (warning.length > 0) {
      this.logger.warn(`📊 Breached a documentation length limit`, undefined, {
        documentation: warning,
      });
    }

    if (failing.length > 0) {
      this.logger.error(`📊 Breached a documentation length limit`, undefined, {
        documentation: failing,
      });
    }

    return args.checksLimits && failing.length > 0;
  }
}
