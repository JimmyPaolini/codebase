import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SnakeSequenceService } from "./snake-sequence.service";

describe(SnakeSequenceService, () => {
  let service: SnakeSequenceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SnakeSequenceService],
    }).compile();

    service = await module.resolve(SnakeSequenceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("points", () => {
    it("matches the reference geometry at the structural minimum of 4 rows", () => {
      expect(service.points(4)).toStrictEqual([
        [0, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 3],
        [3, 3],
        [3, 1],
      ]);
    });

    it("matches the reference geometry at 5 rows", () => {
      expect(service.points(5)).toStrictEqual([
        [0, 1],
        [3, 1],
        [3, 3],
        [2, 3],
        [2, 2],
        [1, 2],
        [1, 4],
        [4, 4],
        [4, 1],
      ]);
    });

    it("matches the reference geometry at 6 rows", () => {
      expect(service.points(6)).toStrictEqual([
        [0, 1],
        [4, 1],
        [4, 4],
        [2, 4],
        [2, 3],
        [3, 3],
        [3, 2],
        [1, 2],
        [1, 5],
        [5, 5],
        [5, 1],
      ]);
    });

    it("matches the reference geometry at 7 rows", () => {
      expect(service.points(7)).toStrictEqual([
        [0, 1],
        [5, 1],
        [5, 5],
        [2, 5],
        [2, 3],
        [3, 3],
        [3, 4],
        [4, 4],
        [4, 2],
        [1, 2],
        [1, 6],
        [6, 6],
        [6, 1],
      ]);
    });

    it("visits every grid level from 1 to rows minus one exactly once", () => {
      const points = service.points(8);
      const visitedLevels = points.slice(1, -1).map(([, yLevel]) => yLevel);

      expect(new Set(visitedLevels).size).toBe(7);
      expect(Math.max(...visitedLevels)).toBe(7);
      expect(Math.min(...visitedLevels)).toBe(1);
    });
  });
});
