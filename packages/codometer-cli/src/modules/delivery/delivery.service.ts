import { DEFAULT_JSON_INDENTATION } from "@codometer/configuration";
import { JsonService, MarkdownService } from "@codometer/output";
import { Injectable } from "@nestjs/common";

import { DEFAULT_MARKDOWN_DESTINATION } from "./delivery.constants";

import type {
  DocumentationMeasurement,
  MeasurementResult,
} from "../measure/measure.types";
import type { RunMode } from "../run-plan/run-plan.types";
import type { DeliverArguments } from "./delivery.types";
import type {
  RenderMarkdownArguments,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";
import type { TargetSize } from "@codometer/output";

/**
 * Produces every resolved output — the report, the badge block, and whatever
 * the run prints — and says which of the written ones are stale.
 *
 * Split out of `MeasureCommand` so delivering a report is a concern of its
 * own, separate from measuring and from gating on what was measured. Every
 * destination is produced before anything is reported, so a run that writes
 * and gates writes all of its reports even when the gate then trips.
 *
 * Standard output has exactly one writer here, `deliverConsole`. A file sink
 * never prints: two sinks that could each decide to print is how one run put
 * two documents on the stream a pipeline was parsing.
 */
@Injectable()
export class DeliveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly jsonService: JsonService,
    private readonly markdownService: MarkdownService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Append the breached documentation section to already-rendered badges.
   *
   * The console's half of a pair: `augmentWithDocumentation` is the markdown
   * file's. They render the same section and cannot be one method, because
   * the console has its badges in hand and a markdown destination does not —
   * its badges are rendered later, inside `MarkdownService.sync`, so the
   * section has to be folded into the destination's `render` rather than
   * appended to a string. A change to the section has to land in both.
   */
  private appendDocumentationSection(
    badges: string,
    documentation: readonly DocumentationMeasurement[],
  ): string {
    const section = this.markdownService.renderDocumentationSection({
      breaches: documentation.filter((entry) => entry.breached),
    });

    return section === "" ? badges : [badges, section].join("\n\n");
  }

  /**
   * Wrap a markdown destination so its rendered badges gain the breached
   * documentation section, without reimplementing `MarkdownService.sync`'s
   * anchor and staleness logic here.
   *
   * Composes rather than replaces a configured `render`: a repository that
   * already renders its own markdown still gets the section appended after
   * its output, the same way `renderBadges` lets a custom `render` add to the
   * built-in badges rather than reimplement them.
   *
   * The markdown file's half of the pair `appendDocumentationSection` opens.
   */
  private augmentWithDocumentation(
    destination: ResolvedCodometerMarkdownOutputConfiguration,
    documentation: readonly DocumentationMeasurement[],
  ): ResolvedCodometerMarkdownOutputConfiguration {
    const section = this.markdownService.renderDocumentationSection({
      breaches: documentation.filter((entry) => entry.breached),
    });

    if (section === "") {
      return destination;
    }

    return {
      ...destination,
      render: (renderArguments: RenderMarkdownArguments): string => {
        const badges =
          destination.render === undefined
            ? renderArguments.renderBadges()
            : destination.render(renderArguments);

        return [badges, section].join("\n\n");
      },
    };
  }

  /** Print whatever the run asked for, and nothing when it asked for nothing. */
  private deliverConsole(args: DeliverArguments): void {
    if (args.format === undefined) {
      return;
    }

    if (args.format === "json") {
      process.stdout.write(
        this.jsonService.render({
          indentation:
            args.destinations.json?.indentation ?? DEFAULT_JSON_INDENTATION,
          report: args.report,
        }),
      );
      return;
    }

    const badges = this.markdownService.renderBlock({
      destination: args.destinations.markdown ?? DEFAULT_MARKDOWN_DESTINATION,
      scope: args.scope,
      statistics: args.measurement.statistics,
      targets: this.readTargetSizes(args.measurement),
    });

    process.stdout.write(
      `${this.appendDocumentationSection(badges, args.measurement.documentation)}\n`,
    );
  }

  /** Write the report to its file, if this run writes or compares one. */
  private deliverJson(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.json;

    if (destination === undefined || !this.touchesFiles(args.mode)) {
      return;
    }

    const { indentation, path: destinationPath } = destination;

    if (destinationPath === undefined) {
      return;
    }

    const isCurrent = this.jsonService.sync({
      check: args.mode.checksReports,
      indentation,
      path: destinationPath,
      report: args.report,
    });

    if (!isCurrent && args.mode.checksReports) {
      stalePaths.push(destinationPath);
    }
  }

  /**
   * Put the badge block into its markdown file, if this run writes or
   * compares one.
   *
   * The one markdown sink. `MarkdownService.sync` splices the block between
   * its markers when the file carries them, appends it with them when it does
   * not, and creates the file when it is not there — so a README somebody
   * else wrote and a file holding nothing but badges are the same case, and
   * neither needs a flag of its own.
   */
  private deliverMarkdown(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.markdown;

    if (destination === undefined || !this.touchesFiles(args.mode)) {
      return;
    }

    const { statistics } = args.measurement;
    const targets = this.readTargetSizes(args.measurement);

    const isCurrent = this.markdownService.sync({
      check: args.mode.checksReports,
      destination: this.augmentWithDocumentation(
        destination,
        args.measurement.documentation,
      ),
      scope: args.scope,
      statistics,
      targets,
    });

    if (!isCurrent && args.mode.checksReports) {
      // A configured writer may have picked the file itself, so name the
      // destination rather than claiming a path nobody configured.
      stalePaths.push(destination.path ?? "markdown output");
    }
  }

  /**
   * The size of every target this run measured, in declaration order.
   *
   * Left out rather than reported as zero bytes: a target that ran no size
   * analysis, and a target whose globs matched no file. Both would otherwise
   * publish `0.00 kB` — a figure that is not merely missing but wrong, and
   * wrong in a README a release commits. A target measured before its build
   * lands is the ordinary way to reach the second case, and it is caught by a
   * failing limit only for the targets that happen to declare one.
   *
   * A run that declared no target at all — the whole repository — produces an
   * empty list and no size badges.
   */
  private readTargetSizes(measurement: MeasurementResult): TargetSize[] {
    return measurement.targets.flatMap((target) =>
      target.size === undefined || target.size.files === 0
        ? []
        : [
            {
              bytes: target.size.bytes,
              compression: target.size.compression,
              name: target.name,
            },
          ],
    );
  }

  /**
   * Whether the run does anything with a file at all.
   *
   * A run that neither writes nor compares leaves every file alone. What it
   * shows instead is `--format`'s business, not a destination's.
   */
  private touchesFiles(mode: RunMode): boolean {
    return mode.writes || mode.checksReports;
  }

  // 🌎 Public Methods

  /** Produce every output, and name the ones found stale. */
  deliver(args: DeliverArguments): string[] {
    const stalePaths: string[] = [];

    this.deliverConsole(args);
    this.deliverJson(args, stalePaths);
    this.deliverMarkdown(args, stalePaths);

    return stalePaths;
  }
}
