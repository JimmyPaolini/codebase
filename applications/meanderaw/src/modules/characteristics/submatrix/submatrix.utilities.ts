import type { Matrix, MatrixPointArm } from "../../matrix/matrix.types";
import type { GlyphCell } from "./submatrix.types";

/**
 * Counts the minimal isolated glyphs of a matrix drawn exactly as `template`.
 *
 * The template holds one string per row and one character per point: the
 * point's hexadecimal Code digit (north 8, south 4, east 2, west 1), or `.`
 * for a point outside the glyph. A window matches when every glyph point
 * carries exactly its template arms. A template's arms all stay inside the
 * glyph, so an exact match is a whole piece of ink — nothing joins it, which
 * is what makes it isolated, and why each piece matches at one window only.
 * Columns wrap, so a glyph may cross the tile's seam; a glyph wider than the
 * tile would overlap its own repeat and is never counted.
 */
export function countIsolatedGlyphs(
  matrix: Matrix,
  template: readonly string[],
): number {
  const cells = glyphCells(template);
  const width = Math.max(0, ...template.map((line) => line.length));
  const columns = matrix[0]?.length ?? 0;
  if (width > columns) {
    return 0;
  }

  let count = 0;
  for (let row = 0; row + template.length <= matrix.length; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (
        cells.every(
          (cell) =>
            pointDigitAt(matrix, row + cell.row, column + cell.column) ===
            cell.digit,
        )
      ) {
        count += 1;
      }
    }
  }

  return count;
}

/**
 * Counts the points whose ink leaves by exactly `arms` — every named arm set
 * and every other arm clear — which is the whole of every 1×1 submatrix
 * characteristic: a bare point is `[]`, a corner two perpendicular arms, a
 * fork three, and a cross all four.
 */
export function countPointsWithExactArms(
  matrix: Matrix,
  arms: readonly MatrixPointArm[],
): number {
  const east = arms.includes("east");
  const north = arms.includes("north");
  const south = arms.includes("south");
  const west = arms.includes("west");
  let count = 0;

  for (const row of matrix) {
    for (const point of row) {
      if (
        point.east === east &&
        point.north === north &&
        point.south === south &&
        point.west === west
      ) {
        count += 1;
      }
    }
  }

  return count;
}

/**
 * Typesets a {@link countIsolatedGlyphs} template as the LaTeX definition of
 * its characteristic — the count of isolated windows equal to the template,
 * with its digits as a matrix and each blank as a centered dot.
 */
export function glyphFormula(template: readonly string[]): string {
  const rows = template
    .map((line) =>
      Array.from({ length: line.length }, (_unused, column) =>
        line.charAt(column) === "." ? String.raw`\cdot` : line.charAt(column),
      ).join(" & "),
    )
    .join(String.raw` \\ `);

  return String.raw`\left|\left\{\, W \subseteq M : W \equiv \begin{matrix} ${rows} \end{matrix},\ W \text{ isolated} \,\right\}\right|`;
}

/**
 * The hexadecimal Code digit of the point at `(row, column)` — north 8,
 * south 4, east 2, west 1 — with columns wrapping, or -1 past the top or
 * bottom row, which no digit equals.
 */
export function pointDigitAt(
  matrix: Matrix,
  row: number,
  column: number,
): number {
  const points = matrix[row] ?? [];
  const point =
    points[((column % points.length) + points.length) % points.length];
  if (point === undefined) {
    return -1;
  }

  return (
    (point.north ? 8 : 0) +
    (point.south ? 4 : 0) +
    (point.east ? 2 : 0) +
    (point.west ? 1 : 0)
  );
}

/** The glyph points of a {@link countIsolatedGlyphs} template, with each blank `.` left out. */
function glyphCells(template: readonly string[]): GlyphCell[] {
  return template.flatMap((line, row) =>
    Array.from({ length: line.length }, (_unused, column) => ({
      character: line.charAt(column),
      column,
    }))
      .filter(({ character }) => character !== ".")
      .map(({ character, column }) => ({
        column,
        digit: Number.parseInt(character, 16),
        row,
      })),
  );
}
