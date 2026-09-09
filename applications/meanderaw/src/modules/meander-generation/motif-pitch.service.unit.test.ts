import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicSubFamilyService } from "../mosaic-tile/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-tile/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
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

import { SPIN_CYCLE_LENGTH } from "./meander-generation.constants";
import { MeanderGenerationService } from "./meander-generation.service";
import { isMotifDrawnType } from "./meander-generation.utilities";
import { MotifPitchService } from "./motif-pitch.service";
import { MotifRegistryService } from "./motif-registry.service";

import type {
  MotifDrawnType,
  MotifPitchOptions,
} from "./meander-generation.types";

// 🔧 Configuration

/**
 * The lower of the two repeat counts a drawing is measured at, the higher
 * being twice it.
 *
 * Both are multiples of {@link SPIN_CYCLE_LENGTH} and both sit inside the
 * command line's own ceiling, so one pair serves every family — including
 * the spin family, whose repeat count `MeanderGenerationService` refuses
 * unless the cycle divides it.
 */
const NARROWER_REPEAT_COUNT = SPIN_CYCLE_LENGTH;

/** The higher of the two repeat counts a drawing is measured at. */
const WIDER_REPEAT_COUNT = 2 * SPIN_CYCLE_LENGTH;

/**
 * Every drawing the corpus commits that a motif service draws, grouped by
 * family and stripped to what a pitch is a function of — read from the same
 * {@link DrawCombinationsService} that `DrawCommand` writes `output/` from,
 * so this sweeps the space rather than a sample of it.
 *
 * It is instantiated directly rather than resolved from a testing module
 * because `it.each` needs its table at collection time, before any
 * `beforeAll` has run. `mosaic` is absent because it has no motif service:
 * a tile-drawn family's span is its tile's own column count, which is stated
 * rather than derived.
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

// 🧪 Tests

describe(MotifPitchService, () => {
  let meanderGenerationService: MeanderGenerationService;
  let meanderLatticeService: MeanderLatticeService;
  let service: MotifPitchService;

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
        MosaicSubFamilyService,
        MosaicSymmetryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MotifPitchService,
        MotifRegistryService,
        MotifTransformsService,
        NegativeMotifService,
        NegativeSourceService,
        ParallelMotifService,
        ParallelSerpentineService,
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    meanderGenerationService = await module.resolve(MeanderGenerationService);
    meanderLatticeService = await module.resolve(MeanderLatticeService);
    service = await module.resolve(MotifPitchService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("columnPitch", () => {
    /**
     * The pitch measured off the ink instead of computed from the family: how
     * many lattice columns the rendered drawing really gains per repeat unit
     * added, read back by the same reader an address is read through.
     *
     * That is the assertion worth making. Deriving the pitch from `rightEdge`
     * and then checking it against `rightEdge` would prove only that
     * subtraction works; checking it against a document says the number
     * describes the drawing.
     */
    it.each(SWEPT_FAMILIES)(
      "is the lattice columns a $type drawing really grows by when a repeat unit is added",
      ({ drawings }) => {
        const width = (
          drawing: MotifPitchOptions,
          repeatCount: number,
        ): number =>
          meanderLatticeService.build(
            meanderGenerationService.generate({ ...drawing, repeatCount }),
          ).columns;

        expect(drawings.length).toBeGreaterThan(0);

        for (const drawing of drawings) {
          const measured =
            (width(drawing, WIDER_REPEAT_COUNT) -
              width(drawing, NARROWER_REPEAT_COUNT)) /
            (WIDER_REPEAT_COUNT - NARROWER_REPEAT_COUNT);

          expect({ ...drawing, pitch: measured }).toStrictEqual({
            ...drawing,
            pitch: service.columnPitch(drawing),
          });
        }
      },
    );
  });

  describe("columnSpan", () => {
    /**
     * One measured span per modifier the table names, and one for a family
     * whose pitch is already its repeat.
     *
     * The numbers are pinned rather than recomputed from the pitch and the
     * table, because multiplying the two here and comparing against the same
     * multiplication would assert nothing about either. What holds the table
     * to the drawings is the corpus sweep in
     * `lattice-identification.service.integration.test.ts`, which addresses
     * two consecutive spans of every combination and requires them to agree.
     */
    it.each([
      { expected: 16, modifier: { name: "spin" }, rows: 5, type: "boxes" },
      { expected: 16, modifier: { name: "spin-flip" }, rows: 5, type: "boxes" },
      { expected: 12, modifier: { name: "edge-flip" }, rows: 6, type: "snake" },
      { expected: 12, modifier: { name: "edge-flip" }, rows: 6, type: "chain" },
      {
        expected: 8,
        modifier: { name: "plied", strands: 2 },
        rows: 6,
        type: "parallel",
      },
    ] as const satisfies readonly (MotifPitchOptions & {
      readonly expected: number;
    })[])(
      "spans $expected columns for a $type drawing of $rows rows under $modifier.name",
      ({ expected, ...drawing }) => {
        expect(service.columnSpan(drawing)).toBe(expected);
      },
    );

    /**
     * `flip` is the entry worth reading. Turning alternate units over does
     * take two of them to come back, and on these families that is already
     * paid for in the pitch — `snake flip` at six rows advances eight columns
     * per unit where the plain drawing advances five — so a multiple on top
     * of it would address two repeats as one.
     */
    it.each([
      { expected: 5, rows: 6, type: "snake" },
      { expected: 8, modifier: { name: "flip" }, rows: 6, type: "snake" },
      { expected: 18, modifier: { name: "flip" }, rows: 6, type: "swirl" },
      { expected: 6, modifier: { name: "edge" }, rows: 6, type: "snake" },
    ] as const satisfies readonly (MotifPitchOptions & {
      readonly expected: number;
    })[])(
      "is the pitch itself, $expected columns, for a $type drawing whose consecutive units already agree",
      ({ expected, ...drawing }) => {
        expect(service.columnSpan(drawing)).toBe(expected);
        expect(service.columnPitch(drawing)).toBe(expected);
      },
    );
  });
});
