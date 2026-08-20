import { Injectable } from "@nestjs/common";

import {
  HEADING,
  SIGNIFICANT_GROWTH,
  TABLE_HEADER,
} from "./bundle-markdown.constants";
import {
  formatBytes,
  formatCount,
  formatDelta,
  formatPercent,
  formatUsage,
  groupByProject,
} from "./bundle-markdown.utilities";

import type {
  ComparableMetricRow,
  MetricRow,
  ProjectFailure,
} from "../bundles/bundles.types";
import type {
  ProjectGroup,
  RenderSectionArguments,
  SizeSummary,
} from "./bundle-markdown.types";

/** Renders measured bundles as the body of the `🎒 Bundles` report. */
@Injectable()
export class BundleMarkdownService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * True when this run rebuilt the bundle and the baseline knew it, which is
   * the only case where a change is like-for-like.
   *
   * Totals must be built from these rows alone. A renamed bundle shows up as
   * one removal and one addition, and counting the removal without its
   * replacement turns a rename into a phantom saving.
   */
  private isComparable(row: MetricRow): row is ComparableMetricRow {
    return row.measured && row.baseSize !== undefined;
  }

  /**
   * Finds the bundle that grew most, proportionally, for the callout line.
   * Ties break on absolute bytes, so uniform growth names the costliest one.
   */
  private readBiggestGrowth(rows: readonly MetricRow[]): MetricRow | undefined {
    const grown = rows
      .filter((row: MetricRow) => this.isComparable(row))
      .filter((row) => row.size > row.baseSize);

    return grown.toSorted(
      (first, second) =>
        (second.size - second.baseSize) / second.baseSize -
          (first.size - first.baseSize) / first.baseSize ||
        second.size - second.baseSize - (first.size - first.baseSize),
    )[0];
  }

  /**
   * Picks the icon for whatever the report found wrong, if anything.
   *
   * Severity is what separates the two glyphs, and it comes from the limit
   * itself rather than from anything decided here. An advisory breach is the
   * declared, configurable replacement for a renderer that used to invent its
   * own idea of "nearly full".
   */
  private readBreachStatus(rows: readonly MetricRow[]): string | undefined {
    if (rows.some((row) => row.empty)) return "❌";
    if (rows.some((row) => row.breach === "fail")) return "❌";
    if (rows.some((row) => row.breach !== undefined)) return "❗";
    return undefined;
  }

  /**
   * Describes the change against the baseline, and counts whatever appeared or
   * disappeared rather than folding it into the change.
   */
  private readComparison(
    rows: readonly MetricRow[],
    summary: SizeSummary,
    baselineUrl: string | undefined,
  ): string {
    const baseline =
      baselineUrl === undefined ? "`main`" : `[\`main\`](${baselineUrl})`;
    const added = rows.filter(
      (row) => row.measured && row.baseSize === undefined,
    ).length;
    const removed = rows.filter((row) => row.removed).length;
    const notes = [
      added === 0 ? undefined : `${added} new`,
      removed === 0 ? undefined : `${removed} removed`,
    ].filter((note) => note !== undefined);
    const suffix = notes.length === 0 ? "" : ` · ${notes.join(", ")}`;

    if (summary.delta !== undefined) {
      return (
        `— ${formatDelta(summary.delta)} ` +
        `(${formatPercent(summary.fraction)}) vs ${baseline}${suffix}`
      );
    }
    if (rows.some((row) => row.baseSize !== undefined)) {
      return `— nothing in common with ${baseline} to compare${suffix}`;
    }
    return `(no ${baseline} baseline available yet)${suffix}`;
  }

  /**
   * The byte change against the baseline, when both sizes are known. A removed
   * bundle counts as a saving of its whole baseline size.
   */
  private readDelta(row: MetricRow): number | undefined {
    if (row.baseSize === undefined) return undefined;
    if (!row.measured && !row.removed) return undefined;
    return row.size - row.baseSize;
  }

  /** The proportional change against the baseline, when it is meaningful. */
  private readFraction(row: MetricRow): number | undefined {
    const delta = this.readDelta(row);
    if (
      delta === undefined ||
      row.baseSize === undefined ||
      row.baseSize === 0
    ) {
      return undefined;
    }
    return delta / row.baseSize;
  }

  /** Picks the icon for a rebuilt bundle, from how far it moved. */
  private readGrowthStatus(row: MetricRow): string {
    const { baseSize } = row;
    if (baseSize === undefined) return "🆕";
    if (row.size <= baseSize) return "✅";
    return (row.size - baseSize) / baseSize > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
  }

  /** Picks the icon for the report as a whole. */
  private readOverallStatus(
    args: RenderSectionArguments,
    summary: SizeSummary,
  ): string {
    if (args.failures.length > 0) return "❌";
    const breach = this.readBreachStatus(args.rows);
    if (breach !== undefined) return breach;
    if (summary.delta === undefined || summary.delta <= 0) return "✅";
    return (summary.fraction ?? 0) > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
  }

  /**
   * Picks the status icon for one row of the measured table.
   *
   * Rows this run did not rebuild never reach here — they are listed in their
   * own collapsed table instead — so there is no unmeasured case to answer.
   */
  private readStatus(row: MetricRow): string {
    if (row.removed) return "🗑️";
    if (row.empty) return "⁉️";
    if (row.breach !== undefined) return row.breach === "warn" ? "❗" : "❌";
    return this.readGrowthStatus(row);
  }

  /**
   * Names everything the run could not do, above the table rather than below.
   *
   * A failed target produces no row at all, so without this the section is a
   * table that quietly holds fewer rows than the workspace has targets — and
   * nothing in it says so. The reader would have to compare row counts against
   * a list of projects to notice, which is not noticing.
   *
   * A failure is neither a breach nor staleness. It is the run not having
   * finished, so it is reported as its own thing and never folded into a size.
   */
  private renderFailures(failures: readonly ProjectFailure[]): string[] {
    if (failures.length === 0) return [];

    return [
      `> [!CAUTION]`,
      `> **${formatCount(failures.length, "target")} could not be measured**, ` +
        `so ${failures.length === 1 ? "it has" : "they have"} no row below.`,
      ">",
      "> | | Project | Subject | Why |",
      "> |--|---------|---------|-----|",
      ...failures.map(
        (failure) =>
          `> | 🚫 | \`${failure.project}\` | ${failure.subject} | ${failure.reason} |`,
      ),
      "",
    ];
  }

  /** Renders the legend that explains every icon the table can show. */
  private renderGuidelines(): string[] {
    return [
      "<details>",
      "<summary>📊 Guidelines</summary>",
      "",
      "- ✅ Size decreased or unchanged",
      "- ⚠️ Increased under 5%",
      "- 📈 Increased 5% or more",
      "- 🆕 No baseline for this bundle",
      "- 💤 Not rebuilt by this change, shown at its `main` size",
      "- 🗑️ Removed since the baseline",
      "- ❌ Breached a `fail` limit",
      "- ❗ Breached a `warn` limit, which advises rather than fails",
      "  — `Limit` and `Used` still report the `fail` ceiling above it",
      "- ⁉️ Its globs matched no files, so nothing was measured at all",
      "- 🚫 Could not be measured at all, so it has no row above",
      "",
      "Sizes are gzipped, and kilobytes are decimal. `Used` is the share of a",
      "limit a bundle consumes; how full is too full is declared as a `warn`",
      "limit rather than assumed here. Packages declare their limit as",
      "`sizeLimit` in their package.json, or in a `codometer.config.cjs` of",
      "their own; add a `codometer` target to include a project here.",
      "",
      "Both sides are measured on the Node version `.nvmrc` pins. The bundled",
      "zlib differs between Node releases, so a baseline captured on another",
      "runtime shifts every number in this table.",
      "</details>",
      "",
    ];
  }

  /** Renders the table of everything this run rebuilt. */
  private renderMeasuredTable(rows: readonly MetricRow[]): string[] {
    const measured = rows.filter((row) => row.measured || row.removed);
    if (measured.length === 0) {
      return ["This change rebuilt no measured project.", ""];
    }

    return [
      ...TABLE_HEADER,
      ...groupByProject(measured).flatMap((group) => [
        ...group.rows.map((row) => this.renderRow(row)),
        ...this.renderSubtotal(group),
      ]),
      "",
    ];
  }

  /** Renders one table row. */
  private renderRow(row: MetricRow): string {
    const cells = [
      this.readStatus(row),
      `\`${row.project}\``,
      row.removed ? `~~${row.label}~~` : row.label,
      row.removed ? "—" : formatBytes(row.size),
      row.baseSize === undefined ? "—" : formatBytes(row.baseSize),
      formatDelta(this.readDelta(row)),
      formatPercent(this.readFraction(row)),
      row.limit === undefined || row.removed ? "—" : formatBytes(row.limit),
      row.removed ? "—" : formatUsage(row),
    ];

    return `| ${cells.join(" | ")} |`;
  }

  /** Renders a project's rollup, which earns its line only with siblings. */
  private renderSubtotal(group: ProjectGroup): string[] {
    const live = group.rows.filter((row) => !row.removed);
    if (live.length < 2) return [];

    const total = live.reduce((sum, row) => sum + row.size, 0);
    const comparable = group.rows.filter((row: MetricRow) =>
      this.isComparable(row),
    );
    const baseTotal = comparable.reduce((sum, row) => sum + row.baseSize, 0);

    // Once a project has gained or lost a bundle there is no baseline its
    // total can honestly be compared against, so the change columns stay empty
    // rather than differencing two different sets of bundles.
    const whole = comparable.length === group.rows.length;
    const delta = whole ? total - baseTotal : undefined;
    const fraction =
      delta === undefined || baseTotal === 0 ? undefined : delta / baseTotal;

    return [
      `| ${[
        "",
        `\`${group.project}\``,
        `**${formatCount(live.length, "bundle")}**`,
        `**${formatBytes(total)}**`,
        whole ? formatBytes(baseTotal) : "—",
        formatDelta(delta),
        formatPercent(fraction),
        "",
        "",
      ].join(" | ")} |`,
    ];
  }

  /** Renders the headline, and the callout for whatever grew most. */
  private renderSummary(args: RenderSectionArguments): string[] {
    const { baselineUrl, rows } = args;
    const summary = this.summarizeRows(rows);
    const bundleCount = rows.filter((row) => !row.removed).length;
    const projectCount = new Set(rows.map((row) => row.project)).size;

    const lines = [
      `${this.readOverallStatus(args, summary)} ` +
        `**${formatBytes(summary.total)}** across ` +
        `${formatCount(bundleCount, "bundle")} in ` +
        `${formatCount(projectCount, "project")} ${this.readComparison(
          rows,
          summary,
          baselineUrl,
        )}`,
      "",
    ];

    const biggest = this.readBiggestGrowth(rows);
    if (biggest !== undefined) {
      lines.push(
        `**Biggest increase:** \`${biggest.project}\` ${biggest.label} ` +
          `${formatDelta(this.readDelta(biggest))} ` +
          `(${formatPercent(this.readFraction(biggest))})`,
        "",
      );
    }

    return lines;
  }

  /** Renders the collapsed list of projects `nx affected` skipped. */
  private renderUnmeasured(rows: readonly MetricRow[]): string[] {
    const skipped = rows.filter((row) => !row.measured && !row.removed);
    if (skipped.length === 0) return [];

    const total = skipped.reduce((sum, row) => sum + row.size, 0);

    return [
      "<details>",
      `<summary>💤 Unchanged by this pull request — ` +
        `${formatCount(skipped.length, "bundle")}, ` +
        `${formatBytes(total)}</summary>`,
      "",
      "CI measures only the projects `nx affected` rebuilt. These kept their",
      "`main` sizes, and are counted in the total above.",
      "",
      "| Project | Bundle | Size on `main` | Limit |",
      "|---------|--------|----------------|-------|",
      ...skipped.map((row) => {
        const limit = row.limit === undefined ? "—" : formatBytes(row.limit);
        return `| \`${row.project}\` | ${row.label} | ${formatBytes(row.size)} | ${limit} |`;
      }),
      "</details>",
      "",
    ];
  }

  /**
   * Totals every bundle, and changes only those the baseline and this run both
   * measured, so neither a newly added bundle nor a renamed one reads as a
   * workspace-wide swing.
   */
  private summarizeRows(rows: readonly MetricRow[]): SizeSummary {
    const total = rows.reduce((sum, row) => sum + row.size, 0);
    const comparable = rows.filter((row: MetricRow) => this.isComparable(row));

    if (comparable.length === 0) {
      return { delta: undefined, fraction: undefined, total };
    }

    const baseTotal = comparable.reduce((sum, row) => sum + row.baseSize, 0);
    const delta = comparable.reduce(
      (sum, row) => sum + row.size - row.baseSize,
      0,
    );

    return {
      delta,
      fraction: baseTotal === 0 ? undefined : delta / baseTotal,
      total,
    };
  }

  // 🌎 Public Methods

  /**
   * Renders the report body: its heading, and everything under it.
   *
   * A run that measured nothing still reports what it could not measure. "No
   * bundles were measured" and "every target failed" look identical from the
   * row count alone, and only one of them is fine.
   */
  renderSection(args: RenderSectionArguments): string {
    const body =
      args.rows.length === 0
        ? [
            ...this.renderFailures(args.failures),
            "No bundles were measured for this change.",
          ]
        : [
            ...this.renderSummary(args),
            ...this.renderFailures(args.failures),
            ...this.renderMeasuredTable(args.rows),
            ...this.renderUnmeasured(args.rows),
            ...this.renderGuidelines(),
            "*Updated automatically when you push new commits.*",
          ];

    return [HEADING, "", ...body].join("\n");
  }
}
