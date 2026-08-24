import { Injectable } from "@nestjs/common";

import { HEADING, MAX_TOTAL_ROWS, TABLE_HEADER } from "./render.constants";
import { formatDelta, formatValue, hasChanged } from "./render.utilities";

import type { RenderSectionArguments } from "./render.types";
import type { MetricRow, ProjectFailure } from "@codometer/changes";

/** Renders codometer's measured changes as the body of the report. */
@Injectable()
export class RenderService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Caps how many changed rows the whole report renders, keeping every
   * breach and otherwise favoring the metrics that moved the most.
   *
   * Ranked globally rather than per project: a project with one breach and a
   * project with two hundred quiet new counters should not each get an equal
   * share of the budget, and a breach anywhere must survive the cut.
   */
  private capRows(rows: readonly MetricRow[]): {
    kept: Set<MetricRow>;
    omitted: number;
  } {
    const breaches = rows.filter((row) => row.breach !== undefined);
    const rest = rows
      .filter((row) => row.breach === undefined)
      .toSorted(
        (first, second) =>
          this.readMagnitude(second) - this.readMagnitude(first),
      );

    const budget = Math.max(0, MAX_TOTAL_ROWS - breaches.length);
    const kept = new Set([...breaches, ...rest.slice(0, budget)]);

    return { kept, omitted: rows.length - kept.size };
  }

  /** Groups items by whatever project name a case picks out of each one. */
  private groupByProject<Item>(
    items: readonly Item[],
    readProject: (item: Item) => string,
  ): Map<string, Item[]> {
    const groups = new Map<string, Item[]>();

    for (const item of items) {
      const project = readProject(item);
      const existing = groups.get(project);
      if (existing === undefined) groups.set(project, [item]);
      else existing.push(item);
    }

    return groups;
  }

  /**
   * Whether a project's block should open expanded.
   *
   * A breach or a measurement failure must never sit behind a click, so those
   * two are the only reasons a block starts open. Everything else — a metric
   * that merely changed — is exactly the kind of thing a collapsed block
   * exists to keep off the screen by default.
   */
  private readIsOpen(
    rows: readonly MetricRow[],
    failures: readonly ProjectFailure[],
  ): boolean {
    return failures.length > 0 || rows.some((row) => row.breach !== undefined);
  }

  /**
   * How far a row moved from its baseline, in absolute terms.
   *
   * A brand-new metric is measured against zero, so a large new count still
   * outranks a small one when both are competing for a place in a capped
   * report.
   */
  private readMagnitude(row: MetricRow): number {
    return Math.abs(row.value - (row.baseValue ?? 0));
  }

  /** Every project name either a row or a failure mentions, in sorted order. */
  private readProjects(args: RenderSectionArguments): string[] {
    const projects = new Set([
      ...args.rows.map((row) => row.project),
      ...args.failures.map((failure) => failure.project),
    ]);
    return [...projects].toSorted();
  }

  /**
   * Picks the icon for one row, in priority order: a row that disappeared or
   * matched nothing outranks a breach, and a breach outranks plain growth.
   */
  private readStatus(row: MetricRow): string {
    if (row.removed) return "🗑️";
    if (row.empty) return "⁉️";
    if (row.breach !== undefined) return row.breach === "warn" ? "❗" : "❌";
    if (row.baseValue === undefined) return "🆕";
    return row.value > row.baseValue ? "📈" : "📉";
  }

  /** Names the run the baseline came from, when there was one to compare against. */
  private renderComparison(baselineUrl: string | undefined): string[] {
    if (baselineUrl === undefined) return [];
    return [`_Compared against [\`main\`](${baselineUrl})._`, ""];
  }

  /**
   * Names everything the run could not do, above the table rather than below.
   *
   * A failed target produces no row at all, so without this a project's block
   * can be empty of rows and still have something to say. A failure is
   * neither a breach nor staleness — it is the run not having finished — so it
   * is reported as its own thing and never folded into a metric's value.
   */
  private renderFailures(failures: readonly ProjectFailure[]): string[] {
    if (failures.length === 0) return [];

    return [
      "> [!CAUTION]",
      `> **could not be measured:**`,
      ">",
      "> | Subject | Why |",
      "> |---------|-----|",
      ...failures.map(
        (failure) => `> | ${failure.subject} | ${failure.reason} |`,
      ),
      "",
    ];
  }

  /** Renders one project's block, or nothing if it has nothing to show. */
  private renderProject(args: {
    failures: readonly ProjectFailure[];
    kept: ReadonlySet<MetricRow>;
    project: string;
    rows: readonly MetricRow[];
  }): string[] {
    const { failures, kept, project, rows } = args;
    const changed = rows.filter((row) => hasChanged(row) && kept.has(row));
    if (changed.length === 0 && failures.length === 0) return [];

    const open = this.readIsOpen(changed, failures) ? " open" : "";
    const summary =
      changed.length === 0
        ? `\`${project}\``
        : `\`${project}\` — ${changed.length} changed`;

    return [
      `<details${open}>`,
      `<summary>${summary}</summary>`,
      "",
      ...this.renderFailures(failures),
      ...(changed.length === 0
        ? []
        : [...TABLE_HEADER, ...changed.map((row) => this.renderRow(row))]),
      "</details>",
      "",
    ];
  }

  /** Renders one table row. */
  private renderRow(row: MetricRow): string {
    const delta =
      row.baseValue === undefined ? undefined : row.value - row.baseValue;
    const cells = [
      this.readStatus(row),
      row.removed ? `~~${row.label}~~` : row.label,
      row.removed ? "—" : formatValue(row.value, row.unit),
      row.baseValue === undefined ? "—" : formatValue(row.baseValue, row.unit),
      formatDelta(delta, row.unit),
    ];

    return `| ${cells.join(" | ")} |`;
  }

  // 🌎 Public Methods

  /**
   * Renders the report body: its heading, and one block per project with
   * something to show.
   */
  renderSection(args: RenderSectionArguments): string {
    const rowsByProject = this.groupByProject(args.rows, (row) => row.project);
    const failuresByProject = this.groupByProject(
      args.failures,
      (failure) => failure.project,
    );
    const { kept, omitted } = this.capRows(args.rows.filter(hasChanged));

    const blocks = this.readProjects(args).flatMap((project) =>
      this.renderProject({
        failures: failuresByProject.get(project) ?? [],
        kept,
        project,
        rows: rowsByProject.get(project) ?? [],
      }),
    );

    const comparison = this.renderComparison(args.baselineUrl);
    const omission =
      omitted === 0
        ? []
        : [
            `_${omitted} more changed ${omitted === 1 ? "metric" : "metrics"} omitted — showing the most significant ${MAX_TOTAL_ROWS}._`,
            "",
          ];
    const body =
      blocks.length === 0
        ? [
            ...comparison,
            "No codometer changes to report for this pull request.",
          ]
        : [
            ...comparison,
            ...blocks,
            ...omission,
            "*Updated automatically when you push new commits.*",
          ];

    return [HEADING, "", ...body].join("\n");
  }
}
