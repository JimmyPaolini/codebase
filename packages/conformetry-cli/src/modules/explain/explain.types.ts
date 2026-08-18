// 🏷️ Types

/** One template that was scored against a candidate. */
export interface ConsideredTemplate {
  matchedFileCount: number;
  name: string;
  /** Share of the template's files the instance already has, 0 to 1. */
  matchRatio: number;
  templateFileCount: number;
}

/** Options accepted by the explain command. */
export interface ExplainCommandOptions {
  config?: string;
  json?: boolean;
}

/** What one instance path was matched to, and what lost. */
export interface ExplainedInstance {
  considered: ConsideredTemplate[];
  instancePath: string;
  nameStem: string;
  /** The templates the verdict names — empty when nothing matched. */
  templates: string[];
  verdict: ExplainVerdict;
}

/**
 * The outcome of attributing one instance to a template.
 *
 * `ambiguous` and `no-match` are the two outcomes conformance itself reports as
 * differences, which is why they are named rather than folded into a failure.
 */
export type ExplainVerdict = "ambiguous" | "matched" | "no-match";
