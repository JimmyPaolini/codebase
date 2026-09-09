import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { isMotifDrawnType } from "../meander-generation/meander-generation.utilities";
import { MotifPitchService } from "../meander-generation/motif-pitch.service";
import { MeanderLatticeModule } from "../meander-lattice/meander-lattice.module";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import {
  MOSAIC_TILE_EDGE_BUDGET,
  MOSAIC_TILE_MAXIMUM_ROWS,
  MOSAIC_TILE_MINIMUM_ROWS,
} from "../mosaic-tile/mosaic-tile.constants";
import { MosaicTileModule } from "../mosaic-tile/mosaic-tile.module";
import { MosaicTilesService } from "../mosaic-tile/mosaic-tiles.service";
import { COLUMNS_PER_SERPENTINE_UNIT } from "../parallel-motif/parallel-motif.constants";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";

import { TERMINATION_MARGIN_PITCHES } from "./lattice-identification.constants";
import { LatticeIdentificationModule } from "./lattice-identification.module";
import { LatticeIdentificationService } from "./lattice-identification.service";

import type {
  Modifier,
  MotifDrawnType,
  MotifPitchOptions,
} from "../meander-generation/meander-generation.types";
import type {
  MosaicSubFamily,
  MosaicTileShape,
} from "../mosaic-tile/mosaic-tile.types";

// 🔧 Configuration

/** Where `DrawCommand` writes the corpus, and where it is committed. */
const OUTPUT_DIRECTORY = path.join(import.meta.dirname, "../../../output");

/**
 * Every shape the `mosaic` half of the sweep commits a directory for,
 * derived from the family's own row range and edge budget rather than listed,
 * so a shape the budget starts or stops admitting arrives here without an
 * edit.
 */
const MOSAIC_SHAPES: readonly MosaicTileShape[] = Array.from(
  { length: MOSAIC_TILE_MAXIMUM_ROWS - MOSAIC_TILE_MINIMUM_ROWS + 1 },
  (_value, index) => MOSAIC_TILE_MINIMUM_ROWS + index,
).flatMap((rows) =>
  Array.from(
    {
      length: Math.max(Math.floor(MOSAIC_TILE_EDGE_BUDGET / (2 * rows - 3)), 1),
    },
    (_value, index) => ({ columns: index + 1, rows }),
  ),
);

/**
 * The two cross-family identities the corpus already holds, each naming a
 * `parallel` drawing and the `mosaic` tile it turns out to be.
 *
 * `serpentine` stacks its ribbons down the band rather than across it, so its
 * pitch is two columns whatever the ply — which is why a three-strand drawing
 * and a four-strand one are both read at a span of two, and why the `mosaic`
 * tiles they match are two columns wide.
 *
 * Both sides are the literal committed path, which is what lets the pair read
 * as a pair. The `parallel` half now ends in the shape its family is filed
 * under — `-3r2c`, the very span asserted below — and the `mosaic` half has
 * carried its full address all along.
 */
const CROSS_FAMILY_IDENTITIES: readonly {
  readonly modifier: Modifier;
  readonly mosaic: string;
  readonly parallel: string;
  readonly rows: number;
}[] = [
  {
    modifier: { name: "serpentine", offset: 1, strands: 3 },
    mosaic: "mosaic/3-rows/2-columns/56a9-zigzag.svg",
    parallel:
      "parallel/3-rows/serpentine-strands-3-offset-1-6-repeats-3r2c.svg",
    rows: 3,
  },
  {
    modifier: { name: "serpentine", offset: 2, strands: 4 },
    mosaic: "mosaic/4-rows/2-columns/56a933.svg",
    parallel:
      "parallel/4-rows/serpentine-strands-4-offset-2-6-repeats-4r2c.svg",
    rows: 4,
  },
];

/** One committed document, read off disk by its path relative to `output/`. */
const committed = async (name: string): Promise<string> =>
  readFile(path.join(OUTPUT_DIRECTORY, name), "utf8");

