// 🏷️ Types

/**
 * How well one matched instance honours the template it was matched to.
 *
 * Lives in core rather than beside the orchestrator because reporting renders
 * it and the orchestrator produces it, and a shape shared by two layers is
 * exactly what the leaf package is for.
 */
export interface InstanceScore {
  /** Combined weight of the requirements this instance failed. */
  readonly failedWeight: number;
  readonly instancePath: string;
  /** Whether the score reached the threshold that applies to this instance. */
  readonly ok: boolean;
  /** Share of the template's requirements honoured, from 0 to 1. */
  readonly score: number;
  readonly templateName: string;
  /** The threshold that applied, after resolving every level. */
  readonly threshold: number;
  /** Combined weight of the requirements that were checked. */
  readonly totalWeight: number;
}
