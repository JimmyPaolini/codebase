import { readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "./boxes-motif.service";
import { ChainMotifService } from "./chain-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { InvalidRepeatCountCycleError } from "./invalid-repeat-count-cycle.errors";
import { InvalidRepeatCountError } from "./invalid-repeat-count.errors";
import { InvalidRowsError } from "./invalid-rows.errors";
import { MeanderGenerationService } from "./meander-generation.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";
import { SvgRenderingService } from "./svg-rendering.service";
import { SwirlMotifService } from "./swirl-motif.service";
import { WhirlMotifService } from "./whirl-motif.service";

describe(MeanderGenerationService, () => {
  let service: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderGenerationService,
        GridGeometryService,
        BoxesMotifService,
        ChainMotifService,
        MotifTransformsService,
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    service = await module.resolve(MeanderGenerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("matches the committed golden fixture for 5 rows boxes with 6 repeats", async () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 5,
        type: "boxes",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/fixtures/boxes-5-rows-6-repeats.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws below the structural minimum rows for boxes", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 2, type: "boxes" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws above the maximum rows", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 13, type: "boxes" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws below the minimum repeat count", () => {
      expect(() =>
        service.generate({ repeatCount: 0, rows: 5, type: "boxes" }),
      ).toThrow(InvalidRepeatCountError);
    });

    it("throws above the maximum repeat count", () => {
      expect(() =>
        service.generate({ repeatCount: 13, rows: 5, type: "boxes" }),
      ).toThrow(InvalidRepeatCountError);
    });

    it("throws on a non-integer rows value rather than producing NaN coordinates", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: Number.NaN, type: "boxes" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws on a non-integer repeat count rather than producing NaN coordinates", () => {
      expect(() =>
        service.generate({ repeatCount: Number.NaN, rows: 5, type: "boxes" }),
      ).toThrow(InvalidRepeatCountError);
    });

    it("matches the committed golden fixture for 5 rows boxes with 4 repeats and spin", async () => {
      const svg = service.generate({
        modifier: { name: "spin" },
        repeatCount: 4,
        rows: 5,
        type: "boxes",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/fixtures/boxes-5-rows-4-repeats-spin.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("matches the committed golden fixture for 5 rows boxes with 4 repeats and spin-flip", async () => {
      const svg = service.generate({
        modifier: { name: "spin-flip" },
        repeatCount: 4,
        rows: 5,
        type: "boxes",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/fixtures/boxes-5-rows-4-repeats-spin-flip.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws when repeatCount doesn't complete spin's 4-step cycle", () => {
      expect(() =>
        service.generate({
          modifier: { name: "spin" },
          repeatCount: 6,
          rows: 5,
          type: "boxes",
        }),
      ).toThrow(InvalidRepeatCountCycleError);
    });

    it("throws when repeatCount doesn't complete spin-flip's 4-step cycle", () => {
      expect(() =>
        service.generate({
          modifier: { name: "spin-flip" },
          repeatCount: 5,
          rows: 5,
          type: "boxes",
        }),
      ).toThrow(InvalidRepeatCountCycleError);
    });

    it("matches the committed golden fixture for 5 rows snake with 6 repeats", async () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 5,
        type: "snake",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/fixtures/snake-5-rows-6-repeats.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("matches the committed golden fixture for 5 rows chain with 6 repeats", async () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 5,
        type: "chain",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/fixtures/chain-5-rows-6-repeats.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws below the structural minimum rows for snake", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 3, type: "snake" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws below the structural minimum rows for chain", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 3, type: "chain" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws when a modifier isn't compatible with the requested type", () => {
      expect(() =>
        service.generate({
          modifier: { name: "spin" },
          repeatCount: 1,
          rows: 5,
          type: "snake",
        }),
      ).toThrow(/not compatible/i);
    });

    it.each(["chain", "snake"] as const)(
      "matches the committed golden fixture for 5 rows %s with 6 repeats and edge",
      async (type) => {
        const svg = service.generate({
          modifier: { name: "edge" },
          repeatCount: 6,
          rows: 5,
          type,
        });
        const golden = await readFile(
          path.join(
            import.meta.dirname,
            `../../../testing/fixtures/${type}-5-rows-6-repeats-edge.svg`,
          ),
          "utf8",
        );

        expect(svg).toBe(golden);
      },
    );

    it.each(["chain", "snake"] as const)(
      "matches the committed golden fixture for 5 rows %s with 6 repeats and flip",
      async (type) => {
        const svg = service.generate({
          modifier: { name: "flip" },
          repeatCount: 6,
          rows: 5,
          type,
        });
        const golden = await readFile(
          path.join(
            import.meta.dirname,
            `../../../testing/fixtures/${type}-5-rows-6-repeats-flip.svg`,
          ),
          "utf8",
        );

        expect(svg).toBe(golden);
      },
    );

    it.each(["chain", "snake"] as const)(
      "matches the committed golden fixture for 7 rows %s with 6 repeats and flip, confirming the fused-tile pitch generalizes",
      async (type) => {
        const svg = service.generate({
          modifier: { name: "flip" },
          repeatCount: 6,
          rows: 7,
          type,
        });
        const golden = await readFile(
          path.join(
            import.meta.dirname,
            `../../../testing/fixtures/${type}-7-rows-6-repeats-flip.svg`,
          ),
          "utf8",
        );

        expect(svg).toBe(golden);
      },
    );

    it.each(["chain", "snake"] as const)(
      "matches the committed golden fixture for 5 rows %s with 6 repeats and edge-flip",
      async (type) => {
        const svg = service.generate({
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 5,
          type,
        });
        const golden = await readFile(
          path.join(
            import.meta.dirname,
            `../../../testing/fixtures/${type}-5-rows-6-repeats-edge-flip.svg`,
          ),
          "utf8",
        );

        expect(svg).toBe(golden);
      },
    );

    it.each(["swirl", "whirl"] as const)(
      "matches the committed golden fixture for 5 rows %s with 6 repeats",
      async (type) => {
        const svg = service.generate({
          repeatCount: 6,
          rows: 5,
          type,
        });
        const golden = await readFile(
          path.join(
            import.meta.dirname,
            `../../../testing/fixtures/${type}-5-rows-6-repeats.svg`,
          ),
          "utf8",
        );

        expect(svg).toBe(golden);
      },
    );

    it.each(["swirl", "whirl"] as const)(
      "matches the committed golden fixture for 5 rows %s with 6 repeats and flip",
      async (type) => {
        const svg = service.generate({
          modifier: { name: "flip" },
          repeatCount: 6,
          rows: 5,
          type,
        });
        const golden = await readFile(
          path.join(
            import.meta.dirname,
            `../../../testing/fixtures/${type}-5-rows-6-repeats-flip.svg`,
          ),
          "utf8",
        );

        expect(svg).toBe(golden);
      },
    );

    it("throws below the structural minimum rows for swirl", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 3, type: "swirl" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws below the structural minimum rows for whirl", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 3, type: "whirl" }),
      ).toThrow(InvalidRowsError);
    });
  });
});
