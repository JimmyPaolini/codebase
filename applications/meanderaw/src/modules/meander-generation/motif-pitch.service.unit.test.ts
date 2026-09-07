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

import {
  SPIN_CYCLE_LENGTH,
  TILE_DRAWN_TYPES,
} from "./meander-generation.constants";
import { MeanderGenerationService } from "./meander-generation.service";
import { MotifPitchService } from "./motif-pitch.service";
import { MotifRegistryService } from "./motif-registry.service";

import type {
  MeanderType,
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

/** Narrows a family to one with a motif service, which is every family the sweep below reaches. */
const isMotifDrawnType = (type: MeanderType): type is MotifDrawnType =>
  !TILE_DRAWN_TYPES.includes(type);

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

  describe("columnSpan", () => {
    /**
     * The pitch measured off the ink instead of computed from the family: how
     * many lattice columns the rendered drawing really gains per repeat unit
     * added, read back by the same reader an address is read through.
     *
     * That is the assertion worth making. Deriving the span from `rightEdge`
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

          expect({ ...drawing, span: measured }).toStrictEqual({
            ...drawing,
            span: service.columnSpan(drawing),
          });
        }
      },
    );
  });
});
