import { Injectable } from "@nestjs/common";

import {
  COLLAPSED_PARAMETERS,
  DEPRECATED_MARKER,
  ENTRY_FRAME_PREFIX,
  NESTED_FRAME_PREFIX,
  SIGNATURE_LIMIT,
  SUMMARY_PREFIX,
} from "./report.constants";

import type { CallStack, StackFrame } from "@callidescope/configuration";

/**
 * Renders one call stack as an indented tree.
 *
 * Plain text rather than a markdown list, because the indentation is the thing
 * that makes a stack readable and a list would have every renderer reflow it.
 * Whatever embeds this is responsible for putting it in a fence.
 */
@Injectable()
export class ReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders one frame at its indentation, with whatever it says about itself. */
  private renderFrame(args: { depth: number; frame: StackFrame }): string {
    const indent = "  ".repeat(args.depth);
    const prefix = args.depth === 0 ? ENTRY_FRAME_PREFIX : NESTED_FRAME_PREFIX;
    const { filePath, line } = args.frame.location;
    const head = `${indent}${prefix} ${args.frame.displayName}${this.renderSignature(args.frame)}${this.renderMarkers(args.frame)} [${filePath}:${String(line)}]`;
    const summary = args.frame.documentation?.summary ?? "";

    return summary.length === 0
      ? head
      : `${head}\n${indent}   ${SUMMARY_PREFIX} ${summary}`;
  }

  /** Renders what a frame warns about: that it recurses, that it is on its way out. */
  private renderMarkers(frame: StackFrame): string {
    const cycle = frame.isCycle ? " (cycle)" : "";

    return (frame.documentation?.isDeprecated ?? false)
      ? `${cycle} ${DEPRECATED_MARKER}`
      : cycle;
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

    return signature.text.length <= SIGNATURE_LIMIT
      ? signature.text
      : `${COLLAPSED_PARAMETERS}: ${signature.returnType}`;
  }

  // 🌎 Public Methods

  /** Renders every frame of a stack, the entry point first. */
  public renderStackTree(stack: CallStack): string {
    return stack.frames
      .map((frame, depth) => this.renderFrame({ depth, frame }))
      .join("\n");
  }
}
