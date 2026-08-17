// 🛠️ Utilities

import {
  MARKDOWN_MISPLACED_HEADER,
  MARKDOWN_SPREAD_HEADER,
  MARKDOWN_STACK_HEADER,
  MARKDOWN_SUMMARY_HEADER,
  MARKDOWN_TABLE_LIMIT,
} from "./output-markdown.constants";

import type {
  CallGraphResult,
  DeepStackFinding,
  MisplacedCallableFinding,
  ModuleSpreadFinding,
} from "@callidescope/configuration";

/**
 * Renders the built-in markdown block for one run's findings.
 *
 * Tables are capped rather than exhaustive: a block spliced into a tracked file
 * is read by people, and a hundred rows of the same finding is a report nobody
 * opens twice.
 */
export function renderTables(result: CallGraphResult): string {
  const { summary } = result;
  const summaryTable = [
    MARKDOWN_SUMMARY_HEADER,
    `| Callables | ${String(summary.callableCount)} |`,
    `| Calls traced | ${String(summary.edgeCount)} |`,
    `| Entry points | ${String(summary.entryPointCount)} |`,
    `| Deepest stack | ${String(summary.maximumDepth)} |`,
    `| Recursive cycles | ${String(summary.cyclicComponentCount)} |`,
    `| Unfollowable calls | ${String(summary.unresolvedCallCount)} |`,
  ].join("\n");

  return [
    summaryTable,
    "",
    renderTable({
      header: MARKDOWN_STACK_HEADER,
      rows: renderStackRows(result.deepStacks),
      title: "Deep call stacks",
    }),
    renderTable({
      header: MARKDOWN_SPREAD_HEADER,
      rows: renderSpreadRows(result.moduleSpreads),
      title: "Module spread",
    }),
    renderTable({
      header: MARKDOWN_MISPLACED_HEADER,
      rows: renderMisplacedRows(result.misplacedCallables),
      title: "Possibly misplaced",
    }),
  ].join("\n");
}

/** Renders a link to a frame's position, as a reader would click it. */
function renderLocation(finding: {
  location: { filePath: string; line: number };
}): string {
  return `\`${finding.location.filePath}:${String(finding.location.line)}\``;
}

/** Renders the misplaced-callable rows, most-called first. */
function renderMisplacedRows(
  findings: readonly MisplacedCallableFinding[],
): string[] {
  return findings
    .slice(0, MARKDOWN_TABLE_LIMIT)
    .map(
      (finding) =>
        `| ${finding.displayName} | \`${finding.homeModuleId}\` | \`${finding.suggestedModuleId}\` | ${String(finding.foreignCallerCount)}/${String(finding.callerCount)} |`,
    );
}

/** Renders the module-spread rows, widest first. */
function renderSpreadRows(findings: readonly ModuleSpreadFinding[]): string[] {
  return findings
    .slice(0, MARKDOWN_TABLE_LIMIT)
    .map(
      (finding) =>
        `| ${finding.displayName} | ${String(finding.transitiveSpread)} | ${String(finding.directModuleIds.length)} | ${renderLocation(finding)} |`,
    );
}

/** Renders the deep-stack rows, deepest first. */
function renderStackRows(findings: readonly DeepStackFinding[]): string[] {
  return findings.slice(0, MARKDOWN_TABLE_LIMIT).map((finding) => {
    const depth = finding.isLowerBound
      ? `≥ ${String(finding.depth)}`
      : String(finding.depth);
    const entry = finding.frames[0]?.displayName ?? "unknown";
    const deepest = finding.frames.at(-1)?.displayName ?? "unknown";

    return `| ${entry} | ${depth} | ${deepest} | ${renderLocation(finding.frames[0] ?? { location: { filePath: "", line: 0 } })} |`;
  });
}

/** Renders one markdown table, or a note when there is nothing to show. */
function renderTable(args: {
  header: string;
  rows: readonly string[];
  title: string;
}): string {
  if (args.rows.length === 0) {
    return `### ${args.title}\n\nNone.\n`;
  }

  return `### ${args.title}\n\n${args.header}\n${args.rows.join("\n")}\n`;
}
