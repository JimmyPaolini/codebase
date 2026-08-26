import { Injectable } from "@nestjs/common";

/**
 * A mutually recursive cluster of three, collapsed before depth is measured.
 *
 * `descend` calls `branch`, `branch` calls `leaf`, and `leaf` calls `descend`
 * again. The three sit in one cycle, so callidescope condenses them into a
 * single component contributing three frames once — an honest floor on a stack
 * that has no ceiling.
 *
 * The alternative, noticing a repeat visit part-way through the walk, makes the
 * answer depend on which path arrived first: the same method then reports a
 * different depth from a different entry point, and between runs. Numbers that
 * move on their own cannot gate a pull request.
 */
@Injectable()
export class MutualRecursionService {
  // 🔏 Private Methods

  /** Second of the three, one hop from the leaf. */
  private branch(remaining: number): number {
    return this.leaf(remaining);
  }

  /** Third of the three, which calls back to the first. */
  private leaf(remaining: number): number {
    return remaining <= 0 ? 0 : this.descend(remaining - 1);
  }

  // 🌎 Public Methods

  /** First of the three, and the way into the cycle. */
  public descend(remaining: number): number {
    return this.branch(remaining);
  }
}
