import { readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  COORDINATE_ROUNDING_TOLERANCE,
  retracesItself,
} from "../../../testing/path-data";
import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import {
  COMB_SWEEP_UPWARD_VALUES,
  RUNG_SWEEP_LEFTWARD_VALUES,
  STAGGER_SWEEP_BRANCH_COUNTS,
} from "../draw/draw.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import {
  COMPATIBLE_MODIFIERS,
  ConflictingSubFamilyError,
  DEFAULT_REPEAT_COUNT,
  InvalidOffsetError,
  InvalidPeriodError,
  InvalidRepeatCountCycleError,
  InvalidRepeatCountError,
  InvalidRowsError,
  InvalidStrandCountError,
  InvalidSubFamilyError,
  MAXIMUM_VALUE,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
  SUPPORTED_TYPES,
  UnavailableSubFamilyError,
} from "./meander-generation.constants";
import { MeanderGenerationService } from "./meander-generation.service";
import { MotifRegistryService } from "./motif-registry.service";

import type {
  MeanderType,
  Modifier,
  PlyModifierName,
} from "./meander-generation.types";

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
 * One ply-carrying modifier, built without an assertion.
 *
 * The switch is what makes it type-safe: each arm narrows `name` to a single
 * literal, so the object literal is checked against that member of
 * {@link Modifier} rather than cast into it. A ply-carrying member added to
 * the union fails to compile here until it is handled.
 */
const plyModifier = (name: PlyModifierName, strands: number): Modifier => {
  switch (name) {
    case "aligned": {
      return { name, strands };
    }
    case "plied": {
      return { name, strands };
    }
    case "serpentine": {
      return { name, strands };
    }
  }
};

/** Every ply-carrying modifier crossed with `strandCounts`, as `it.each` rows. */
const plyCases = (strandCounts: readonly number[]): { modifier: Modifier }[] =>
  (["aligned", "plied", "serpentine"] satisfies PlyModifierName[]).flatMap(
    (name) =>
      strandCounts.map((strands) => ({ modifier: plyModifier(name, strands) })),
  );

/**
 * The plies this suite sweeps every ply-carrying modifier over.
 *
 * Three representative points rather than the whole range: one at the floor,
 * one at the family's own default, and one above it. This suite sweeps row
 * counts as low as 4, and the range's top is the row count, so a whole-range
 * sweep here would mean a different set per row — which is
 * `DrawCombinationsService`'s job and is gated in its own suite. What this
 * one needs is only that each modifier is exercised at more than one ply.
 */
const PLY_SWEEP_STRAND_COUNTS: readonly number[] = [1, 2, 3];

/**
 * Every {@link Modifier} one `COMPATIBLE_MODIFIERS` name stands for: a
 * parameterized modifier expands to one entry per parameter value the
 * services document, and every other name to a single entry.
 */
