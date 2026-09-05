import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { CANVAS_HEIGHT } from "../grid-geometry/grid-geometry.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { FAMILY_MAXIMUM_ROWS } from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifRegistryService } from "../meander-generation/motif-registry.service";
import { MeanderLatticeService } from "../meander-topology/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import { NegativeMotifService } from "./negative-motif.service";
import { NegativeSourceService } from "./negative-source.service";

import type {
  GenerationParameters,
  Modifier,
} from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching the sweep's own default. */
const REPEAT_COUNT = 6;

/**
 * Every row count the sweep draws this family at: its structural minimum
 * through the shared `MAXIMUM_VALUE`, which is what
 * `DrawCombinationsService` enumerates for every family.
 */
const SWEPT_ROWS: readonly number[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Every mode the family draws — no modifier, and each of the nine it
 * declares compatible — beside the ink T- and X-junction counts each one
 * produces at every swept row count, in {@link SWEPT_ROWS} order.
 *
 * These two hundred numbers are the tables `README.md` publishes under "The
 * Negative Space Family", and this is the only thing making them true. The
 * corridor-identity test in
 * `meander-topology.service.integration.test.ts` equates two computed values
 * against each other, so it would still pass if both drifted together, and it
 * covers only the drawings whose source the survey enumerated — everything
 * from 8 rows up has no committed source to be compared against at all.
 * Written out here, every published figure is the output of an assertion
 * rather than prose standing beside one.
 *
 * The `xJunctions` column is new with the seven modes added beside the
 * original three, and it is why it exists: three of the ten cross. That is
 * charter invariant 4 relaxed on purpose, declared in `RELAXED_INVARIANTS`
 * for exactly those three modifier names, and a mode that started or stopped
 * crossing would fail here before it reached the charter sweep.
 */
const MODES: readonly {
  readonly modifier?: Modifier;
  readonly tJunctions: readonly number[];
  readonly xJunctions: readonly number[];
}[] = [
  {
    tJunctions: [38, 48, 58, 68, 78, 88, 98, 108, 118, 128],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    modifier: { name: "brick-staggered" },
    tJunctions: [30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    modifier: { name: "brick-straight" },
    tJunctions: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    xJunctions: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
  },
  {
    modifier: { name: "brick-upright" },
    tJunctions: [10, 10, 12, 12, 14, 14, 16, 16, 18, 18],
    xJunctions: [4, 4, 8, 8, 12, 12, 16, 16, 20, 20],
  },
  {
    modifier: { name: "grid" },
    tJunctions: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30],
    xJunctions: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44],
  },
  {
    modifier: { name: "ruled" },
    tJunctions: [16, 16, 24, 24, 32, 32, 40, 40, 48, 48],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    modifier: { name: "ruled-closed" },
    tJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    modifier: { name: "ruled-raised" },
    tJunctions: [8, 16, 16, 24, 24, 32, 32, 40, 40, 48],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    modifier: { name: "ruled-spaced" },
    tJunctions: [8, 16, 16, 16, 24, 24, 24, 32, 32, 32],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    modifier: { name: "ruled-tall" },
    tJunctions: [8, 8, 16, 16, 16, 24, 24, 24, 32, 32],
    xJunctions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
];

/**
 * The one mode that branches nowhere: `ruled-closed` inverts the `lines`
 * sub-family, whose negative is nothing but the band's own rules, and the
 * survey's "neither" class is exactly that sub-family at every row count.
 * Named here so the shape guard below can allow a zero without allowing a
 * table entry to have gone missing.
 */
const NON_BRANCHING_MODIFIER_NAME = "ruled-closed";

/** Every swept drawing, as the parameters that produce it, the junctions it owes, and a label to read it back by. */
const SWEEP: readonly {
  label: string;
  parameters: GenerationParameters;
  tJunctions: number;
  xJunctions: number;
}[] = MODES.flatMap(({ modifier, tJunctions, xJunctions }) =>
  SWEPT_ROWS.map((rows, index) => ({
    label: `${rows} rows${modifier ? ` with ${modifier.name}` : ""}`,
    parameters: {
      repeatCount: REPEAT_COUNT,
      rows,
      type: "negative" as const,
      ...(modifier ? { modifier } : {}),
    },
    // 🎯 `-1` rather than `0`, because zero is a real count for
    // `ruled-closed` and would hide a table entry that had gone missing.
    tJunctions: tJunctions[index] ?? -1,
    xJunctions: xJunctions[index] ?? -1,
  })),
);

/**
 * Decimal places two declared widths are compared to. Coordinates are
 * rounded to five places before they reach the document, so at a row count
 * whose grid unit does not divide the canvas evenly (7) two widths that
 * differ by exactly one repeat unit can read a hundred-thousandth apart.
 */
const TOLERANCE_DIGITS = 4;

/**
 * One of the root element's declared dimensions, as a number, refusing a
 * document that declares none.
 *
 * The refusal is the point. Returning `NaN` on a miss would make
 * `expect(height(a)).toBe(height(b))` pass while measuring nothing at all,
 * since `NaN` is `Object.is`-equal to itself — a test that cannot fail, which
 * is the exact defect this family's own assertions exist to catch.
 */
const dimension = (document: string, pattern: RegExp): number => {
  const declared = Number(pattern.exec(document)?.[1]);

  if (!Number.isFinite(declared)) {
    throw new TypeError(`document declares no ${pattern.source} dimension`);
  }

  return declared;
};

/** The root element's declared height, as a number. */
const height = (document: string): number =>
  dimension(document, /\sheight="([\d.]+)"/u);

/** The root element's declared width, as a number. */
const width = (document: string): number =>
  dimension(document, /\swidth="([\d.]+)"/u);

// 🧪 Tests

describe(NegativeMotifService, () => {
  let generationService: MeanderGenerationService;
  let latticeService: MeanderLatticeService;
  let service: NegativeMotifService;
  let topologyService: MeanderTopologyService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoxesMotifService,
        BranchMotifService,
        ChainMotifService,
        CrossMotifService,
        GridGeometryService,
        MeanderGenerationService,
        MeanderLatticeService,
        MeanderTopologyService,
        MosaicMotifService,
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
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

    generationService = await module.resolve(MeanderGenerationService);
    latticeService = await module.resolve(MeanderLatticeService);
    service = await module.resolve(NegativeMotifService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("charter invariant 1, orthogonal only", () => {
    // 🎯 `MeanderTopologyService.measure` refuses a document that uses any
    // command but `M`, `H`, and `V`, so every measurement below already
    // proves this. It is asserted directly as well because a refusal reads
    // as an unrelated failure wherever it happens to surface first, and this
    // is the one invariant the charter marks fixed that a drawing could
    // break with a single character.
    //
    // A subset rather than the whole set, because `ruled-closed` really does
    // emit no `V` at all: it inverts the `lines` sub-family, whose negative
    // is the band's own rules and nothing between them. Demanding all three
    // would fail the one mode that draws no corridor, which is a fact about
    // that mode rather than a diagonal.
    it.each(SWEEP)(
      "$label draws only moves and axis runs",
      ({ parameters }) => {
        const commands = [
          ...generationService
            .generate(parameters)
            .matchAll(/(?<=\sd=")[^"]*/gu),
        ].flatMap((match) => [...match[0].matchAll(/[A-Za-z]/gu)]);

        expect(commands.length).toBeGreaterThan(0);
        expect(
          [...new Set(commands.map((match) => match[0]))]
            .toSorted()
            .filter((letter) => !["H", "M", "V"].includes(letter)),
        ).toStrictEqual([]);
      },
    );
  });

  describe("charter invariants 3 and 4, relaxed on purpose", () => {
    // 🎯 The guard against the table above vacating: an entry gone missing
    // reads back as the `-1` fallback, which no measurement can ever produce.
    // Zero cannot serve as that sentinel any more — `ruled-closed` really
    // does branch nowhere — so the two claims are asserted apart: every entry
    // is present, and exactly one mode is allowed to branch nowhere.
    it("owes a published junction count for every drawing the sweep commits", () => {
      expect(SWEEP).toHaveLength(SWEPT_ROWS.length * MODES.length);
      expect(
        SWEEP.filter(
          ({ tJunctions, xJunctions }) => tJunctions < 0 || xJunctions < 0,
        ),
      ).toStrictEqual([]);
      expect([
        ...new Set(
          SWEEP.filter(({ tJunctions }) => tJunctions === 0).map(
            ({ parameters }) => parameters.modifier?.name,
          ),
        ),
      ]).toStrictEqual([NON_BRANCHING_MODIFIER_NAME]);
    });

    it.each(SWEEP)(
      "$label branches at the $tJunctions ink T-junctions README publishes",
      ({ parameters, tJunctions }) => {
        expect(
          topologyService.measure(generationService.generate(parameters))
            .inkTJunctions,
        ).toBe(tJunctions);
      },
    );

    // 🎯 Both directions of the relaxation, from one table. A mode that
    // stopped crossing would fail here as loudly as one that started, which
    // is what keeps `RELAXED_INVARIANTS` honest: it declares invariant 4
    // relaxed for three modifier names, and a declaration nothing measures is
    // a comment.
    it.each(SWEEP)(
      "$label crosses at the $xJunctions ink X-junctions README publishes",
      ({ parameters, xJunctions }) => {
        expect(
          topologyService.measure(generationService.generate(parameters))
            .inkXJunctions,
        ).toBe(xJunctions);
      },
    );
  });

  describe("charter invariant 2, space filling", () => {
    // 🎯 Stronger than `channelWidthCompliant`, which exempts the band's
    // first and last lattice column under invariant 7. This family needs no
    // such exemption: it inks every corridor a cell has, and the survey found
    // no cell of any permutation tile with none, so every lattice point of
    // the canvas is painted — termination included. That is a measured
    // property of this family rather than a designed one, and it is asserted
    // here so it cannot quietly stop being true.
    it.each(SWEEP)(
      "$label paints every lattice point, band termination included",
      ({ parameters }) => {
        const document = generationService.generate(parameters);
        const graph = latticeService.build(document);
        const missing: string[] = [];

        for (let column = 0; column <= graph.columns; column += 1) {
          for (let row = 0; row <= graph.rows; row += 1) {
            if (!graph.nodes.has(`${column},${row}`)) {
              missing.push(`${column},${row}`);
            }
          }
        }

        expect(missing).toStrictEqual([]);
        expect(topologyService.measure(document).channelWidthCompliant).toBe(
          true,
        );
      },
    );
  });

  describe("charter invariant 5, band not field", () => {
    // 🎯 A band's height is decided by `rows` alone: the concrete number
    // the shared geometry implies, `CANVAS_HEIGHT` plus half a grid unit of
    // stroke margin. Every row count this family is drawn at, including the
    // ones past any enumerated source.
    it.each(SWEEP)(
      "$label is as tall as the shared geometry declares",
      ({ parameters }) => {
        expect(height(generationService.generate(parameters))).toBeCloseTo(
          CANVAS_HEIGHT + CANVAS_HEIGHT / parameters.rows / 2,
          TOLERANCE_DIGITS,
        );
      },
    );

    // 🎯 The same fact stated a second way, so neither can pass by
    // accident: a completely different family declares the same canvas
    // height at the same row count, because both take it from the shared
    // geometry rather than from anything either one draws.
    //
    // It covers the row counts where both families are drawn rather than
    // every row count this one is. `mosaic` stops at
    // `FAMILY_MAXIMUM_ROWS.mosaic` — see `MOSAIC_TILE_MAXIMUM_ROWS` — and
    // the command line refuses it above that, so there is no mosaic to
    // compare a deeper `negative` against. Above the overlap the assertion
    // on the geometry number stands alone, which is why it is written as a
    // number rather than only as a second family's height.
    it.each(
      SWEEP.filter(
        ({ parameters }) => parameters.rows <= FAMILY_MAXIMUM_ROWS.mosaic,
      ),
    )("$label is as tall as a mosaic of the same rows", ({ parameters }) => {
      expect(height(generationService.generate(parameters))).toBe(
        height(
          generationService.generate({
            repeatCount: REPEAT_COUNT,
            rows: parameters.rows,
            type: "mosaic",
          }),
        ),
      );
    });

    it.each(SWEEP)(
      "$label tiles horizontally and only horizontally",
      ({ parameters }) => {
        const documents = [4, 6, 8].map((repeatCount) =>
          generationService.generate({ ...parameters, repeatCount }),
        );
        const [narrow, middle, wide] = documents.map((document) => ({
          height: height(document),
          width: width(document),
        }));

        expect(narrow?.height).toBe(middle?.height);
        expect(middle?.height).toBe(wide?.height);
        expect((wide?.width ?? 0) - (middle?.width ?? 0)).toBeCloseTo(
          (middle?.width ?? 0) - (narrow?.width ?? 0),
          TOLERANCE_DIGITS,
        );
        expect((middle?.width ?? 0) - (narrow?.width ?? 0)).toBeGreaterThan(0);
      },
    );
  });

  describe("beyond the surveyed range", () => {
    // 🎯 The family's `rows` is one below its source's, so the highest row
    // count the shared `MAXIMUM_VALUE` admits asks for the negative of a
    // 13-row mosaic — one past what that same maximum admits for a tile.
    // `NegativeSourceService` builds tiles from a rule rather than from the
    // enumeration, so nothing refuses it. This pins that claim; it is a
    // statement about what the code does, not a recommendation to draw there.
    it("draws at the shared maximum row count, past any enumerated tile", () => {
      const measured = topologyService.measure(
        generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows: 12,
          type: "negative",
        }),
      );

      expect(measured.channelWidthCompliant).toBe(true);
      expect(measured.inkXJunctions).toBe(0);
      expect(measured.inkTJunctions).toBeGreaterThan(0);
    });
  });
});
