import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GraphService } from "../graph/graph.service";
import { MeanderDecodingService } from "../meander-decoding/meander-decoding.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";

import { MeanderConnectivityService } from "./meander-connectivity.service";

// 🧪 Tests

/**
 * Drives `MeanderConnectivityService` through the decoder, so a case names
 * the Code it is about rather than a grid literal: these counts are read off
 * a Code in production, and a fixture written any other way would be
 * asserting something the pipeline never computes.
 */
describe(MeanderConnectivityService, () => {
  let decodingService: MeanderDecodingService;
  let service: MeanderConnectivityService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderConnectivityService,
        MeanderDecodingService,
        MeanderLatticeService,
        GraphService,
      ],
    }).compile();

    decodingService = await module.resolve(MeanderDecodingService);
    service = await module.resolve(MeanderConnectivityService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("connectivity", () => {
    it.each([
      {
        code: "00",
        columns: 2,
        expected: { components: 2, cycles: 0, freeEnds: 0 },
        rows: 2,
        shape: "two inked dots, joined to nothing and to each other by nothing",
      },
      {
        code: "3",
        columns: 1,
        expected: { components: 1, cycles: 1, freeEnds: 0 },
        rows: 2,
        shape:
          "a single column's eastward edge wrapping onto its own point, which is a loop in the repeat and a straight rule in the drawing",
      },
      {
        code: "cc",
        columns: 1,
        expected: { components: 1, cycles: 0, freeEnds: 2 },
        rows: 3,
        shape: "one vertical bar joining both levels of a one-column repeat",
      },
      {
        code: "56a9",
        columns: 2,
        expected: { components: 1, cycles: 1, freeEnds: 0 },
        rows: 3,
        shape:
          "the `zigzag` tile a `negative` drawing and a `parallel` serpentine both address to, whose ink closes through its own next repeat",
      },
      {
        code: "4488",
        columns: 2,
        expected: { components: 2, cycles: 0, freeEnds: 4 },
        rows: 3,
        shape:
          "the `bars` tile `branch`'s comb and `parallel`'s one-strand bundle both address to: two separate bars, each terminating at both ends",
      },
    ])("reads $shape as $expected", ({ code, columns, expected, rows }) => {
      const grid = decodingService.decode(code, rows, columns);

      expect(service.connectivity(grid)).toStrictEqual(expected);
    });

    it("reads an edge claimed by only one of its two ends, which no well-formed Code spells but the decoder still admits", () => {
      const grid = [
        [
          { east: true, north: false, south: false, west: false },
          { east: false, north: false, south: false, west: false },
        ],
      ];

      expect(service.connectivity(grid)).toStrictEqual({
        components: 1,
        cycles: 0,
        freeEnds: 2,
      });
    });
  });
});
