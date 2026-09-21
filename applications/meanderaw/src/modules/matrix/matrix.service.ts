import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";

import type { ParsedCode } from "../code/code.types";
import type { Matrix, MatrixPoint } from "./matrix.types";

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
