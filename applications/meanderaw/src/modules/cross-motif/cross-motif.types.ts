// 🏷️ Types

/** One inclusive run of grid levels a bar or a rail is drawn along, in grid levels rather than pixels. */
export interface CrossLevelSpan {
  readonly fromLevel: number;
  readonly toLevel: number;
}
