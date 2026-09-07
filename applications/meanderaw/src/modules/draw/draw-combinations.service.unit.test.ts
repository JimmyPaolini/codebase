import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  FAMILY_MAXIMUM_ROWS,
  MAXIMUM_VALUE,
  STRUCTURAL_MINIMUM_ROWS,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { DEFAULT_PARALLEL_STRANDS } from "../parallel-motif/parallel-motif.constants";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";

import { DrawCombinationsService } from "./draw-combinations.service";

import type {
  GenerationParameters,
  MeanderType,
} from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/**
 * The ply the discarded `strokeWidth = unit / (2N)` proposal is judged at:
 * the `parallel` family's own default, and the one "drawn with double
 * lines" means. See README.md, "Nothing gets thinner".
 */
const DISCARDED_DENSITY_PLY = 2;

/** The six families that predate `cross`, `negative`, `branch`, and `parallel`. */
const ORIGINAL_FAMILIES = new Set([
  "boxes",
  "chain",
  "mosaic",
  "snake",
  "swirl",
  "whirl",
]);

describe(DrawCombinationsService, () => {
  let service: DrawCombinationsService;
  let combinations: GenerationParameters[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCombinationsService,
        GridGeometryService,
        ParallelSerpentineService,
      ],
    }).compile();

    service = await module.resolve(DrawCombinationsService);
    combinations = service.enumerate();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("enumerate", () => {
    // 🎯 The size of the enumerated space, stated once. Both callers depend
    // on it: `DrawCommand` writes one file per combination, and the meander
    // charter's property test asserts the charter of each. A sweep that
    // silently shrank — a renamed constant, a type guard that stopped
    // matching — would leave both quietly covering less, so it is pinned
    // here rather than inferred at either call site.
    it.each([
      // rows 3..6 × (none + alternated ×2 + dot ×2 + split). Four row
      // counts where every other family gets nine or ten, because this is
      // the family `FAMILY_MAXIMUM_ROWS` stops early — see
      // `MOSAIC_TILE_MAXIMUM_ROWS` for why an exhaustively enumerated
      // family cannot follow the sampled ones to 12.
      { expected: 24, type: "mosaic" },
      // rows 3..12 × (none + spin + spin-flip)
      { expected: 30, type: "boxes" },
      // rows 4..12 × (none + edge + flip + edge-flip)
      { expected: 36, type: "chain" },
      { expected: 36, type: "snake" },
      // rows 4..12 × (none + flip)
      { expected: 18, type: "swirl" },
      { expected: 18, type: "whirl" },
      // rows 6..12 × (none + interrupted)
      { expected: 14, type: "cross" },
      // rows 3..12 × (none + the nine sources the family names)
      { expected: 100, type: "negative" },
      // rows 2..12 × (none + comb up + rung ×2 + stagger ×4)
      { expected: 88, type: "branch" },
      // rows 2..12 × (plied over every ply 1..rows + aligned over the same
      // + serpentine over every distinct rotation and flip of each). The
      // family has no unmodified entry — `plied` names that drawing — and
      // serpentine's variant count is not a multiplication, since rotations
      // of an even partition, flips that name the same ribbon, and flips
      // that land on a strip with no depth all collapse.
      { expected: 819, type: "parallel" },
    ])("enumerates $expected combinations for $type", ({ expected, type }) => {
      expect(
        combinations.filter((parameters) => parameters.type === type),
      ).toHaveLength(expected);
    });

    it("enumerates the whole named-type space and nothing beyond it", () => {
      expect(combinations).toHaveLength(1183);
    });

    it("names every combination distinctly", () => {
      const keys = combinations.map((parameters) => JSON.stringify(parameters));

      expect(new Set(keys).size).toBe(combinations.length);
    });

    // 🎯 The sweep's `plied` range is the row count's, so this asserts the
    // property the old pinned-constants test stood in for, and asserts it of
    // every combination rather than of one number. A bundle of N strands
    // needs N rows, and `MeanderGenerationService.generate` refuses one that
    // does not have them — so a sweep that enumerated such a combination
    // would fail the charter sweep downstream with a thrown error rather
    // than a measurement. This fails first, and says why.
    it("never sweeps a ply deeper than the row count it is drawn at", () => {
      const plied = combinations.filter(
        (parameters) => parameters.modifier?.name === "plied",
      );

      expect(plied.length).toBeGreaterThan(0);

      for (const parameters of plied) {
        const { modifier, rows } = parameters;

        if (modifier?.name !== "plied") {
          continue;
        }

        expect(modifier.strands).toBeLessThanOrEqual(rows);
        expect(modifier.strands).toBeGreaterThanOrEqual(1);
      }
    });

    // 🎯 The range has no hole in it, and the family has no unmodified
    // entry — the two facts are one change. `parallel` drawn with no
    // modifier is a two-strand `plied` bundle, so the sweep used to commit
    // it as `plain-…svg` and skip the ply that would have duplicated it.
    // Dropping the unmodified entry instead lets `plied` carry that drawing
    // under a name its siblings share, which is what makes every parallel
    // filename readable as a ply.
    it("names every parallel drawing for its ply rather than committing an unmodified one", () => {
      const parallel = combinations.filter(({ type }) => type === "parallel");
      const strandCounts = parallel.flatMap((parameters) =>
        parameters.modifier?.name === "plied"
          ? [parameters.modifier.strands]
          : [],
      );

      expect(parallel).not.toHaveLength(0);
      expect(parallel.every(({ modifier }) => modifier !== undefined)).toBe(
        true,
      );
      expect(strandCounts).toContain(DEFAULT_PARALLEL_STRANDS);
    });

    // 🎯 Every other family keeps its unmodified entry, so dropping one is
    // a decision about `parallel` rather than a change to the sweep.
    it("still sweeps an unmodified drawing for every other family", () => {
      const unmodified = new Set(
        combinations
          .filter(({ modifier }) => modifier === undefined)
          .map(({ type }) => type),
      );

      expect([...unmodified].toSorted()).toStrictEqual(
        SUPPORTED_TYPES.filter((type) => type !== "parallel").toSorted(),
      );
    });

    // 🎯 The deepest ply the sweep reaches is the deepest the command line
    // accepts, which is what "every drawing the command line can be asked
    // for is a drawing this repository commits" means for this family's
    // second axis. A flat list could not say this.
    it("sweeps the family's whole ply range, up to the deepest row count", () => {
      const strandCounts = new Set(
        combinations.flatMap((parameters) =>
          parameters.modifier?.name === "plied"
            ? [parameters.modifier.strands]
            : [],
        ),
      );

      expect(Math.max(...strandCounts)).toBe(MAXIMUM_VALUE);
      expect(Math.min(...strandCounts)).toBe(1);
    });

    // 🎯 The two figures README.md's discarded-density argument rests on,
    // pinned to the sweep they describe instead of counted by hand.
    //
    // "The 56 combinations the sweep would want" are the six original
    // families' distinct family/rows pairs — the space a
    // `strokeWidth = unit / (2N)` proposal would have had to cover. That
    // proposal redraws a pattern at `rows × N` rows, so at the `parallel`
    // family's own ply of two every pair is asked for at `rows × 2`, and
    // `beyondMaximum` is the pairs whose doubled row count no longer fits
    // inside the shared `MAXIMUM_VALUE` — 36 of them, every pair from 7
    // rows up in every family that reaches them — which `mosaic` no longer
    // does, its own ceiling being 6.
    //
    // That count was 8 until issue #507 was fixed, on a stricter criterion
    // that no longer applies: four of those eight sat *inside* the maximum,
    // so degeneracy rather than the ceiling was what ruled the proposal out.
    // README.md, "Nothing gets thinner", keeps that history. The ceiling is
    // the whole of the argument now, and 12 is the number it rests on.
    it("pins the density proposal's reach over the six original families", () => {
      const sweptPairs = [
        ...new Map(
          combinations
            .filter((parameters) => ORIGINAL_FAMILIES.has(parameters.type))
            .map((parameters) => [
              `${parameters.type}-${parameters.rows}`,
              parameters,
            ]),
        ).values(),
      ];
      const beyondMaximum = sweptPairs.filter(
        ({ rows }) => rows * DISCARDED_DENSITY_PLY > MAXIMUM_VALUE,
      );

      expect(sweptPairs).toHaveLength(50);
      expect(beyondMaximum).toHaveLength(30);
    });

    // 🎯 Both ends of the row range, on two types that share neither: each
    // starts at its own `STRUCTURAL_MINIMUM_ROWS` and stops at its own
    // `FAMILY_MAXIMUM_ROWS`. Both bounds are read from the constants rather
    // than written out, because the whole point of the range is that it is
    // not a figure of the sweep's own choosing — issue #507 was reachable
    // precisely because it once was, and the command line validates against
    // these same two records.
    //
    // `mosaic` is the one family whose ceiling is not the shared
    // `MAXIMUM_VALUE`, and `swirl` stands for the nine whose is, so the two
    // together say that the exception is an exception.
    it("sweeps each type from its own structural minimum through its own family maximum", () => {
      const rowsFor = (type: MeanderType): number[] => [
        ...new Set(
          combinations
            .filter((parameters) => parameters.type === type)
            .map((parameters) => parameters.rows),
        ),
      ];
      const declaredRange = (type: MeanderType): number[] => {
        const minimum = STRUCTURAL_MINIMUM_ROWS[type];

        return Array.from(
          { length: FAMILY_MAXIMUM_ROWS[type] - minimum + 1 },
          (_value, index) => minimum + index,
        );
      };

      expect(rowsFor("mosaic")).toStrictEqual(declaredRange("mosaic"));
      expect(rowsFor("swirl")).toStrictEqual(declaredRange("swirl"));
      expect(rowsFor("mosaic").at(-1)).toBeLessThan(MAXIMUM_VALUE);
      expect(rowsFor("swirl").at(-1)).toBe(MAXIMUM_VALUE);
    });

    it.each([
      {
        expected: { repeatCount: 6, rows: 3, type: "mosaic" },
        label: "an unmodified combination at the default repeat count",
      },
      {
        expected: {
          modifier: { name: "spin" },
          repeatCount: 8,
          rows: 3,
          type: "boxes",
        },
        label: "the spin family rounded up to a whole rotation cycle",
      },
      {
        expected: {
          modifier: { name: "alternated", period: 3 },
          repeatCount: 6,
          rows: 5,
          type: "mosaic",
        },
        label: "each representative period of a parameterized modifier",
      },
      {
        expected: {
          modifier: { name: "dot", shape: "up" },
          repeatCount: 6,
          rows: 6,
          type: "mosaic",
        },
        label: "each representative shape of a parameterized modifier",
      },
      {
        expected: {
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 4,
          type: "chain",
        },
        label: "a composed modifier of a non-mosaic family",
      },
    ])("includes $label", ({ expected }) => {
      expect(combinations).toContainEqual(expected);
    });
  });
});