const modifiersNamed = (name: string): Modifier[] => {
  switch (name) {
    case "aligned": {
      return PLY_SWEEP_STRAND_COUNTS.map((strands) => ({
        name: "aligned",
        strands,
      }));
    }
    case "alternated": {
      return [1, 2, 3].map((period) => ({ name: "alternated", period }));
    }
    case "brick-staggered": {
      return [{ name: "brick-staggered" }];
    }
    case "brick-straight": {
      return [{ name: "brick-straight" }];
    }
    case "brick-upright": {
      return [{ name: "brick-upright" }];
    }
    case "comb": {
      return COMB_SWEEP_UPWARD_VALUES.map((isUpward) => ({
        isUpward,
        name: "comb",
      }));
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
    case "grid": {
      return [{ name: "grid" }];
    }
    case "interrupted": {
      return [{ name: "interrupted" }];
    }
    case "plied": {
      return PLY_SWEEP_STRAND_COUNTS.map((strands) => ({
        name: "plied",
        strands,
      }));
    }
    case "ruled": {
      return [{ name: "ruled" }];
    }
    case "ruled-closed": {
      return [{ name: "ruled-closed" }];
    }
    case "ruled-raised": {
      return [{ name: "ruled-raised" }];
    }
    case "ruled-spaced": {
      return [{ name: "ruled-spaced" }];
    }
    case "ruled-tall": {
      return [{ name: "ruled-tall" }];
    }
    case "rung": {
      return RUNG_SWEEP_LEFTWARD_VALUES.map((isLeftward) => ({
        isLeftward,
        name: "rung",
      }));
    }
    case "serpentine": {
      return PLY_SWEEP_STRAND_COUNTS.map((strands) => ({
        name: "serpentine",
        strands,
      }));
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
    case "stagger": {
      return STAGGER_SWEEP_BRANCH_COUNTS.map((branches) => ({
        branches,
        name: "stagger",
      }));
    }
    default: {
      throw new Error(`Unknown modifier name: ${name}`);
    }
  }
};

/**
 * Every family the sweep below draws. Kept as its own literal rather than
 * derived from {@link SUPPORTED_TYPES}, which is widened to `string` for the
 * CLI boundary — "every family is enrolled" is then a claim the suite can
 * fail on instead of one the types quietly satisfy. The `border containment`
 * block asserts this list against `SUPPORTED_TYPES`, so a family added there
 * and not here fails rather than going unswept.
 */
const sweptTypes: readonly MeanderType[] = [
  "boxes",
  "branch",
  "chain",
  "cross",
  "mosaic",
  "negative",
  "parallel",
  "snake",
  "swirl",
  "whirl",
];

/**
 * Every type/modifier pairing `COMPATIBLE_MODIFIERS` allows, swept over the
 * row counts each type supports, at the repeat count its modifier's own
 * cycle admits — `SPIN_CYCLE_LENGTH` for the spin family, the shared
 * default otherwise. `alternated` is swept over the periods
 * `MosaicMotifService` documents rather than the whole allowed range, and
 * `comb`, `rung`, and `stagger` over the sweep's own constants, and every
 * ply-carrying modifier over {@link PLY_SWEEP_STRAND_COUNTS}, for the same
 * reason.
 */
const patternCases: readonly PatternCase[] = sweptTypes.flatMap((type) => {
  const modifiers: readonly (Modifier | undefined)[] = [
    undefined,
    ...COMPATIBLE_MODIFIERS[type].flatMap((name) => modifiersNamed(name)),
  ];

  return modifiers.flatMap((modifier) =>
    [
      ...new Set(
        [STRUCTURAL_MINIMUM_ROWS[type], 5, 6, 7, 8].filter(
          (rows) => rows >= STRUCTURAL_MINIMUM_ROWS[type],
        ),
      ),
    ]
      // 🎯 A ply is bounded by the drawing's own row count, not by a
      // constant, so the two axes are not independent and their cross
      // product is not the swept space. `parallel` starts at 2 rows, where
      // only a one-strand ply exists — asking for three there is a
      // combination `generate` refuses by design, and sweeping it would
      // fail this suite on its own validation rather than on anything it
      // set out to measure.
      .filter(
        (rows) =>
          modifier === undefined ||
          !("strands" in modifier) ||
          modifier.strands <= rows,
      )
      .map((rows) => ({
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
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        BoxesMotifService,
        BranchMotifService,
        ChainMotifService,
        CrossMotifService,
        MotifRegistryService,
        MotifTransformsService,
        NegativeMotifService,
        NegativeSourceService,
        ParallelMotifService,
        ParallelSerpentineService,
        ParallelSerpentineService,
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

    // 🎯 `cross` stops at 6 rather than the 4 its solid mode alone would
    // allow. Why it does is pinned in `cross-motif.service.unit.test.ts`,
    // against the geometry rather than against the constant.
    it("throws below the structural minimum rows for cross", () => {
      expect(() =>
        service.generate({ repeatCount: 6, rows: 5, type: "cross" }),
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

    // 🎯 The ply bound is the drawing's own row count rather than the shared
    // maximum, so its upper edge is pinned against the same row count the
    // drawing has: one ply past it is refused and the ply that equals it is
    // drawn. A bound read off `MAXIMUM_VALUE` instead would accept both.
    //
    // Its lower edge is `MINIMUM_STRANDS`, which is 1 — so 0 is refused and
    // 1 is not. A single-strand ply used to be refused here too, on the
    // argument that a family named for parallel strands needs two of them;
    // that argument was about the name rather than the geometry, and the
    // constant's own doc comment now says so.
    //
    // Swept over all three ply-carrying modifiers rather than `plied` alone,
    // because the bound is a property of the count and not of the shape the
    // count is drawn as.
    it.each(plyCases([0, 2.5, 6]))(
      "throws when $modifier.name's strand count is $modifier.strands at 5 rows",
      ({ modifier }) => {
        expect(() =>
          service.generate({
            modifier,
            repeatCount: 6,
            rows: 5,
            type: "parallel",
          }),
        ).toThrow(InvalidStrandCountError);
      },
    );

    it.each(plyCases([1, 5]))(
      "draws $modifier.name at a strand count of $modifier.strands, both edges of the bound",
      ({ modifier }) => {
        expect(() =>
          service.generate({
            modifier,
            repeatCount: 6,
            rows: 5,
            type: "parallel",
          }),
        ).not.toThrow();
      },
    );

    // 🎯 The offset rotates a cyclic sequence of `strands` places, so
    // rotating `strands` is rotating none. Every value outside
    // `0 … strands - 1` therefore names a drawing already reachable from
    // inside it, and is refused rather than folded — a caller that meant
    // something else finds out instead of silently getting the drawing they
    // did not ask for.
    it.each([{ offset: -1 }, { offset: 1.5 }, { offset: 3 }])(
      "throws when serpentine's offset is $offset at 3 strands",
      ({ offset }) => {
        expect(() =>
          service.generate({
            modifier: { name: "serpentine", offset, strands: 3 },
            repeatCount: 6,
            rows: 5,
            type: "parallel",
          }),
        ).toThrow(InvalidOffsetError);
      },
    );

    it.each([{ offset: 0 }, { offset: 2 }])(
      "draws a serpentine at an offset of $offset, both edges of the bound",
      ({ offset }) => {
        expect(() =>
          service.generate({
            modifier: { name: "serpentine", offset, strands: 3 },
            repeatCount: 6,
            rows: 5,
            type: "parallel",
          }),
        ).not.toThrow();
      },
    );

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

    it("draws the diamond sub-family exactly as the split modifier does, two routes to one shape", async () => {
      const svg = service.generate({
        repeatCount: 12,
        rows: 5,
        subFamily: "diamond",
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

    it("draws the dots sub-family as marks with no length at all, on the canvas its tile reaches", () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 6,
        subFamily: "dots",
        type: "mosaic",
      });

      expect(svg).toContain('width="55"');
      expect(svg).not.toMatch(/V\d/);
    });

    it("draws the lines sub-family a grid unit wider, since its rule reaches into the next tile", () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 6,
        subFamily: "lines",
        type: "mosaic",
      });

      expect(svg).toContain('width="65"');
    });

    it("draws the dashes sub-family sideways only, and the diamond sub-family downward", () => {
      const dashes = service.generate({
        repeatCount: 6,
        rows: 6,
        subFamily: "dashes",
        type: "mosaic",
      });
      const diamond = service.generate({
        repeatCount: 6,
        rows: 5,
        subFamily: "diamond",
        type: "mosaic",
      });

      expect(dashes).not.toMatch(/V\d/);
      expect(diamond).toMatch(/V\d/);
    });

    it("throws when a sub-family is asked of a family whose unit space is latent", () => {
      expect(() =>
        service.generate({
          repeatCount: 6,
          rows: 5,
          subFamily: "dots",
          type: "boxes",
        }),
      ).toThrow(InvalidSubFamilyError);
    });

    it("throws when a sub-family and a modifier are asked for together, since both choose the unit", () => {
      expect(() =>
        service.generate({
          modifier: { name: "split" },
          repeatCount: 6,
          rows: 5,
          subFamily: "dots",
          type: "mosaic",
        }),
      ).toThrow(ConflictingSubFamilyError);
    });

    it("throws when the sub-family names no tile at the requested row count", () => {
      expect(() =>
        service.generate({
          repeatCount: 6,
          rows: 6,
          subFamily: "diamond",
          type: "mosaic",
        }),
      ).toThrow(UnavailableSubFamilyError);
    });

    it("throws below the row count a mosaic tile needs, even for a sub-family that exists there", () => {
      expect(() =>
        service.generate({
          repeatCount: 6,
          rows: 3,
          subFamily: "dots",
          type: "mosaic",
        }),
      ).toThrow(InvalidRowsError);
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

  // 🎯 Issue #507, measured rather than described. `chain` and `snake`
  // share one zigzag sequence, and it used to double back above eight rows:
  // two consecutive runs along the same axis, a second stroke of ink laid
  // over one already drawn. The gap that hid it was between two numbers: the
  // sweep stopped at 8 row counts while `MAXIMUM_VALUE` let the command line
  // ask for 12. Both are 12 now, and this sweeps every family rather than
  // the six that existed when the defect was found.
  //
  // This is deliberately a rendered measurement. A drawing that *emits*
  // proves nothing here — every family emitted at every row count through
  // 12 while the defect was live, and reading that as "it works" is exactly
  // how the wrong cause reached the README. The defect was in what the path
  // said, not in whether there was one.
  describe("every row count the command line accepts", () => {
    it("lays no ink back over ink, in any family", () => {
      const retracing = sweptTypes.flatMap((type) =>
        Array.from(
          { length: MAXIMUM_VALUE - STRUCTURAL_MINIMUM_ROWS[type] + 1 },
          (_, offset) => STRUCTURAL_MINIMUM_ROWS[type] + offset,
        )
          .filter((rows) =>
            retracesItself(
              service.generate({
                repeatCount: DEFAULT_REPEAT_COUNT,
                rows,
                type,
              }),
            ),
          )
          .map((rows) => `${type} at ${rows} rows`),
      );

      expect(retracing).toStrictEqual([]);
    });
  });

  describe("border containment", () => {
    it("sweeps every supported family", () => {
      const swept = [
        ...new Set(patternCases.map((patternCase) => patternCase.type)),
      ].toSorted();

      expect(swept).toStrictEqual([...SUPPORTED_TYPES].toSorted());
    });

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

        expect(drawn).toBeLessThanOrEqual(
          available + COORDINATE_ROUNDING_TOLERANCE,
        );
      },
    );
  });
});
