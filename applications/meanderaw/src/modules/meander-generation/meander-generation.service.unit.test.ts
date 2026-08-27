import { readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "./boxes-motif.service";
import { ChainMotifService } from "./chain-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { InvalidPeriodError } from "./invalid-period.errors";
import { InvalidRepeatCountCycleError } from "./invalid-repeat-count-cycle.errors";
import { InvalidRepeatCountError } from "./invalid-repeat-count.errors";
import { InvalidRowsError } from "./invalid-rows.errors";
import {
  COMPATIBLE_MODIFIERS,
  DEFAULT_REPEAT_COUNT,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
} from "./meander-generation.constants";
import { MeanderGenerationService } from "./meander-generation.service";
import { MosaicMotifService } from "./mosaic-motif.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";
import { SvgRenderingService } from "./svg-rendering.service";
import { SwirlMotifService } from "./swirl-motif.service";
import { WhirlMotifService } from "./whirl-motif.service";

import type { MeanderType, Modifier } from "./meander-generation.types";

// 🔧 Configuration

/** One generated pattern the sweep below checks: the type, its optional modifier, and a label for the test name. */
interface PatternCase {
  readonly label: string;
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
  readonly type: MeanderType;
}

/**
 * Every {@link Modifier} one `COMPATIBLE_MODIFIERS` name stands for: a
 * parameterized modifier expands to one entry per parameter value the
 * services document, and every other name to a single entry.
 */
const modifiersNamed = (name: string): Modifier[] => {
  switch (name) {
    case "alternated": {
      return [1, 2, 3].map((period) => ({ name: "alternated", period }));
    }
    case "dot": {
      return [
        { name: "dot", shape: "bounce" },
        { name: "dot", shape: "up" },
      ];
    }
    case "edge": {
      return [{ name: "edge" }];
    }
    case "edge-flip": {
      return [{ name: "edge-flip" }];
    }
    case "flip": {
      return [{ name: "flip" }];
    }
    case "spin": {
      return [{ name: "spin" }];
    }
    case "spin-flip": {
      return [{ name: "spin-flip" }];
    }
    case "split": {
      return [{ name: "split" }];
    }
    default: {
      throw new Error(`Unknown modifier name: ${name}`);
    }
  }
};

/**
 * Every type/modifier pairing `COMPATIBLE_MODIFIERS` allows, swept over the
 * row counts each type supports, at the repeat count its modifier's own
 * cycle admits — `SPIN_CYCLE_LENGTH` for the spin family, the shared
 * default otherwise. `alternated` is swept over the periods
 * `MosaicMotifService` documents rather than the whole allowed range.
 */
const patternCases: readonly PatternCase[] = (
  ["boxes", "chain", "mosaic", "snake", "swirl", "whirl"] as const
).flatMap((type) => {
  const modifiers: readonly (Modifier | undefined)[] = [
    undefined,
    ...COMPATIBLE_MODIFIERS[type].flatMap((name) => modifiersNamed(name)),
  ];

  return modifiers.flatMap((modifier) =>
    [STRUCTURAL_MINIMUM_ROWS[type], 5, 6, 7, 8].map((rows) => ({
      label: `${type} at ${rows} rows${modifier ? ` with ${modifier.name}` : ""}`,
      repeatCount:
        modifier && SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)
          ? SPIN_CYCLE_LENGTH
          : DEFAULT_REPEAT_COUNT,
      rows,
      type,
      ...(modifier ? { modifier } : {}),
    })),
  );
});

/**
 * How far a drawn coordinate may exceed the canvas before it counts as a
 * real overshoot. `GridGeometryService.formatCoordinate` rounds every
 * coordinate to five decimal places, so at a row count whose grid unit
 * doesn't divide the canvas evenly (7 in particular) the rounded rightmost
 * coordinate can land a few millionths of a pixel past the rounded width.
 */
const roundingTolerance = 0.0001;

/**
 * The rightmost x-coordinate any path in the document draws, and the
 * rightmost the canvas can hold: the declared width less the half stroke
 * width `stroke-linecap="square"` adds past every endpoint. Both are read
 * out of the rendered document rather than recomputed, so the assertion
 * cannot drift with the geometry it is checking.
 */
const rightmostCoordinates = (
  svg: string,
): { available: number; drawn: number } => {
  const width = Number(/width="([\d.]+)"/.exec(svg)?.[1]);
  const strokeWidth = Number(/stroke-width="([\d.]+)"/.exec(svg)?.[1]);
  const xCoordinates = [...svg.matchAll(/[MH]([\d.]+)/g)].map((match) =>
    Number(match[1]),
  );

  if (
    Number.isNaN(width) ||
    Number.isNaN(strokeWidth) ||
    xCoordinates.length === 0
  ) {
    throw new Error(`Unreadable generated document: ${svg}`);
  }

  return {
    available: width - strokeWidth / 2,
    drawn: Math.max(...xCoordinates),
  };
};

// 🧪 Tests

