// cspell:ignore dvvxxd dvvxxvdx dvvxxvvxxd dvvxxvvxxvdx dvvxxvvxxvvxxd
// cspell:ignore hxxhhx hxxhhxxh hxxhhxxhhx hxxhhxxhhxxh hxxhhxxhhxxhhx
// cspell:ignore dld dldl dldld dldldl dldldld
// — mosaic tile identifiers, one letter per cell of the tile, from
// MOSAIC_MARK_LETTERS in src/modules/mosaic-motif/mosaic-motif.constants.ts.
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { COMPATIBLE_MODIFIERS } from "../meander-generation/meander-generation.constants";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";

import {
  NEGATIVE_SOURCES_BY_MODIFIER_NAME,
  UnknownNegativeSourceError,
} from "./negative-motif.constants";
import { NegativeSourceService } from "./negative-source.service";

import type { NegativeSource } from "./negative-motif.types";

// 🔧 Configuration

/** One shortlisted source pattern at one row count, as `README.md` publishes it. */
interface ShortlistCase {
  readonly columns: number;
  readonly identifier: string;
  readonly rows: number;
  readonly source: NegativeSource;
}

/**
 * The negative-space survey's shortlist, copied from the
 * `## 🕳️ Negative Space Survey` section of `applications/meanderaw/README.md`
 * verbatim.
 *
 * This is the whole point of the file. #415's second acceptance criterion is
 * that the candidates drawn come from that shortlist rather than being chosen
 * here, and the shortlist is prose — so the only thing that can hold the two
 * together is an assertion. `rows` is the **negative's** row count; the source
 * tile is built one row taller, so these cover the survey's own source rows 4
 * through 8.
 */
const SHORTLIST_CASES: readonly ShortlistCase[] = [
  { columns: 2, identifier: "dvvxxd", rows: 3, source: "stair" },
  { columns: 2, identifier: "dvvxxvdx", rows: 4, source: "stair" },
  { columns: 2, identifier: "dvvxxvvxxd", rows: 5, source: "stair" },
  { columns: 2, identifier: "dvvxxvvxxvdx", rows: 6, source: "stair" },
  { columns: 2, identifier: "dvvxxvvxxvvxxd", rows: 7, source: "stair" },
  { columns: 2, identifier: "hxxhhx", rows: 3, source: "brick" },
  { columns: 2, identifier: "hxxhhxxh", rows: 4, source: "brick" },
  { columns: 2, identifier: "hxxhhxxhhx", rows: 5, source: "brick" },
  { columns: 2, identifier: "hxxhhxxhhxxh", rows: 6, source: "brick" },
  { columns: 2, identifier: "hxxhhxxhhxxhhx", rows: 7, source: "brick" },
  { columns: 1, identifier: "dld", rows: 3, source: "ruled" },
  { columns: 1, identifier: "dldl", rows: 4, source: "ruled" },
  { columns: 1, identifier: "dldld", rows: 5, source: "ruled" },
  { columns: 1, identifier: "dldldl", rows: 6, source: "ruled" },
  { columns: 1, identifier: "dldldld", rows: 7, source: "ruled" },
];

/** Every source the family draws, and every row count the sweep covers for it. */
const SWEPT_ROWS: readonly number[] = [3, 4, 5, 6, 7, 8];

/** Every source the family draws. */
const SOURCES: readonly NegativeSource[] = ["brick", "ruled", "stair"];

// 🧪 Tests

describe(NegativeSourceService, () => {
  let symmetryService: MosaicSymmetryService;
  let service: NegativeSourceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MosaicSymmetryService, NegativeSourceService],
    }).compile();

    symmetryService = await module.resolve(MosaicSymmetryService);
    service = await module.resolve(NegativeSourceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("tile", () => {
    it.each(SHORTLIST_CASES)(
      "builds the shortlisted $source tile $identifier at $rows rows",
      ({ columns, identifier, rows, source }) => {
        const tile = service.tile(source, rows);

        expect({
          columns: tile.columns,
          identifier: symmetryService.identify(tile),
          rows: tile.rows,
        }).toStrictEqual({ columns, identifier, rows: rows + 1 });
      },
    );

    // 🎯 `identify` names the tile as built; `canonicalIdentifier` names its
    // whole symmetry class. Asserting they agree is what makes the tile above
    // the very one the permutation sweep committed under that name in
    // `output/mosaic/<rows>-rows/permutations/`, rather than a mirror or a
    // re-phasing of it that would draw the same wallpaper but terminate its
    // band differently.
    it.each(SHORTLIST_CASES)(
      "builds $identifier as its own symmetry class's canonical representative",
      ({ identifier, rows, source }) => {
        const tile = service.tile(source, rows);

        expect(symmetryService.canonicalIdentifier(tile)).toBe(identifier);
      },
    );

    it.each(
      SOURCES.flatMap((source) => SWEPT_ROWS.map((rows) => ({ rows, source }))),
    )(
      "covers every cell of the $source tile exactly once at $rows rows",
      ({ rows, source }) => {
        const tile = service.tile(source, rows);
        const claims = Array.from(
          { length: tile.columns * (tile.rows - 1) },
          () => 0,
        );

        for (const piece of tile.pieces) {
          for (const cell of symmetryService.coveredCells(
            piece,
            tile.columns,
          )) {
            claims[cell] = (claims[cell] ?? 0) + 1;
          }
        }

        expect(claims.filter((count) => count !== 1)).toStrictEqual([]);
      },
    );
  });

  describe("source", () => {
    it.each([
      { expected: "stair", modifier: undefined },
      { expected: "brick", modifier: { name: "brick" } as const },
      { expected: "ruled", modifier: { name: "ruled" } as const },
    ])("selects $expected", ({ expected, modifier }) => {
      expect(service.source(modifier)).toBe(expected);
    });

    // 🎯 `MeanderGenerationService` rejects an incompatible modifier before
    // any motif service sees it, so this is unreachable through `generate`.
    // It is asserted anyway because the alternative — answering "no modifier"
    // to a modifier the family does not recognize — would draw the default
    // source silently, and read as the family ignoring a flag.
    it("refuses a modifier the family does not draw a source for", () => {
      expect(() => service.source({ name: "flip" })).toThrow(
        UnknownNegativeSourceError,
      );
    });

    // 🎯 The dispatch is total over `NegativeModifierName`, which is a
    // hand-written union rather than something derived from
    // `COMPATIBLE_MODIFIERS`. Nothing but this assertion stops the two
    // drifting: a modifier declared compatible but never mapped would be
    // accepted by `generate` and then refused by the family it was declared
    // for, and a name mapped here but never declared would be unreachable.
    it("draws a source for exactly the modifiers the family declares compatible", () => {
      expect(
        Object.keys(NEGATIVE_SOURCES_BY_MODIFIER_NAME).toSorted(),
      ).toStrictEqual([...COMPATIBLE_MODIFIERS.negative].toSorted());
    });
  });
});
