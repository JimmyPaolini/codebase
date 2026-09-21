import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { BARE_MATRIX_POINT } from "./matrix.constants";
import { MatrixService } from "./matrix.service";

import type { Matrix, MatrixPoint, MatrixWindow } from "./matrix.types";

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

    expect(BARE_MATRIX_POINT).toBeDefined();

    const point: MatrixPoint = BARE_MATRIX_POINT;
    const matrix: Matrix = [[point]];
    const window: MatrixWindow = {
      column: 0,
      height: 1,
      matrix,
      row: 0,
      width: 1,
    };

    expect(window).toBeDefined();
  });
});
