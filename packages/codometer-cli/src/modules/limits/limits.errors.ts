// 🚨 Errors

/**
 * Raised when a limit's dotted path does not name exactly one metric.
 *
 * Both halves of that are failures worth stopping for. A path naming nothing
 * gates nothing while looking like a gate, and a path naming several would
 * have to pick one — and a limit quietly holding the wrong metric is a limit
 * nobody would ever discover was wrong.
 */
export class UnboundMetricError extends Error {
  constructor(path: string, reason: string) {
    super(`Cannot bind the limit written against "${path}": ${reason}`);
    this.name = "UnboundMetricError";
  }
}
