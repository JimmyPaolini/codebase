import { Injectable } from "@nestjs/common";

import {
  COLLAPSED_PARAMETERS,
  CONSOLE_FINDING_LIMIT,
  CONSOLE_STACK_LIMIT,
  DEPRECATED_MARKER,
  ENTRY_FRAME_PREFIX,
  NESTED_FRAME_PREFIX,
  RULE_WIDTH,
  SIGNATURE_LIMIT,
  SUMMARY_PREFIX,
} from "./report.constants";

import type {
  CallGraphResult,
  DeepStackFinding,
  StackFrame,
} from "@callidescope/configuration";

/**
 * Renders one run's findings for a terminal.
 *
 * A stack is printed as an indented chain of frames with the file and line of
 * each, because the only useful thing to do with a depth violation is to open
 * the frames and decide which hop should not exist.
 */
@Injectable()
export class ReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders one frame of a call stack at its indentation. */
  private renderFrame(args: { depth: number; frame: StackFrame }): string {
    const indent = "  ".repeat(args.depth);
    const prefix = args.depth === 0 ? ENTRY_FRAME_PREFIX : NESTED_FRAME_PREFIX;
    const cycle = args.frame.isCycle ? " (cycle)" : "";
    const deprecated = args.frame.documentation?.isDeprecated ?? false;
    const marker = deprecated ? ` ${DEPRECATED_MARKER}` : "";
    const { filePath, line } = args.frame.location;
    const head = `${indent}${prefix} ${args.frame.displayName}${this.renderSignature(args.frame)}${cycle}${marker} [${filePath}:${String(line)}]`;
    const summary = args.frame.documentation?.summary ?? "";

    return summary.length === 0
      ? head
      : `${head}\n${indent}   ${SUMMARY_PREFIX} ${summary}`;
  }

  /** Renders the misplaced-callable findings. */
  private renderMisplaced(result: CallGraphResult): string[] {
    if (result.misplacedCallables.length === 0) {
      return [];
    }

    const lines = [
      "",
      "PLACEMENT — callables whose callers live elsewhere",
      "",
    ];

    for (const finding of result.misplacedCallables.slice(
      0,
      CONSOLE_FINDING_LIMIT,
    )) {
      lines.push(
        `📦 ${finding.location.filePath}:${String(finding.location.line)}  ${finding.displayName}`,
        `    ${String(finding.foreignCallerCount)} of ${String(finding.callerCount)} callers are in ${finding.suggestedModuleId}, not ${finding.homeModuleId}`,
        `    → consider moving it there, or promoting it to a shared module`,
        "",
      );
    }

    return lines;
  }

  /**
   * Renders a callable's signature, collapsing one that is too long.
   *
   * The return type survives the collapse. Which twelve services a constructor
   * takes is noise at the point where someone is reading a stack; what it hands
   * back is not.
   */
  private renderSignature(frame: StackFrame): string {
    const { signature } = frame;

    if (signature === undefined) {
      return "()";
    }

    if (signature.text.length <= SIGNATURE_LIMIT) {
      return signature.text;
    }

    return `${COLLAPSED_PARAMETERS}: ${signature.returnType}`;
  }

  /** Renders the module-spread findings. */
  private renderSpreads(result: CallGraphResult): string[] {
    if (result.moduleSpreads.length === 0) {
      return [];
    }

    const lines = [
      "",
      "MODULE SPREAD — callables reaching unrelated modules",
      "",
    ];

    for (const finding of result.moduleSpreads.slice(
      0,
      CONSOLE_FINDING_LIMIT,
    )) {
      lines.push(
        `⚠ ${finding.location.filePath}:${String(finding.location.line)}  ${finding.displayName}`,
        `    directly calls ${String(finding.directModuleIds.length)} modules: ${finding.directModuleIds.join(", ")}`,
        `    transitive spread ${String(finding.transitiveSpread)} · depth ${String(finding.depth)} · ${String(finding.statementCount)} statements`,
        "",
      );
    }

    return lines;
  }

  /** Renders one deep-stack finding, header and frames. */
  private renderStack(args: {
    finding: DeepStackFinding;
    index: number;
  }): string[] {
    const { finding } = args;
    const depth = finding.isLowerBound
      ? `≥ ${String(finding.depth)}`
      : String(finding.depth);
    const lines = [
      `Stack #${String(args.index + 1)} | 🚨 [DEPTH ${depth} > ${String(finding.limit)}] (${finding.entryPointKind})`,
    ];

    finding.frames.forEach((frame, depthIndex) => {
      lines.push(this.renderFrame({ depth: depthIndex, frame }));
    });

    lines.push("");

    return lines;
  }

  /** Renders a horizontal rule. */
  private rule(character: string): string {
    return character.repeat(RULE_WIDTH);
  }

  // 🌎 Public Methods

  /** Renders the cohesion findings. */
  public renderCohesion(result: CallGraphResult): string {
    return [
      ...this.renderSpreads(result),
      ...this.renderMisplaced(result),
    ].join("\n");
  }

  /** Renders the run header. */
  public renderHeader(args: {
    limit: number;
    projectNames: readonly string[];
  }): string {
    return [
      "",
      this.rule("="),
      "🔭 CALLIDESCOPE — CALL STACK ANALYSIS",
      `Maximum allowed depth: ${String(args.limit)}`,
      `Projects (${String(args.projectNames.length)}): ${args.projectNames.join(", ")}`,
      this.rule("="),
      "",
    ].join("\n");
  }

  /** Renders the deep call stacks, deepest first. */
  public renderStacks(result: CallGraphResult): string {
    if (result.deepStacks.length === 0) {
      return "✅ No call stack exceeded the configured limit.\n";
    }

    const lines = [
      this.rule("-"),
      `DEEP CALL STACKS (${String(result.deepStacks.length)} over the limit)`,
      this.rule("-"),
      "",
    ];

    result.deepStacks
      .slice(0, CONSOLE_STACK_LIMIT)
      .forEach((finding, index) => {
        lines.push(...this.renderStack({ finding, index }));
      });

    if (result.deepStacks.length > CONSOLE_STACK_LIMIT) {
      lines.push(
        `… and ${String(result.deepStacks.length - CONSOLE_STACK_LIMIT)} more. The JSON report holds every one.`,
        "",
      );
    }

    return lines.join("\n");
  }

  /** Renders the closing summary. */
  public renderSummary(result: CallGraphResult): string {
    const { summary } = result;

    return [
      this.rule("="),
      "SUMMARY",
      `Callables traced:      ${String(summary.callableCount)} in ${String(summary.fileCount)} files across ${String(summary.projectCount)} projects`,
      `Calls resolved:        ${String(summary.edgeCount)}`,
      `Entry points:          ${String(summary.entryPointCount)}`,
      `Deepest stack:         ${String(summary.maximumDepth)}`,
      `Recursive cycles:      ${String(summary.cyclicComponentCount)}`,
      // Surfaced rather than hidden: every depth measured through one of these
      // is a floor, and a reader deserves to know how much of the graph the
      // tool could not follow.
      `Unfollowable calls:    ${String(summary.unresolvedCallCount)}`,
      `Depth violations:      ${String(result.deepStacks.length)}`,
      `Spread findings:       ${String(result.moduleSpreads.length)}`,
      `Placement findings:    ${String(result.misplacedCallables.length)}`,
      this.rule("="),
      "",
    ].join("\n");
  }
}