/**
 * The `boxes spin` drawing the issue measures, and the four pitch-wide
 * readings it holds.
 *
 * Named by the path it really carries rather than derived, because deriving
 * it would need the address, and reaching an address needs this very
 * document. `boxes` is filed shape-only, so the suffix is the reading the
 * test goes on to assert — sixteen columns at five rows — which is what
 * makes a stale literal a contradiction a reader can see rather than a
 * silent mismatch.
 */
const SPIN_DRAWING = "boxes/5-rows/spin-8-repeats-5r16c.svg";

/** How many consecutive spans the sweep addresses, which is the fewest that can disagree. */
const MEASURED_SPANS = 2;

/**
 * One pitch of slack on top of the measured spans and their margins.
 *
 * A family that clips its final unit flush with its own motif draws a column
 * short of a whole pitch — `boxes spin` at five rows and eight repeats is 31
 * lattice columns rather than 32 — so a repeat count that fits the
 * measurement exactly would leave those families a column short of it.
 */
const SPARE_PITCHES = 1;

/**
 * Every combination the corpus is drawn from that a motif service draws,
 * grouped by family and stripped to what a pitch is a function of — read
 * from the same {@link DrawCombinationsService} that `DrawCommand` writes
 * `output/` from, so this sweeps the space rather than a sample of it.
 *
 * It is instantiated directly rather than resolved from a testing module
 * because `it.each` needs its table at collection time, before any
 * `beforeAll` has run. `mosaic` is absent because it has no motif service:
 * a tile-drawn family's span is its tile's own column count, and every one
 * of those is addressed by the round trip above.
 */
const SWEPT_FAMILIES: readonly {
  readonly drawings: readonly MotifPitchOptions[];
  readonly type: MotifDrawnType;
}[] = [
  ...new DrawCombinationsService(
    new ParallelSerpentineService(new GridGeometryService()),
  )
    .enumerate()
    .reduce((families, { modifier, rows, type }) => {
      if (isMotifDrawnType(type)) {
        families.set(type, [
          ...(families.get(type) ?? []),
          { rows, type, ...(modifier ? { modifier } : {}) },
        ]);
      }

      return families;
    }, new Map<MotifDrawnType, MotifPitchOptions[]>()),
].map(([type, drawings]) => ({ drawings, type }));

/**
 * How many combinations the sweep covers, pinned so that a filter which
 * quietly stopped matching anything fails here rather than passing as a
 * sweep over nothing.
 */
const SWEPT_COMBINATION_COUNT = 1118;

/**
 * How many repeat units each tile is rendered at for the round trip. Three
 * is the smallest count with an interior unit — one that neither carries the
 * leading overhang nor has its cap ticks clipped — and {@link READ_UNIT} is
 * that unit.
 */
const REPEAT_COUNT = 3;

/** The repeat unit a round-tripped tile is read back out of, which its own width turns into the lattice column `readTile` starts at. */
const READ_UNIT = 1;

/**
 * How wide a drawing has to be rendered for two consecutive spans to sit
 * clear of both band terminations, in repeat units.
 *
 * The spin family is rounded up to a whole rotation, because
 * `MeanderGenerationService` refuses a repeat count its cycle does not
 * divide — the same rounding `DrawCombinationsService` does for the corpus.
 */
const repeatCountFor = (
  modifier: Modifier | undefined,
  pitches: number,
): number =>
  modifier && SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)
    ? Math.ceil(pitches / SPIN_CYCLE_LENGTH) * SPIN_CYCLE_LENGTH
    : pitches;

// 🧪 Tests

/**
 * Addressing a rendered meander by its lattice, from both ends: the
 * documents the repository already commits read back to the names they are
 * filed under, and every combination it draws reads back to **one** name
 * however many pitches its repeat takes.
 */
