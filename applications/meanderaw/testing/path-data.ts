/**
 * Assertions about generated SVG path data, shared by the motif services'
 * own unit tests. Each reads the rendered path back rather than recomputing
 * the geometry that produced it, so a test cannot drift with the code it is
 * checking.
 */

// 🔧 Configuration

/**
 * How far two coordinates may differ before the difference counts as real.
 * `GridGeometryService.formatCoordinate` rounds every coordinate to five
 * decimal places, so at a row count whose grid unit doesn't divide the
 * canvas evenly (7, 9, 11) two rounded values that should be equal can land
 * a few millionths of a pixel apart.
 */
export const COORDINATE_ROUNDING_TOLERANCE = 0.0001;

// 🌎 Utilities

/** The rightmost x-coordinate a stretch of path data draws. */
export const rightmostX = (pathData: string): number =>
  Math.max(
    ...[...pathData.matchAll(/[MH]([\d.]+)/g)].map((match) => Number(match[1])),
  );

/**
 * Splits one unit's path into the motif trace and the border segment
 * appended after it, by trimming exactly the border the service would draw
 * for those same options.
 */
export const splitTrace = (
  fullPath: string,
  borderSegment: string,
): { border: string; trace: string } => ({
  border: borderSegment,
  trace: fullPath.slice(0, fullPath.length - borderSegment.length),
});
