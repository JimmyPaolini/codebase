// 🏷️ Types

import type {
  CallableId,
  CallGraphResult,
  CallStack,
  ProjectReport,
} from "@callidescope/configuration";

/**
 * A diagram under construction.
 *
 * Mutable, and deliberately so: nodes and edges accumulate across every stack
 * drawn, and threading an immutable accumulator through that would say nothing
 * the name does not.
 */
export interface MermaidDiagram {
  readonly edges: Set<string>;
  readonly identifiersByCallable: Map<CallableId, string>;
  readonly nodes: string[];
}

/** Arguments for rendering one project's section. */
export interface RenderProjectSectionArguments {
  readonly heading: string;
  readonly previewCount: number;
  readonly rendering: StackRendering;
  readonly report: ProjectReport;
}

/** Arguments for rendering a whole run. */
export interface RenderRunArguments {
  readonly previewCount: number;
  readonly rendering: StackRendering;
  readonly result: CallGraphResult;
}

/** Arguments for rendering a run's stacks, preview then disclosure. */
export interface RenderStacksArguments {
  readonly previewCount: number;
  readonly stacks: readonly CallStack[];
}

/**
 * How a report draws the stacks it found.
 *
 * Narrower than `CallidescopeOutputFormat` on purpose: `json` is a different
 * report rather than a different drawing of this one, and a renderer that had
 * to accept it would carry a case it can never answer.
 */
export type StackRendering = "diagram" | "tree";
