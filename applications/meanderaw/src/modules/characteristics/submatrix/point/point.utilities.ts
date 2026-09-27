import type { MatrixPoint } from "../../../matrix/matrix.types";

/**
 * How many of a point's four arms carry ink — its raw digit degree, read
 * directly off the point rather than through the connectivity graph. A
 * north or south arm at the band's own border counts here even though it
 * joins nothing, which is what lets `edgeCount` and `inkPointCount` agree
 * with the legacy digit histogram they port.
 */
export function armCount(point: MatrixPoint): number {
  return [point.east, point.north, point.south, point.west].filter(Boolean)
    .length;
}
