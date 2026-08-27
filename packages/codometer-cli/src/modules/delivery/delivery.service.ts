import { JsonService, MarkdownService } from "@codometer/output";
import { Injectable } from "@nestjs/common";

import type { DocumentationMeasurement } from "../measure/documentation-measurement.types";
import type { MeasurementResult } from "../measure/measure.types";
import type { RunMode } from "../run-plan/run-plan.types";
import type { DeliverArguments } from "./delivery.types";
import type {
  RenderMarkdownArguments,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";
import type { TargetSize } from "@codometer/output";

/**
 * Produces every resolved output — JSON, a markdown document, a README
 * splice — and says which of them are stale.
 *
 * Split out of `MeasureCommand` so delivering a report is a concern of its
 * own, separate from measuring and from gating on what was measured. Every
 * destination is produced before anything is reported, so a run that writes
 * and gates writes all of its reports even when the gate then trips.
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
   * Append the breached documentation section to some rendered badges.
   *
   * Shared by `deliverMarkdown` and `deliverReadme`. It needs no destination
   * of its own — it always appends to whatever markdown output is already
   * configured.
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

  /** Produce the report, to its file or to the console. */
  private deliverJson(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.json;

    if (destination === undefined) {
      return;
    }

    const { indentation, path: destinationPath } = destination;

    if (destinationPath === undefined || !this.touchesFiles(args.mode)) {
      process.stdout.write(
        this.jsonService.render({ indentation, report: args.report }),
      );
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

  /** Produce the whole-document badges, to their file or to the console. */
  private deliverMarkdown(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.markdown;

    if (destination === undefined) {
      return;
    }

    const badges = this.markdownService.renderDocument({
      description: destination.description,
      scope: args.scope,
      statistics: args.measurement.statistics,
      targets: this.readTargetSizes(args.measurement),
    });
    const content = this.appendDocumentationSection(
      badges,
      args.measurement.documentation,
    );
    const destinationPath = destination.path;

    if (destinationPath === undefined || !this.touchesFiles(args.mode)) {
      process.stdout.write(`${content}\n`);
      return;
    }

    const isCurrent = this.markdownService.syncDocument({
      check: args.mode.checksReports,
      content,
      path: destinationPath,
    });

    if (!isCurrent && args.mode.checksReports) {
      stalePaths.push(destinationPath);
    }
  }

  /** Splice the badge block into its file, or show it on the console. */
  private deliverReadme(args: DeliverArguments, stalePaths: string[]): void {
    const destination = args.destinations.readme;

    if (destination === undefined) {
      return;
    }

    const { statistics } = args.measurement;
    const targets = this.readTargetSizes(args.measurement);

    if (!this.touchesFiles(args.mode)) {
      const badges = this.markdownService.renderBlock({
        destination,
        scope: args.scope,
        statistics,
        targets,
      });
      const content = this.appendDocumentationSection(
        badges,
        args.measurement.documentation,
      );

      process.stdout.write(`${content}\n`);
      return;
    }

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
   * A run that neither writes nor compares has nothing to do with a file, so
   * every destination it resolved is shown on the console instead — which is
   * also the only thing that can be done with a destination carrying no path.
   */
  private touchesFiles(mode: RunMode): boolean {
    return mode.writes || mode.checksReports;
  }

  // 🌎 Public Methods

  /** Produce every output, and name the ones found stale. */
  deliver(args: DeliverArguments): string[] {
    const stalePaths: string[] = [];

    this.deliverJson(args, stalePaths);
    this.deliverMarkdown(args, stalePaths);
    this.deliverReadme(args, stalePaths);

    return stalePaths;
  }
}
