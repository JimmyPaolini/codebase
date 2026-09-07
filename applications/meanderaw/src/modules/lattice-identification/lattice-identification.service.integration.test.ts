import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  TILE_DRAWN_TYPES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifPitchService } from "../meander-generation/motif-pitch.service";
import { MeanderLatticeModule } from "../meander-lattice/meander-lattice.module";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import {
  MOSAIC_TILE_EDGE_BUDGET,
  MOSAIC_TILE_MAXIMUM_ROWS,
  MOSAIC_TILE_MINIMUM_ROWS,
} from "../mosaic-tile/mosaic-tile.constants";
import { COLUMNS_PER_SERPENTINE_UNIT } from "../parallel-motif/parallel-motif.constants";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";

import { TERMINATION_MARGIN_PITCHES } from "./lattice-identification.constants";
import { LatticeIdentificationModule } from "./lattice-identification.module";
import { LatticeIdentificationService } from "./lattice-identification.service";

import type {
  MeanderType,
  Modifier,
  MotifDrawnType,
  MotifPitchOptions,
} from "../meander-generation/meander-generation.types";
import type { MosaicTileShape } from "../mosaic-tile/mosaic-tile.types";

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
    parallel: "parallel/3-rows/serpentine-strands-3-offset-1-6-repeats.svg",
    rows: 3,
  },
  {
    modifier: { name: "serpentine", offset: 2, strands: 4 },
    mosaic: "mosaic/4-rows/2-columns/56a933.svg",
    parallel: "parallel/4-rows/serpentine-strands-4-offset-2-6-repeats.svg",
    rows: 4,
  },
];

/** One committed document, read off disk by its path relative to `output/`. */
const committed = async (name: string): Promise<string> =>
  readFile(path.join(OUTPUT_DIRECTORY, name), "utf8");

/** The `boxes spin` drawing the issue measures, and the four pitch-wide readings it holds. */
const SPIN_DRAWING = "boxes/5-rows/spin-8-repeats.svg";

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

/** Narrows a family to one with a motif service, which is every family the sweep below reaches. */
const isMotifDrawnType = (type: MeanderType): type is MotifDrawnType =>
  !TILE_DRAWN_TYPES.includes(type);

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
const SWEPT_COMBINATION_COUNT = 1104;

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
            shape: `${address.rows}r${address.columns}c`,
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
          "parallel/4-rows/serpentine-strands-4-offset-1-6-repeats.svg",
          "parallel/4-rows/serpentine-strands-4-offset-2-6-repeats.svg",
          "parallel/4-rows/serpentine-strands-4-flip-alternating-offset-2-6-repeats.svg",
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
});