describe("a rendered meander is addressed by its lattice", () => {
  /**
   * What a reader of `output/` can already see, asserted.
   *
   * A `mosaic` drawing's filename is its address — `56a9-zigzag.svg` under
   * `3-rows/2-columns/` says which four points carry which direction bits — and
   * the enumeration that wrote those names never opened the file it wrote. So
   * addressing the committed documents back is the round trip that says the
   * name describes the ink rather than the intention, over all 8,551 of them at
   * once.
   *
   * The identities below are the same claim across a family boundary. A
   * `parallel` document and a `mosaic` document, generated by two motif
   * services that share no code, reduce to the same tile — which is the whole
   * point of addressing a meander by its lattice instead of by its family.
   */
  describe("committed documents address to the names they are filed under", () => {
    let meanderLatticeService: MeanderLatticeService;
    let motifPitchService: MotifPitchService;
    let service: LatticeIdentificationService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          LatticeIdentificationModule,
          MeanderGenerationModule,
          MeanderLatticeModule,
        ],
      }).compile();

      meanderLatticeService = await module.resolve(MeanderLatticeService);
      motifPitchService = await module.resolve(MotifPitchService);
      service = await module.resolve(LatticeIdentificationService);
    });

    it.each(MOSAIC_SHAPES)(
      "addresses every committed mosaic of $rows rows and $columns columns to its own filename",
      async ({ columns, rows }) => {
        const directory = path.join(
          OUTPUT_DIRECTORY,
          `mosaic/${rows}-rows/${columns}-columns`,
        );
        const listing = await readdir(directory);
        const fileNames = listing.toSorted();

        expect(fileNames.length).toBeGreaterThan(0);

        for (const fileName of fileNames) {
          const address = service.identifyDocument(
            await readFile(path.join(directory, fileName), "utf8"),
            { pitch: columns, span: columns },
          );
          const earned = address.subFamily ? `-${address.subFamily}` : "";

          expect({
            canonicalIdentifier: address.canonicalIdentifier,
            fileName: `${address.identifier}${earned}.svg`,
            shape: `${address.rows}r${address.span}c`,
          }).toStrictEqual({
            canonicalIdentifier: address.identifier,
            fileName,
            shape: `${rows}r${columns}c`,
          });
        }
      },
    );

    it.each(CROSS_FAMILY_IDENTITIES)(
      "reads $parallel as the tile $mosaic is named for",
      async ({ modifier, mosaic, parallel, rows }) => {
        const drawing = { modifier, rows, type: "parallel" } as const;
        const unit = {
          pitch: motifPitchService.columnPitch(drawing),
          span: motifPitchService.columnSpan(drawing),
        };

        expect(unit).toStrictEqual({
          pitch: COLUMNS_PER_SERPENTINE_UNIT,
          span: COLUMNS_PER_SERPENTINE_UNIT,
        });

        const drawn = service.identifyDocument(await committed(parallel), unit);
        const enumerated = service.identifyDocument(
          await committed(mosaic),
          unit,
        );
        const earned = drawn.subFamily ? `-${drawn.subFamily}` : "";

        expect(drawn.address).toBe(enumerated.address);
        expect(drawn.canonicalIdentifier).toBe(enumerated.canonicalIdentifier);
        expect(`${drawn.identifier}${earned}.svg`).toBe(path.basename(mosaic));
      },
    );

    it("states sameness through the canonical class while the literal address stays the name", async () => {
      // Four documents of one pattern, three of them `parallel` and one the
      // `mosaic` tile it turns out to be. Turning a ribbon over or rotating the
      // stack starts the same repeat at a different point, so each carries a
      // different literal address — which is what keeps four drawings four
      // names — and every one of them folds onto the same class.
      const addresses = await Promise.all(
        [
          "mosaic/4-rows/2-columns/56a933.svg",
          "parallel/4-rows/serpentine-strands-4-offset-1-6-repeats-4r2c.svg",
          "parallel/4-rows/serpentine-strands-4-offset-2-6-repeats-4r2c.svg",
          "parallel/4-rows/serpentine-strands-4-flip-alternating-offset-2-6-repeats-4r2c.svg",
        ].map(async (name) =>
          service.identifyDocument(await committed(name), {
            pitch: COLUMNS_PER_SERPENTINE_UNIT,
            span: COLUMNS_PER_SERPENTINE_UNIT,
          }),
        ),
      );

      expect(
        new Set(addresses.map(({ canonicalIdentifier }) => canonicalIdentifier))
          .size,
      ).toBe(1);
      expect(new Set(addresses.map(({ identifier }) => identifier)).size).toBe(
        3,
      );
    });

    it("gives the committed `boxes spin` of five rows one address where its pitch gives four", async () => {
      const drawing = {
        modifier: { name: "spin" },
        rows: 5,
        type: "boxes",
      } as const;
      const pitch = motifPitchService.columnPitch(drawing);
      const span = motifPitchService.columnSpan(drawing);
      const document = await committed(SPIN_DRAWING);
      const graph = meanderLatticeService.build(document);

      expect({ columns: graph.columns, pitch, span }).toStrictEqual({
        columns: 31,
        pitch: 4,
        span: SPIN_CYCLE_LENGTH * 4,
      });

      // Four consecutive pitch-wide readings, each a quarter turn on from the
      // one before it, and none of them a name the drawing could keep.
      const perPitch = Array.from(
        { length: SPIN_CYCLE_LENGTH },
        (_value, index) =>
          service.identify(
            service.readTile(
              graph,
              { columns: pitch, rows: graph.rows },
              (index + 1) * pitch,
            ),
          ),
      );

      expect(perPitch).toStrictEqual([
        "6354c4ccca9ca339",
        "6335c61cca39a331",
        "6335c65ccc8c8a39",
        "2335635cc29ca339",
      ]);
      expect(service.identifyDocument(document, { pitch, span }).address).toBe(
        "5r16c-6354633563352335c4ccc61cc65c635cca9cca39cc8cc29ca339a3318a39a339",
      );
    });
  });

  /**
   * The assertion the multiplier table is held to.
   *
   * A declared span is a claim that the drawing comes back to itself after
   * that many columns, and nothing about declaring it makes it true. So every
   * combination the corpus is drawn from is rendered wide enough to hold two
   * consecutive spans clear of both band terminations, and both are addressed:
   * a family whose repeat is wider than its declared span reads two different
   * names off one drawing and fails here.
   *
   * It renders rather than reading `output/`, because the corpus is too narrow
   * to show the case. `boxes spin` is committed at eight repeats — 31 lattice
   * columns — and two 16-column spans clear of both ends need about 48. A
   * sweep over the committed files would pass on a drawing it could only ever
   * look at once.
   */
  describe("consecutive repeat units of every drawing address identically", () => {
    let meanderGenerationService: MeanderGenerationService;
    let meanderLatticeService: MeanderLatticeService;
    let motifPitchService: MotifPitchService;
    let service: LatticeIdentificationService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          LatticeIdentificationModule,
          MeanderGenerationModule,
          MeanderLatticeModule,
        ],
      }).compile();

      meanderGenerationService = await module.resolve(MeanderGenerationService);
      meanderLatticeService = await module.resolve(MeanderLatticeService);
      motifPitchService = await module.resolve(MotifPitchService);
      service = await module.resolve(LatticeIdentificationService);
    });

    it("sweeps every combination the corpus is drawn from", () => {
      expect(
        SWEPT_FAMILIES.reduce(
          (total, { drawings }) => total + drawings.length,
          0,
        ),
      ).toBe(SWEPT_COMBINATION_COUNT);
    });

    it.each(SWEPT_FAMILIES)(
      "reads one name off every $type drawing, however many pitches its repeat takes",
      ({ drawings }) => {
        expect(drawings.length).toBeGreaterThan(0);

        for (const drawing of drawings) {
          const pitch = motifPitchService.columnPitch(drawing);
          const span = motifPitchService.columnSpan(drawing);
          const repeatCount = repeatCountFor(
            drawing.modifier,
            MEASURED_SPANS * (span / pitch) +
              2 * TERMINATION_MARGIN_PITCHES +
              SPARE_PITCHES,
          );
          const graph = meanderLatticeService.build(
            meanderGenerationService.generate({ ...drawing, repeatCount }),
          );
          const shape = { columns: span, rows: graph.rows };
          const start = TERMINATION_MARGIN_PITCHES * pitch;
          const first = service.identify(service.readTile(graph, shape, start));
          const next = service.identify(
            service.readTile(graph, shape, start + span),
          );

          expect({ ...drawing, name: first }).toStrictEqual({
            ...drawing,
            name: next,
          });
        }
      },
    );
  });

  /**
   * `MosaicNamingService`'s rules read a tile's own points and consult no
   * family, so a reading addressed from any family's drawing is exactly the
   * input a rule already knows how to answer for — the same claim
   * `mosaic-naming.service.unit.test.ts` makes over the enumerated `mosaic`
   * space, made here over every other family the corpus draws.
   *
   * `branch`, `negative`, and `parallel` are the three that earn a name at
   * all: a `branch` drawn with no modifier is bare bars, a `negative ruled`
   * or `grid` is the `lines` or `mesh` a one-column source inverts into, and
   * a `parallel serpentine` sometimes closes into the `mosaic` family's own
   * `zigzag`. The other six families in {@link SWEPT_FAMILIES} — `boxes`,
   * `chain`, `cross`, `snake`, `swirl`, `whirl` — earn none at any swept
   * combination, and that is not a gap in the rules: their motifs turn a
   * corner without every point doing so, or run ink no rule reads as
   * unbroken, so nothing here is forced to name them the nearest region
   * anyway.
   */
  describe("structural sub-family naming reaches every family's drawing", () => {
    let meanderGenerationService: MeanderGenerationService;
    let meanderLatticeService: MeanderLatticeService;
    let mosaicNamingService: MosaicNamingService;
    let motifPitchService: MotifPitchService;
    let service: LatticeIdentificationService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          LatticeIdentificationModule,
          MeanderGenerationModule,
          MeanderLatticeModule,
        ],
      }).compile();

      meanderGenerationService = await module.resolve(MeanderGenerationService);
      meanderLatticeService = await module.resolve(MeanderLatticeService);
      mosaicNamingService = await module.resolve(MosaicNamingService);
      motifPitchService = await module.resolve(MotifPitchService);
      service = await module.resolve(LatticeIdentificationService);
    });

    /**
     * Every rule a tile addressed from `drawing` matches, read the same way
     * the consecutive-repeat-unit sweep above reads one: rendered wide
     * enough to clear both band terminations, then windowed at its own span.
     */
    const matchingRules = (drawing: MotifPitchOptions): MosaicSubFamily[] => {
      const pitch = motifPitchService.columnPitch(drawing);
      const span = motifPitchService.columnSpan(drawing);
      const repeatCount = repeatCountFor(
        drawing.modifier,
        span / pitch + 2 * TERMINATION_MARGIN_PITCHES,
      );
      const graph = meanderLatticeService.build(
        meanderGenerationService.generate({ ...drawing, repeatCount }),
      );
      const shape = { columns: span, rows: graph.rows };
      const start = TERMINATION_MARGIN_PITCHES * pitch;

      return mosaicNamingService.matching(
        service.readTile(graph, shape, start),
      );
    };

    it("never lets a tile addressed from any family's drawing earn two names, exactly as the enumerated mosaic space never does", () => {
      const ambiguous: MosaicSubFamily[][] = [];

      for (const { drawings } of SWEPT_FAMILIES) {
        for (const drawing of drawings) {
          const matching = matchingRules(drawing);

          if (matching.length > 1) {
            ambiguous.push(matching);
          }
        }
      }

      expect(ambiguous).toStrictEqual([]);
    });

    it("earns a name for a small minority of the swept corpus, leaving the rest anonymous", () => {
      const namedByFamily: Record<string, Record<string, number>> = {};
      let named = 0;

      for (const { drawings, type } of SWEPT_FAMILIES) {
        for (const drawing of drawings) {
          const [earned] = matchingRules(drawing);

          if (earned) {
            named += 1;
            namedByFamily[type] = namedByFamily[type] ?? {};
            namedByFamily[type][earned] =
              (namedByFamily[type][earned] ?? 0) + 1;
          }
        }
      }

      expect({ named, total: SWEPT_COMBINATION_COUNT }).toStrictEqual({
        named: 85,
        total: SWEPT_COMBINATION_COUNT,
      });
      expect(namedByFamily).toStrictEqual({
        branch: { bars: 10 },
        negative: { lines: 13, mesh: 11, zigzag: 1 },
        parallel: { bars: 10, dashes: 37, dots: 1, zigzag: 2 },
      });
    });
  });

  /**
   * The round trip that makes the tile counts trustworthy.
   *
   * `MosaicTilesService` says which tiles exist and `MosaicTileMotifService`
   * says what each one draws, and nothing else holds the second to the first:
   * an enumeration test passes on a renderer that draws the wrong thing, and a
   * path-data test passes on a renderer that draws one tile's string correctly
   * and every other tile's wrongly.
   *
   * This closes that gap over the whole enumerated space at once — the same
   * eleven shapes {@link MOSAIC_SHAPES} derives, and the 2,406 tiles they
   * admit. Every tile the sweep commits is rendered to a real document, read
   * back by `MeanderLatticeService` — the same reader the charter measurement
   * uses, which knows nothing about tiles — and the lattice it produces is
   * turned back into the tile it must have come from by
   * {@link LatticeIdentificationService.readTile}. A rendering bug cannot hide
   * behind a passing enumeration, and a renderer and a reader that were both
   * wrong the same way would have to agree through a representation neither of
   * them shares.
   *
   * It lives beside the rest of identification because that is the service
   * that owns the behavior: `readTile` is the assertion's subject, and the
   * lattice is the representation it crosses rather than the thing under test.
   */
  describe("mosaic tiles round-trip through the lattice", () => {
    let latticeIdentificationService: LatticeIdentificationService;
    let meanderLatticeService: MeanderLatticeService;
    let mosaicTileGenerationService: MosaicTileGenerationService;
    let mosaicTilesService: MosaicTilesService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          LatticeIdentificationModule,
          MeanderLatticeModule,
          MosaicTileModule,
        ],
      }).compile();

      latticeIdentificationService = await module.resolve(
        LatticeIdentificationService,
      );
      meanderLatticeService = await module.resolve(MeanderLatticeService);
      mosaicTileGenerationService = await module.resolve(
        MosaicTileGenerationService,
      );
      mosaicTilesService = await module.resolve(MosaicTilesService);
    });

    it.each(MOSAIC_SHAPES)(
      "renders and reads back every tile at $rows rows and $columns columns as the tile enumerated",
      (shape) => {
        const tiles = mosaicTilesService.enumerate(shape.rows, shape.columns);

        expect(tiles.length).toBeGreaterThan(0);

        for (const tile of tiles) {
          const document = mosaicTileGenerationService.generate(
            tile,
            REPEAT_COUNT,
          );

          expect(
            latticeIdentificationService.readTile(
              meanderLatticeService.build(document),
              shape,
              READ_UNIT * shape.columns,
            ),
          ).toStrictEqual(tile);
        }
      },
    );
  });
});
