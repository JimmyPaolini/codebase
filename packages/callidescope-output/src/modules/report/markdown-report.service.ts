import { Injectable } from "@nestjs/common";

import { MermaidReportService } from "./mermaid-report.service";
import {
  MARKDOWN_MISPLACED_HEADER,
  MARKDOWN_SPREAD_HEADER,
  MARKDOWN_SUMMARY_HEADER,
  MARKDOWN_WIDE_CALLABLES_HEADER,
  RUN_HEADING,
} from "./report.constants";
import { ReportService } from "./report.service";

import type {
  RenderProjectSectionArguments,
  RenderRunArguments,
  RenderStacksArguments,
  StackRendering,
} from "./report.types";
import type {
  CallableBreadthReport,
  CallGraphSummary,
  CallStack,
  MisplacedCallableFinding,
  ModuleSpreadFinding,
} from "@callidescope/configuration";

/**
 * Renders a run, or one project's slice of it, as markdown.
 *
 * Markdown rather than a bespoke text format because the same rendering has to
 * serve three places — a terminal, a report file, and a section spliced into a
 * project's own README — and only one of those can read anything else.
 */
@Injectable()
export class MarkdownReportService {
  // 🏗 Dependency Injection

  constructor(
    private readonly mermaidReportService: MermaidReportService,
    private readonly reportService: ReportService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Renders each callable's breadth, the first few openly and the rest
   * behind a disclosure — the same treatment `renderStacks` gives stacks.
   *
   * Shared by both scopes: a project section passes every callable with a
   * direct callee, unfiltered by any limit, the same way its stacks are;
   * a whole-run section passes only the `WideCallableFinding`s that broke
   * the configured limit. `WideCallableFinding` is a `CallableBreadthReport`
   * with a `limit` added, so one renderer covers both without caring which
   * it was handed. Unfiltered, a project's breadth table is one row per
   * non-leaf callable — every bit as unbounded as its stacks — so it earns
   * the same truncation rather than a bare table.
   */
  private renderCallableBreadths(args: {
    previewCount: number;
    reports: readonly CallableBreadthReport[];
  }): string {
    const toRow = (report: CallableBreadthReport): string =>
      `| \`${report.displayName}\` | ${String(report.breadth)} | ${report.callees.map((callee) => `\`${callee.displayName}\``).join(", ")} | \`${report.location.filePath}:${String(report.location.line)}\` |`;
    const preview = args.reports.slice(0, args.previewCount);
    const remaining = args.reports.slice(args.previewCount);
    const previewTable = this.renderTable({
      header: MARKDOWN_WIDE_CALLABLES_HEADER,
      rows: preview.map((report) => toRow(report)),
    });

    if (remaining.length === 0) {
      return previewTable;
    }

