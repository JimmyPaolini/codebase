import type { CodeEdge } from "../../characteristics.types";
import type { FreeEndPoint } from "./end.types";

/**
 * The lattice positions where one repeat's ink terminates — the wrapped
 * repeat graph's degree-one vertices, named by the `row,column` keys
 * `ConnectivityService.edges` gives them. Shared by every `path/end`
 * evaluator, since both read the same pair of free ends.
 */
export function freeEndPoints(
  edges: readonly CodeEdge[],
): readonly FreeEndPoint[] {
  const incidences = new Map<string, number>();
  const bump = (node: string): void => {
    incidences.set(node, (incidences.get(node) ?? 0) + 1);
  };

  for (const { from, to } of edges) {
    bump(from);
    bump(to);
  }

  const points: FreeEndPoint[] = [];
  for (const [node, count] of incidences) {
    if (count === 1) {
      points.push(position(node));
    }
  }

  return points;
}

/** The row and column a `row,column` point key names, falling back to the origin when either half fails to parse. */
function position(key: string): FreeEndPoint {
  const [rowString, columnString] = key.split(",");
  const row = Number(rowString);
  const column = Number(columnString);

  return {
    column: Number.isNaN(column) ? 0 : column,
    row: Number.isNaN(row) ? 0 : row,
  };
}
