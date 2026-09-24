import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BARE_MATRIX_POINT } from "../matrix/matrix.constants";

import { CharacteristicsPathService } from "./characteristics-path.service";
import { ConnectivityService } from "./connectivity.service";

import type { Matrix } from "../matrix/matrix.types";

describe(CharacteristicsPathService, () => {
  let service: CharacteristicsPathService;
  let connectivityService: ConnectivityService;

  const createMatrix = (rows = 1, columns = 4): Matrix =>
    Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => BARE_MATRIX_POINT),
    );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CharacteristicsPathService,
        {
          provide: ConnectivityService,
          useValue: {
            edges: () => [],
          },
        },
      ],
    }).compile();

    service = await module.resolve(CharacteristicsPathService);
    connectivityService = module.get(ConnectivityService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("handles empty paths", () => {
    expect(service.analyzePaths(createMatrix())).toStrictEqual({
      reversesAtItsTightestTurn: false,
      turnsMonotonically: false,
    });
  });

  it("identifies left turn tight U and monotonic turns", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "1,2" }, // Right (direction 1)
      { from: "1,2", to: "0,2" }, // Up (direction 0) -> turn 3 (Left)
      { from: "0,2", to: "0,1" }, // Left (direction 3) -> turn 3 (Left)
    ];
    const result = service.analyzePaths(createMatrix(2, 4));

    expect(result.reversesAtItsTightestTurn).toBe(true);
    expect(result.turnsMonotonically).toBe(true);
  });

  it("identifies right turn without tight U", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "1,2" },
      { from: "1,2", to: "1,3" }, // Straight
      { from: "1,3", to: "2,3" }, // Turn right (1)
      { from: "2,3", to: "2,4" }, // Turn left (3)
    ];
    const result = service.analyzePaths(createMatrix(3, 5));

    expect(result.reversesAtItsTightestTurn).toBe(false);
    expect(result.turnsMonotonically).toBe(false);
  });

  it("handles left turn without tight U", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "1,2" },
      { from: "1,2", to: "1,3" }, // Straight
      { from: "1,3", to: "0,3" }, // Turn left (3)
      { from: "0,3", to: "0,4" }, // Turn right (1)
    ];
    const result = service.analyzePaths(createMatrix(3, 5));

    expect(result.reversesAtItsTightestTurn).toBe(false);
    expect(result.turnsMonotonically).toBe(false);
  });

  it("identifies right turn tight U in a loop", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "1,2" }, // Right (1)
      { from: "1,2", to: "2,2" }, // Down (2)
      { from: "2,2", to: "2,1" }, // Left (3)
      { from: "2,1", to: "1,1" }, // Up (0)
    ];
    const result = service.analyzePaths(createMatrix(3, 4));

    expect(result.reversesAtItsTightestTurn).toBe(true);
    expect(result.turnsMonotonically).toBe(true);
  });

  it("handles backwards turns (U-turn in place)", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "1,2" }, // Right (1)
      { from: "1,2", to: "1,1" }, // Left (3) -> Turn backwards (2)
    ];
    const result = service.analyzePaths(createMatrix(2, 4));

    expect(result.reversesAtItsTightestTurn).toBe(false);
  });

  it("handles straight lines", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "1,2" }, // Right
      { from: "1,2", to: "1,3" }, // Right
    ];
    const result = service.analyzePaths(createMatrix(2, 4));

    expect(result.reversesAtItsTightestTurn).toBe(false);
    expect(result.turnsMonotonically).toBe(false); // no turns
  });

  it("handles invalid directions", () => {
    connectivityService.edges = () => [
      { from: "1,1", to: "3,3" }, // Invalid
      { from: "3,3", to: "4,4" }, // Invalid
    ];
    const result = service.analyzePaths(createMatrix(4, 4));

    expect(result.reversesAtItsTightestTurn).toBe(false);
  });

  it("handles backtracking path node resolution", () => {
    connectivityService.edges = () => [
      { from: "0,0", to: "0,1" },
      { from: "0,1", to: "0,2" },
      { from: "0,1", to: "1,1" }, // Branch
    ];
    const result = service.analyzePaths(createMatrix(2, 4));

    expect(result).toBeDefined();
  });

  it("handles paths wrapping around columns", () => {
    connectivityService.edges = () => [
      { from: "0,3", to: "0,0" }, // Wrapping right
      { from: "0,0", to: "1,0" }, // Down
      { from: "1,0", to: "1,3" }, // Wrapping left
      { from: "1,3", to: "0,3" }, // Up
    ];
    const result = service.analyzePaths(createMatrix(2, 4));

    expect(result.reversesAtItsTightestTurn).toBe(true);
    expect(result.turnsMonotonically).toBe(true);
  });

  it("handles applyTurn returns stepsSinceTurn unchanged for non-turns", () => {
    const metrics = {
      hasLeftTurn: false,
      hasRightTurn: false,
      hasTightU: false,
    };
    const resultStraight = service.applyTurn(0, metrics, 5);
    const resultReversal = service.applyTurn(2, metrics, 5);
    const resultUnknown = service.applyTurn(99, metrics, 5);

    expect(resultStraight).toBe(6);
    expect(resultReversal).toBe(6);
    expect(resultUnknown).toBe(5);
  });
});
