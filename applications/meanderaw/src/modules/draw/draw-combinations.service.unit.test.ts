import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  MAXIMUM_VALUE,
  STRUCTURAL_MINIMUM_ROWS,
} from "../meander-generation/meander-generation.constants";
import { DEFAULT_PARALLEL_STRANDS } from "../parallel-motif/parallel-motif.constants";

import { DrawCombinationsService } from "./draw-combinations.service";

import type { GenerationParameters } from "../meander-generation/meander-generation.types";

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
      providers: [DrawCombinationsService],
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
      // rows 3..12 × (none + alternated ×2 + dot ×2 + split)
      { expected: 60, type: "mosaic" },
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
      // rows 3..12 × (none + brick + ruled)
      { expected: 30, type: "negative" },
      // rows 2..12 × (none + rung + stagger)
      { expected: 33, type: "branch" },
      // rows 2..12 × (none + plied over every ply 1..rows less the
      // skipped default + aligned over 1..rows + serpentine over 1..rows),
      // which is 1 + (rows - 1) + rows + rows = 3 × rows at each row count
      { expected: 231, type: "parallel" },
    ])("enumerates $expected combinations for $type", ({ expected, type }) => {
      expect(
        combinations.filter((parameters) => parameters.type === type),
      ).toHaveLength(expected);
    });

    it("enumerates the whole named-type space and nothing beyond it", () => {
      expect(combinations).toHaveLength(506);
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

    // 🎯 The one hole in that range, asserted rather than described. `plied`
    // naming the family's own default ply renders a document byte-identical
    // to the unmodified drawing beside it, so sweeping it would commit the
    // same bytes twice under two filenames.
    it("skips the ply that would duplicate the unmodified drawing", () => {
      const strandCounts = combinations.flatMap((parameters) =>
        parameters.modifier?.name === "plied"
          ? [parameters.modifier.strands]
          : [],
      );

      expect(strandCounts).not.toContain(DEFAULT_PARALLEL_STRANDS);
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
    // rows up in every family.
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

      expect(sweptPairs).toHaveLength(56);
      expect(beyondMaximum).toHaveLength(36);
    });

    // 🎯 The two ends of the row range, on two types with different
    // structural minima: each starts at its own, and both stop at the one
    // number the command line stops at. The upper bound is read from
    // `MAXIMUM_VALUE` rather than written out, because the whole point of
    // the range is that it is not a figure of the sweep's own choosing —
    // issue #507 was reachable precisely because it once was.
    it("sweeps each type from its own structural minimum through the row count the command line stops at", () => {
      const rowsFor = (type: string): number[] => [
        ...new Set(
          combinations
            .filter((parameters) => parameters.type === type)
            .map((parameters) => parameters.rows),
        ),
      ];
      const throughMaximum = (minimum: number): number[] =>
        Array.from(
          { length: MAXIMUM_VALUE - minimum + 1 },
          (_value, index) => minimum + index,
        );

      expect(rowsFor("mosaic")).toStrictEqual(
        throughMaximum(STRUCTURAL_MINIMUM_ROWS.mosaic),
      );
      expect(rowsFor("swirl")).toStrictEqual(
        throughMaximum(STRUCTURAL_MINIMUM_ROWS.swirl),
      );
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
