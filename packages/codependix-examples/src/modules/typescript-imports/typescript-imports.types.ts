// 🏷️ Types

/** One fixture project's outcome from building its program. */
export type FixtureProgramOutcome =
  | { readonly error: string; readonly outcome: "failed" }
  | { readonly fileCount: number; readonly outcome: "built" };

/**
 * One statement in the resolution fixture that deliberately draws no edge.
 *
 * Kept as data rather than prose so the guide's table and the fixture cannot
 * drift apart: the table is rendered from this list, and the fixture files it
 * names are read by the same example run.
 */
export interface NonEdgeCase {
  readonly file: string;
  readonly reason: string;
  readonly statement: string;
}
