import { BARE_MATRIX_POINT } from "../../../matrix/matrix.constants";

import type { Matrix } from "../../../matrix/matrix.types";

/**
 * The longest straight horizontal run of ink anywhere in the Code, wrapping
 * each row around its own column span so a run may cross the tile's seam.
 * Capped at `columns`, since a longer run would double back over ground it
 * already covered.
 */
export function longestHorizontalRunLength(matrix: Matrix): number {
  const columns = matrix[0]?.length ?? 0;
  if (matrix.length === 0 || columns === 0) {
    return 0;
  }

  return Math.max(...matrix.map((row) => longestRowRunLength(row, columns)));
}

/**
 * The longest straight vertical run of ink anywhere in the Code. Rows do not
 * wrap — the first and last rows sit against the band's own border rules —
 * so no cap is needed here the way `longestHorizontalRunLength` needs one.
 */
export function longestVerticalRunLength(matrix: Matrix): number {
  const columns = matrix[0]?.length ?? 0;
  if (matrix.length === 0 || columns === 0) {
    return 0;
  }

  return Math.max(
    ...Array.from({ length: columns }, (_unused, column) =>
      longestColumnRunLength(matrix, column),
    ),
  );
}

/** The longest straight run of ink in `column`, reading each row's south arm directly and never wrapping across rows. */
function longestColumnRunLength(matrix: Matrix, column: number): number {
  let run = 0;
  let maximum = 0;

  for (const row of matrix) {
    const point = row[column] ?? BARE_MATRIX_POINT;
    if (point.south) {
      run += 1;
      maximum = Math.max(maximum, run);
    } else {
      run = 0;
    }
  }

  return maximum;
}

/** The longest straight run of ink in one row, reading its east arm around the row's own column span twice and capping at `columns`. */
function longestRowRunLength(row: Matrix[number], columns: number): number {
  let run = 0;
  let maximum = 0;

  for (let index = 0; index < columns * 2; index += 1) {
    const point = row[index % columns] ?? BARE_MATRIX_POINT;
    if (point.east) {
      run += 1;
      maximum = Math.max(maximum, run);
    } else {
      run = 0;
    }
  }

  return Math.min(maximum, columns);
}
