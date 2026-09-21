import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";

import { BARE_MATRIX_POINT } from "./matrix.constants";

import type { ParsedCode } from "../code/code.types";
import type { Matrix, MatrixPoint, MatrixWindow } from "./matrix.types";

/**
 * Owns 2D matrix transformations for meander patterns: converting to and from
 * meander Code strings, coordinate lookups with column wrapping, cyclic column
 * rotation, and arbitrary sliding kernel window extraction.
 */
@Injectable()
export class MatrixService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

<<<<<<< HEAD
=======
  /**
   * Extracts a 2D window kernel starting at the given origin with the specified size.
   */
  private extractWindow(
    matrix: Matrix,
    origin: { readonly column: number; readonly row: number },
    size: { readonly height: number; readonly width: number },
  ): MatrixPoint[][] {
    const columnCount = matrix[0]?.length ?? 0;

    return Array.from({ length: size.height }, (_unusedRow, deltaRow) =>
      Array.from({ length: size.width }, (_unusedColumn, deltaColumn) => {
        const columnIndex =
          (((origin.column + deltaColumn) % columnCount) + columnCount) %
          columnCount;

        return (
          matrix[origin.row + deltaRow]?.[columnIndex] ?? BARE_MATRIX_POINT
        );
      }),
    );
  }

  /**
   * Checks whether the target window dimensions are valid for the given matrix.
   */
  private hasValidDimensions(
    matrix: Matrix,
    height: number,
    width: number,
  ): boolean {
    const rowCount = matrix.length;
    const columnCount = matrix[0]?.length ?? 0;

    return rowCount >= height && columnCount > 0 && height > 0 && width > 0;
  }

>>>>>>> 2259ecb83 (fixup! feat(meanderaw): ✨ implement MatrixService pointAt, rotate, and slidingWindow (#1035))
  // 🌎 Public Methods

  /**
   * Converts a meander Code string (self-contained formatted or bare hexadecimal digits with dimensions)
   * or a `ParsedCode` into a 2D Matrix indexed as `[row][column]`.
   */
  fromCode(code: ParsedCode | string, rows?: number, columns?: number): Matrix {
    const parsed =
      typeof code === "string"
        ? this.codeService.parse(code, rows, columns)
        : code;
    const rowCount = parsed.levels;
    const columnCount = parsed.columns;

    return Array.from({ length: rowCount }, (_unusedRow, row) =>
      Array.from({ length: columnCount }, (_unusedColumn, column) =>
        this.codeService.directionsAt(parsed, row, column),
      ),
    );
  }

  /**
   * Returns the `MatrixPoint` at the given `(row, column)` coordinates,
   * wrapping columns cyclically modulo the column count, and returning `BARE_MATRIX_POINT`
   * if `row` is out of bounds.
   */
  pointAt(matrix: Matrix, row: number, column: number): MatrixPoint {
    const rowCount = matrix.length;
    const columnCount = matrix[0]?.length ?? 0;

    if (columnCount === 0 || row < 0 || row >= rowCount) {
      return BARE_MATRIX_POINT;
    }

    const wrappedColumn = ((column % columnCount) + columnCount) % columnCount;

    return matrix[row]?.[wrappedColumn] ?? BARE_MATRIX_POINT;
  }

  /**
   * Shifts/rotates columns of the matrix by `step` positions westward with cyclic column wrapping.
   */
  rotate(matrix: Matrix, step: number): Matrix {
    if (matrix.length === 0) {
      return [];
    }

    const columnCount = matrix[0]?.length ?? 0;
    if (columnCount === 0) {
      return matrix;
    }

    const offset = ((step % columnCount) + columnCount) % columnCount;

    return matrix.map((row) => [...row.slice(offset), ...row.slice(0, offset)]);
  }

  /**
   * Extracts sliding window kernels of size `height x width` over the matrix with horizontal column wrapping.
   */
  slidingWindow(matrix: Matrix, height: number, width: number): MatrixWindow[] {
    if (!this.hasValidDimensions(matrix, height, width)) {
      return [];
    }

    const rowCount = matrix.length;
    const columnCount = matrix[0]?.length ?? 0;
    const windows: MatrixWindow[] = [];

    for (let row = 0; row <= rowCount - height; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        windows.push({
          column,
          height,
          matrix: this.extractWindow(
            matrix,
            { column, row },
            { height, width },
          ),
          row,
          width,
        });
      }
    }

    return windows;
  }

  /**
   * Encodes a 2D Matrix back into a formatted meander Code string.
   */
  toCode(matrix: Matrix, repeats = 1): string {
    if (matrix.length === 0) {
      return "00x00y";
    }

    const rowCount = matrix.length;
    const columnCount = matrix[0]?.length ?? 0;

    const digits = matrix
      .flatMap((row) =>
        row.map((point: MatrixPoint) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");

    return this.codeService.format({
      columns: columnCount,
      digits,
      levels: rowCount,
      repeats,
      rows: rowCount + 1,
    });
  }
}
