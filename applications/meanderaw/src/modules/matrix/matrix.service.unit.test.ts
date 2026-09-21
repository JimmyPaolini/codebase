import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { BARE_MATRIX_POINT } from "./matrix.constants";
import { MatrixService } from "./matrix.service";

import type { MatrixWindow } from "./matrix.types";

describe(MatrixService, () => {
  let service: MatrixService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodeService, MatrixService, SymmetryService, TileService],
    }).compile();

    service = await module.resolve(MatrixService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();

    const window: MatrixWindow = {
      column: 0,
      height: 1,
      matrix: [[BARE_MATRIX_POINT]],
      row: 0,
      width: 1,
    };

    expect(window).toBeDefined();
  });

  describe("fromCode and toCode", () => {
    it("converts a formatted code string into a 2D matrix", () => {
      const matrix = service.fromCode("02x03y36c9");

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[0]?.[0]).toStrictEqual({
        east: true,
        north: false,
        south: false,
        west: true,
      });
      expect(matrix[0]?.[1]).toStrictEqual({
        east: true,
        north: false,
        south: true,
        west: false,
      });
      expect(matrix[1]?.[0]).toStrictEqual({
        east: false,
        north: true,
        south: true,
        west: false,
      });
      expect(matrix[1]?.[1]).toStrictEqual({
        east: false,
        north: true,
        south: false,
        west: true,
      });
    });

    it("converts bare hexadecimal digits with dimensions into a 2D matrix", () => {
      const matrix = service.fromCode("36c9", 3, 2);

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[1]?.[1]).toStrictEqual({
        east: false,
        north: true,
        south: false,
        west: true,
      });
    });

    it("encodes a 2D matrix back to a formatted code string", () => {
      const matrix = service.fromCode("02x03y36c9");
      const code = service.toCode(matrix);

      expect(code).toBe("02x03y36c9");
    });

    it("encodes a 2D matrix with repeats", () => {
      const matrix = service.fromCode("02x03y36c9");
      const code = service.toCode(matrix, 2);

      expect(code).toBe("02x03y36c9r02");
    });

    it("handles empty matrix in toCode", () => {
      expect(service.toCode([])).toBe("00x00y");
    });
  });
});