describe(MeanderGenerationService, () => {
  let service: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderGenerationService,
        GridGeometryService,
        MosaicMotifService,
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
    it("matches the committed golden fixture for 5 rows mosaic with 12 repeats", async () => {
      const svg = service.generate({
        repeatCount: 12,
        rows: 5,
        type: "mosaic",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/mosaic-5-rows-12-repeats.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws below the structural minimum rows for mosaic", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 2, type: "mosaic" }),
      ).toThrow(InvalidRowsError);
    });

    it("matches the committed golden fixture for 5 rows mosaic with 6 repeats and alternated at period 1", async () => {
      const svg = service.generate({
        modifier: { name: "alternated", period: 1 },
        repeatCount: 6,
        rows: 5,
        type: "mosaic",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/mosaic-5-rows-6-repeats-alternated-period-1.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("matches the committed golden fixture for 5 rows mosaic with 6 repeats and alternated at period 2", async () => {
      const svg = service.generate({
        modifier: { name: "alternated", period: 2 },
        repeatCount: 6,
        rows: 5,
        type: "mosaic",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/mosaic-5-rows-6-repeats-alternated-period-2.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws when alternated's period isn't a whole number within the shared bounds", () => {
      expect(() =>
        service.generate({
          modifier: { name: "alternated", period: 0 },
          repeatCount: 6,
          rows: 5,
          type: "mosaic",
        }),
      ).toThrow(InvalidPeriodError);
    });

    it("does not require repeatCount to divide evenly by alternated's period, since each tile is self-contained", () => {
      expect(() =>
        service.generate({
          modifier: { name: "alternated", period: 4 },
          repeatCount: 6,
          rows: 5,
          type: "mosaic",
        }),
      ).not.toThrow();
    });

    it("matches the committed golden fixture for 5 rows mosaic with 12 repeats and split", async () => {
      const svg = service.generate({
        modifier: { name: "split" },
        repeatCount: 12,
        rows: 5,
        type: "mosaic",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/mosaic-5-rows-12-repeats-split.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("matches the committed golden fixture for 6 rows mosaic with 6 repeats and dot bounce", async () => {
      const svg = service.generate({
        modifier: { name: "dot", shape: "bounce" },
        repeatCount: 6,
        rows: 6,
        type: "mosaic",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/mosaic-6-rows-6-repeats-dot-bounce.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("matches the committed golden fixture for 6 rows mosaic with 6 repeats and dot up", async () => {
      const svg = service.generate({
        modifier: { name: "dot", shape: "up" },
        repeatCount: 6,
        rows: 6,
        type: "mosaic",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/mosaic-6-rows-6-repeats-dot-up.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws when dot is requested for a type that doesn't support it", () => {
      expect(() =>
        service.generate({
          modifier: { name: "dot", shape: "bounce" },
          repeatCount: 6,
          rows: 6,
          type: "boxes",
        }),
      ).toThrow(/not compatible/i);
    });

    it("throws when split is requested for a type that doesn't support it", () => {
      expect(() =>
        service.generate({
          modifier: { name: "split" },
          repeatCount: 6,
          rows: 5,
          type: "boxes",
        }),
      ).toThrow(/not compatible/i);
    });

    it("throws when alternated is requested for a type that doesn't support it", () => {
      expect(() =>
        service.generate({
          modifier: { name: "alternated", period: 1 },
          repeatCount: 6,
          rows: 5,
          type: "boxes",
        }),
      ).toThrow(/not compatible/i);
    });

    it("matches the committed golden fixture for 5 rows boxes with 6 repeats", async () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 5,
        type: "boxes",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/assets/boxes-5-rows-6-repeats.svg",
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
          "../../../testing/assets/boxes-5-rows-4-repeats-spin.svg",
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
          "../../../testing/assets/boxes-5-rows-4-repeats-spin-flip.svg",
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
          "../../../testing/assets/snake-5-rows-6-repeats.svg",
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
          "../../../testing/assets/chain-5-rows-6-repeats.svg",
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
            `../../../testing/assets/${type}-5-rows-6-repeats-edge.svg`,
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
            `../../../testing/assets/${type}-5-rows-6-repeats-flip.svg`,
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
            `../../../testing/assets/${type}-7-rows-6-repeats-flip.svg`,
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
            `../../../testing/assets/${type}-5-rows-6-repeats-edge-flip.svg`,
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
            `../../../testing/assets/${type}-5-rows-6-repeats.svg`,
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
            `../../../testing/assets/${type}-5-rows-6-repeats-flip.svg`,
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

    it.each(["swirl", "whirl"] as const)(
      "throws when a modifier isn't compatible with %s",
      (type) => {
        expect(() =>
          service.generate({
            modifier: { name: "edge" },
            repeatCount: 1,
            rows: 5,
            type,
          }),
        ).toThrow(/not compatible/i);
      },
    );
  });

  describe("border containment", () => {
    it.each(
      patternCases.map((patternCase) => [patternCase.label, patternCase]),
    )(
      "draws nothing past the declared canvas for %s",
      (_label, patternCase) => {
        const svg = service.generate({
          repeatCount: patternCase.repeatCount,
          rows: patternCase.rows,
          type: patternCase.type,
          ...(patternCase.modifier ? { modifier: patternCase.modifier } : {}),
        });
        const { available, drawn } = rightmostCoordinates(svg);

        expect(drawn).toBeLessThanOrEqual(available + roundingTolerance);
      },
    );
  });
});
