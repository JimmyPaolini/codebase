import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { COMPATIBLE_MODIFIERS } from "../meander-generation/meander-generation.constants";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";

import {
  NEGATIVE_COLUMN_MOTIFS,
  NEGATIVE_SOURCE_ROW_OFFSET,
  NEGATIVE_SOURCES_BY_MODIFIER_NAME,
  UnknownNegativeSourceError,
} from "./negative-motif.constants";
import { NegativeSourceService } from "./negative-source.service";

import type { MosaicBuildableSubFamily } from "../mosaic-motif/mosaic-motif.types";
import type {
  NegativeModifierName,
  NegativeSource,
} from "./negative-motif.types";

// 🔧 Configuration

/** One shortlisted source pattern at one row count, as `README.md` publishes it. */
interface ShortlistCase {
  readonly columns: number;
  readonly identifier: string;
  readonly rows: number;
  readonly source: NegativeSource;
}

/** One source that inverts a named `mosaic` sub-family, and the sub-family it inverts. */
interface SubFamilyCase {
  readonly source: NegativeSource;
  readonly subFamily: MosaicBuildableSubFamily;
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
 *
 * Only these three sources are shortlisted, and only these three are asserted
 * by identifier. The seven added beside them are held to
 * {@link SUB_FAMILY_CASES} and {@link NEGATIVE_COLUMN_MOTIFS} instead, both of
 * which name a builder rather than a spelling — a stronger check than an
 * identifier, and one that needs no dictionary entry to read.
 */
const SHORTLIST_CASES: readonly ShortlistCase[] = [
  { columns: 2, identifier: "044880", rows: 3, source: "stair" },
  { columns: 2, identifier: "04488408", rows: 4, source: "stair" },
  { columns: 2, identifier: "0448844880", rows: 5, source: "stair" },
  {
    columns: 2,
    identifier: "044884488408",
    rows: 6,
    source: "stair",
  },
  {
    columns: 2,
    identifier: "04488448844880",
    rows: 7,
    source: "stair",
  },
  {
    columns: 2,
    identifier: "211221",
    rows: 3,
    source: "brick-staggered",
  },
  {
    columns: 2,
    identifier: "21122112",
    rows: 4,
    source: "brick-staggered",
  },
  {
    columns: 2,
    identifier: "2112211221",
    rows: 5,
    source: "brick-staggered",
  },
  {
    columns: 2,
    identifier: "211221122112",
    rows: 6,
    source: "brick-staggered",
  },
  {
    columns: 2,
    identifier: "21122112211221",
    rows: 7,
    source: "brick-staggered",
  },
  { columns: 1, identifier: "030", rows: 3, source: "ruled" },
  { columns: 1, identifier: "0303", rows: 4, source: "ruled" },
  { columns: 1, identifier: "03030", rows: 5, source: "ruled" },
  { columns: 1, identifier: "030303", rows: 6, source: "ruled" },
  { columns: 1, identifier: "0303030", rows: 7, source: "ruled" },
];

/**
 * Every modifier the family declares, written out rather than read off
 * {@link NEGATIVE_SOURCES_BY_MODIFIER_NAME} with `Object.keys`, which widens
 * to `string`. The totality test below asserts this list against that map's
 * own keys, so it cannot drift without failing.
 */
const MODIFIER_NAMES: readonly NegativeModifierName[] = [
  "brick-staggered",
  "brick-straight",
  "brick-upright",
  "grid",
  "ruled",
  "ruled-closed",
  "ruled-raised",
  "ruled-spaced",
  "ruled-tall",
];

/** Every source the family draws. */
const SOURCES: readonly NegativeSource[] = [
  "brick-staggered",
  "brick-straight",
  "brick-upright",
  "grid",
  "ruled",
  "ruled-closed",
  "ruled-raised",
  "ruled-spaced",
  "ruled-tall",
  "stair",
];

/**
 * The four sources that invert a named `mosaic` sub-family's own aligned
 * tile, and the sub-family each inverts.
 *
 * This is what makes "the negatives of the mosaic sub-families are drawable"
 * a fact rather than a resemblance: the tile is compared against
 * {@link MosaicSubFamilyService.tile}'s own output, so a change to either
 * builder that moved them apart fails here. `brick-upright` is the one that
 * cannot hold at every row count — `diamond`'s vertical dashes cover the
 * interior in pairs and it names no tile over an odd number of levels — and
 * that gap is asserted rather than skipped.
 */
const SUB_FAMILY_CASES: readonly SubFamilyCase[] = [
  { source: "brick-straight", subFamily: "dashes" },
  { source: "brick-upright", subFamily: "diamond" },
  { source: "grid", subFamily: "dots" },
  { source: "ruled-closed", subFamily: "lines" },
];

/** Every row count the sweep draws this family at: its structural minimum through the shared maximum. */
const SWEPT_ROWS: readonly number[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * {@link SUB_FAMILY_CASES} crossed with every swept row count, split by
 * whether the sub-family names a tile at that row count at all.
 *
 * Split here rather than branched inside the assertion, because the two
 * halves are different claims: one is that the two builders agree, the other
 * that this family draws where the `mosaic` family does not. It is built
 * from directly instantiated services because `it.each` needs its table at
 * collection time, before any `beforeAll` has run — the same reason the
 * charter sweep instantiates `DrawCombinationsService` — and neither service
 * takes a dependency a container has to resolve.
 */
const [NAMED_SUB_FAMILY_CASES, UNNAMED_SUB_FAMILY_CASES] = ((): readonly [
  readonly (SubFamilyCase & { rows: number })[],
  readonly (SubFamilyCase & { rows: number })[],
] => {
  const subFamilies = new MosaicSubFamilyService(new MosaicTileService());
  const cases = SUB_FAMILY_CASES.flatMap((subFamilyCase) =>
    SWEPT_ROWS.map((rows) => ({ ...subFamilyCase, rows })),
  );
  const names = (subFamilyCase: SubFamilyCase & { rows: number }): boolean =>
    subFamilies.tile(
      subFamilyCase.subFamily,
      subFamilyCase.rows + NEGATIVE_SOURCE_ROW_OFFSET,
    ) !== undefined;

  return [
    cases.filter((one) => names(one)),
    cases.filter((one) => !names(one)),
  ];
})();

// 🧪 Tests

describe(NegativeSourceService, () => {
  let subFamilyService: MosaicSubFamilyService;
  let symmetryService: MosaicSymmetryService;
  let tileService: MosaicTileService;
  let service: NegativeSourceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MosaicSubFamilyService,
        MosaicSymmetryService,
        MosaicTileService,
        NegativeSourceService,
      ],
    }).compile();