    return [
      previewTable,
      "",
      "<details>",
      `<summary>${String(remaining.length)} more callables</summary>`,
      "",
      this.renderTable({
        header: MARKDOWN_WIDE_CALLABLES_HEADER,
        rows: remaining.map((report) => toRow(report)),
      }),
      "",
      "</details>",
    ].join("\n");
  }

  /** Renders the misplaced-callable findings belonging to one scope. */
  private renderMisplaced(
    findings: readonly MisplacedCallableFinding[],
  ): string {
    return this.renderTable({
      header: MARKDOWN_MISPLACED_HEADER,
      rows: findings.map(
        (finding) =>
          `| \`${finding.displayName}\` | \`${finding.homeModuleId}\` | \`${finding.suggestedModuleId}\` | ${String(finding.foreignCallerCount)}/${String(finding.callerCount)} |`,
      ),
    });
  }

  /** Renders the module-spread findings belonging to one scope. */
  private renderSpreads(findings: readonly ModuleSpreadFinding[]): string {
    return this.renderTable({
      header: MARKDOWN_SPREAD_HEADER,
      rows: findings.map(
        (finding) =>
          `| \`${finding.displayName}\` | ${String(finding.transitiveSpread)} | ${finding.directModuleIds.map((moduleId) => `\`${moduleId}\``).join(", ")} | \`${finding.location.filePath}:${String(finding.location.line)}\` |`,
      ),
    });
  }

  /** Renders one stack: a labelled heading line and its tree in a fence. */
  private renderStack(args: { index: number; stack: CallStack }): string {
    const { stack } = args;
    const entry = stack.frames[0]?.displayName ?? "unknown";
    const depth = stack.isLowerBound
      ? `≥ ${String(stack.depth)}`
      : String(stack.depth);

    return [
      `**${String(args.index + 1)}. \`${entry}\`** — depth ${depth} · ${stack.entryPointKind}`,
      "",
      "```text",
      this.reportService.renderStackTree(stack),
      "```",
    ].join("\n");
  }

  /** Renders the stacks of one scope, drawn or printed as asked. */
  private renderStacksAs(args: {
    previewCount: number;
    rendering: StackRendering;
    stacks: readonly CallStack[];
  }): string {
    return args.rendering === "diagram"
      ? this.mermaidReportService.renderStacks({ stacks: args.stacks })
      : this.renderStacks({
          previewCount: args.previewCount,
          stacks: args.stacks,
        });
  }

  /** Renders the counts describing what a run, or a project, produced. */
  private renderSummaryTable(summary: CallGraphSummary): string {
    return [
      MARKDOWN_SUMMARY_HEADER,
      `| Callables | ${String(summary.callableCount)} |`,
      `| Files | ${String(summary.fileCount)} |`,
      `| Calls traced | ${String(summary.edgeCount)} |`,
      `| Call stacks | ${String(summary.entryPointCount)} |`,
      `| Deepest stack | ${String(summary.maximumDepth)} |`,
      `| Stacks through recursion | ${String(summary.cyclicComponentCount)} |`,
      `| Unfollowable calls | ${String(summary.unresolvedCallCount)} |`,
    ].join("\n");
  }

  /** Renders a table, or says plainly that there was nothing to put in one. */
  private renderTable(args: {
    header: string;
    rows: readonly string[];
  }): string {
    return args.rows.length === 0
      ? "None."
      : `${args.header}\n${args.rows.join("\n")}`;
  }

  // 🌎 Public Methods

  /** Renders one project's section, for splicing into its own README. */
  public renderProjectSection(args: RenderProjectSectionArguments): string {
    const { report } = args;

    return [
      args.heading,
      "",
      `Call stacks traced through \`${report.projectName}\`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.`,
      "",
      this.renderSummaryTable(report.summary),
      "",
      "### Call stacks (depth)",
      "",
      this.renderStacksAs({
        previewCount: args.previewCount,
        rendering: args.rendering,
        stacks: report.stacks,
      }),
      "",
      "### Module spread",
      "",
      this.renderSpreads(report.moduleSpreads),
      "",
      "### Breadth",
      "",
      this.renderCallableBreadths({
        previewCount: args.previewCount,
        reports: report.callableBreadths,
      }),
      "",
      "### Possibly misplaced",
      "",
      this.renderMisplaced(report.misplacedCallables),
    ].join("\n");
  }

  /** Renders a whole run, for a terminal or a report file. */
  public renderRun(args: RenderRunArguments): string {
    const { result } = args;

    return [
      RUN_HEADING,
      "",
      this.renderSummaryTable(result.summary),
      "",
      `## Call stacks over the depth limit (${String(result.deepStacks.length)})`,
      "",
      this.renderStacksAs({
        previewCount: args.previewCount,
        rendering: args.rendering,
        stacks: result.deepStacks,
      }),
      "",
      "## Module spread",
      "",
      this.renderSpreads(result.moduleSpreads),
      "",
      `## Callables over the breadth limit (${String(result.wideCallables.length)})`,
      "",
      this.renderCallableBreadths({
        previewCount: args.previewCount,
        reports: result.wideCallables,
      }),
      "",
      "## Possibly misplaced",
      "",
      this.renderMisplaced(result.misplacedCallables),
      "",
    ].join("\n");
  }

  /**
   * Renders every stack, the first few openly and the rest behind a disclosure.
   *
   * A package with two hundred stacks is still worth publishing in full — an
   * agent reading the file can expand it, and a person scrolling past should
   * not have to.
   */
  public renderStacks(args: RenderStacksArguments): string {
    if (args.stacks.length === 0) {
      return "None.";
    }

    const rendered = args.stacks.map((stack, index) =>
      this.renderStack({ index, stack }),
    );
    const preview = rendered.slice(0, args.previewCount).join("\n\n");
    const remaining = rendered.slice(args.previewCount);

    if (remaining.length === 0) {
      return preview;
    }

    return [
      preview,
      "",
      "<details>",
      `<summary>${String(remaining.length)} more call stacks</summary>`,
      "",
      remaining.join("\n\n"),
      "",
      "</details>",
    ].join("\n");
  }
}
