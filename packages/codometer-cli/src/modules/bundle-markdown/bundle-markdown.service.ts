import { Injectable } from "@nestjs/common";

import {
  HEADING,
  SECTION_END,
  SECTION_START,
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

import type { BundleRow, ComparableBundleRow } from "../bundles/bundles.types";
import type {
  ProjectGroup,
  RenderSectionArguments,
  SizeSummary,
} from "./bundle-markdown.types";

/**
 * Renders measured bundles as the `🎒 Bundles` section of a pull request
 * description, and splices that section into an existing description.
 */
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
  private isComparable(row: BundleRow): row is ComparableBundleRow {
    return row.measured && row.baseSize !== undefined;
  }

  /**
   * Finds the bundle that grew most, proportionally, for the callout line.
   * Ties break on absolute bytes, so uniform growth names the costliest one.
   */
  private readBiggestGrowth(rows: readonly BundleRow[]): BundleRow | undefined {
    return rows
      .filter((row) => (this.readDelta(row) ?? 0) > 0)
      .toSorted(
        (first, second) =>
          (this.readFraction(second) ?? 0) - (this.readFraction(first) ?? 0) ||
          (this.readDelta(second) ?? 0) - (this.readDelta(first) ?? 0),
      )[0];
  }

  /**
   * Describes the change against the baseline, and counts whatever appeared or
   * disappeared rather than folding it into the change.
   */
  private readComparison(
    rows: readonly BundleRow[],
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
  private readDelta(row: BundleRow): number | undefined {
    if (row.baseSize === undefined) return undefined;
    if (!row.measured && !row.removed) return undefined;
    return row.size - row.baseSize;
  }

  /** The proportional change against the baseline, when it is meaningful. */
  private readFraction(row: BundleRow): number | undefined {
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
  private readGrowthStatus(row: BundleRow): string {
    if (row.baseSize === undefined) return "🆕";
    if ((this.readDelta(row) ?? 0) <= 0) return "✅";
    return (this.readFraction(row) ?? 0) > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
  }

  /** Picks the icon for the report as a whole. */
  private readOverallStatus(
    rows: readonly BundleRow[],
    summary: SizeSummary,
  ): string {
    if (rows.some((row) => !row.passed || row.missing)) return "❌";
    if (summary.delta === undefined || summary.delta <= 0) return "✅";
    return (summary.fraction ?? 0) > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
  }

  /**
   * Picks the status icon for one row of the measured table.
   *
   * Rows this run did not rebuild never reach here — they are listed in their
   * own collapsed table instead — so there is no unmeasured case to answer.
   */
  private readStatus(row: BundleRow): string {
    if (row.removed) return "🗑️";
    if (row.missing) return "⁉️";
    if (!row.passed) return "❌";
    return this.readGrowthStatus(row);
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
      "- ❌ Exceeds its configured limit",
      "- ⁉️ Its `path` glob matched no files",
      "- ❗ Within 10% of its limit",
      "",
      "Sizes are gzipped. `Used` is the share of a bundle's limit it consumes.",
      "Packages declare their limit as `sizeLimit` in their package.json. Add a",
      "`.size-limit.cjs` and a `bundlesize` target to include a project here.",
      "</details>",
      "",
    ];
  }

  /** Renders the table of everything this run rebuilt. */
  private renderMeasuredTable(rows: readonly BundleRow[]): string[] {
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
  private renderRow(row: BundleRow): string {
    const cells = [
      this.readStatus(row),
      `\`${row.project}\``,
      row.removed ? `~~${row.name}~~` : row.name,
      row.removed ? "—" : formatBytes(row.size),
      row.baseSize === undefined ? "—" : formatBytes(row.baseSize),
      formatDelta(this.readDelta(row)),
      formatPercent(this.readFraction(row)),
      row.sizeLimit === undefined || row.removed
        ? "—"
        : formatBytes(row.sizeLimit),
      row.removed ? "—" : formatUsage(row),
    ];

    return `| ${cells.join(" | ")} |`;
  }

  /** Renders a project's rollup, which earns its line only with siblings. */
  private renderSubtotal(group: ProjectGroup): string[] {
    const live = group.rows.filter((row) => !row.removed);
    if (live.length < 2) return [];

    const total = live.reduce((sum, row) => sum + row.size, 0);
    const comparable = group.rows.filter((row: BundleRow) =>
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
      `${this.readOverallStatus(rows, summary)} ` +
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
        `**Biggest increase:** \`${biggest.project}\` ${biggest.name} ` +
          `${formatDelta(this.readDelta(biggest))} ` +
          `(${formatPercent(this.readFraction(biggest))})`,
        "",
      );
    }

    return lines;
  }

  /** Renders the collapsed list of projects `nx affected` skipped. */
  private renderUnmeasured(rows: readonly BundleRow[]): string[] {
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
        const limit =
          row.sizeLimit === undefined ? "—" : formatBytes(row.sizeLimit);
        return `| \`${row.project}\` | ${row.name} | ${formatBytes(row.size)} | ${limit} |`;
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
  private summarizeRows(rows: readonly BundleRow[]): SizeSummary {
    const total = rows.reduce((sum, row) => sum + row.size, 0);
    const comparable = rows.filter((row: BundleRow) => this.isComparable(row));

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

  /** Renders the whole `🎒 Bundles` section, markers included. */
  renderSection(args: RenderSectionArguments): string {
    const body =
      args.rows.length === 0
        ? ["No bundles were measured for this change."]
        : [
            ...this.renderSummary(args),
            ...this.renderMeasuredTable(args.rows),
            ...this.renderUnmeasured(args.rows),
            ...this.renderGuidelines(),
            "*Updated automatically when you push new commits.*",
          ];

    return [SECTION_START, HEADING, "", ...body, SECTION_END].join("\n");
  }

  /**
   * Replaces the marked section in a pull request description, or appends it
   * when the description has none, leaving the author's prose untouched.
   */
  spliceSection(description: string, section: string): string {
    const start = description.indexOf(SECTION_START);
    const before = (
      start === -1 ? description : description.slice(0, start)
    ).trimEnd();
    const end = description.indexOf(SECTION_END);
    const after =
      end === -1 ? "" : description.slice(end + SECTION_END.length).trimStart();

    return [before, section, after]
      .filter((part) => part.length > 0)
      .join("\n\n");
  }
}