    subFamilyService = await module.resolve(MosaicSubFamilyService);
    symmetryService = await module.resolve(MosaicSymmetryService);
    tileService = await module.resolve(MosaicTileService);
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
      "touches every point of the $source tile with at most one edge at $rows rows",
      ({ rows, source }) => {
        const tile = service.tile(source, rows);
        const touched = tile.points.flatMap((row, level) =>
          row.map((_directions, column) =>
            tileService.incidentEdges(tile, level, column),
          ),
        );

        expect(touched.filter((count) => count > 1)).toStrictEqual([]);
        expect(() => tileService.assertWellFormed(tile)).not.toThrow();
      },
    );

    it.each(NAMED_SUB_FAMILY_CASES)(
      "builds $source as the $subFamily sub-family's own tile at $rows rows",
      ({ rows, source, subFamily }) => {
        expect(service.tile(source, rows)).toStrictEqual(
          subFamilyService.tile(subFamily, rows + NEGATIVE_SOURCE_ROW_OFFSET),
        );
      },
    );

    // 🎯 `diamond` names no tile over an odd number of interior levels, and
    // this family draws at every row count regardless — closing the stack
    // with a one-level dot where a two-level dash will not fit, exactly as
    // the stair does. So the gap is asserted rather than skipped: the
    // sub-family really is absent there, and the source is really still
    // built.
    it.each(UNNAMED_SUB_FAMILY_CASES)(
      "builds $source at $rows rows where the $subFamily sub-family names no tile",
      ({ rows, source, subFamily }) => {
        const sourceRows = rows + NEGATIVE_SOURCE_ROW_OFFSET;

        expect(subFamilyService.tile(subFamily, sourceRows)).toBeUndefined();
        expect(service.tile(source, rows).rows).toBe(sourceRows);
      },
    );

    // 🎯 The phase pair. At an even row count the interior holds a whole
    // number of `dot`/`line` periods, so raising the rule only re-phases the
    // same symmetry class — the drawing differs, the class does not. At an
    // odd one the two carry different numbers of openings outright, which is
    // the whole reason the modifier exists and why its branching counts in
    // `negative-motif.service.unit.test.ts` differ from `ruled`'s there and
    // not here.
    it.each(SWEPT_ROWS)(
      "phases ruled-raised against ruled at %i rows",
      (rows) => {
        const raised = symmetryService.canonicalIdentifier(
          service.tile("ruled-raised", rows),
        );
        const ruled = symmetryService.canonicalIdentifier(
          service.tile("ruled", rows),
        );

        expect(raised === ruled).toBe(rows % 2 === 0);
      },
    );

    it.each(
      SOURCES.flatMap((source) => SWEPT_ROWS.map((rows) => ({ rows, source }))),
    )(
      "builds $source at $rows rows across the column span its motif needs",
      ({ rows, source }) => {
        const tile = service.tile(source, rows);

        expect(tile.columns).toBe(
          Object.hasOwn(NEGATIVE_COLUMN_MOTIFS, source) ? 1 : 2,
        );
        expect(tile.rows).toBe(rows + NEGATIVE_SOURCE_ROW_OFFSET);
      },
    );
  });

  describe("source", () => {
    it.each([
      { expected: "stair", modifier: undefined },
      ...MODIFIER_NAMES.map((name) => ({ expected: name, modifier: { name } })),
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
      const mapped = Object.keys(NEGATIVE_SOURCES_BY_MODIFIER_NAME).toSorted();

      expect(mapped).toStrictEqual(
        [...COMPATIBLE_MODIFIERS.negative].toSorted(),
      );
      expect(mapped).toStrictEqual([...MODIFIER_NAMES].toSorted());
    });

    // 🎯 Every source but `stair` is selected by a modifier of the same name,
    // and `stair` by no modifier at all. Stated as an assertion because it is
    // what lets a reader treat the two vocabularies as one — and because a
    // source added without a modifier would otherwise be unreachable from the
    // command line and never appear in the sweep.
    it("names every source but the default after the modifier that selects it", () => {
      expect([
        ...[
          ...new Set(Object.values(NEGATIVE_SOURCES_BY_MODIFIER_NAME)),
        ].toSorted(),
        "stair",
      ]).toStrictEqual([...SOURCES]);
    });
  });
});
