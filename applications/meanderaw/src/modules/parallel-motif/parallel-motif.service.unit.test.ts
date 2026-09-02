import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifRegistryService } from "../meander-generation/motif-registry.service";
import { MeanderLatticeService } from "../meander-topology/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import {
  COLUMNS_PER_STRAND,
  DEFAULT_PARALLEL_STRANDS,
  UnknownParallelModifierError,
} from "./parallel-motif.constants";
import { ParallelMotifService } from "./parallel-motif.service";

import type { Modifier } from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching the sweep's own default. */
const REPEAT_COUNT = 6;

/** Every row count the sweep draws this family at: its structural minimum through the sweep maximum. */
const SWEPT_ROWS: readonly number[] = [4, 5, 6, 7, 8];

/**
 * Every ply the sweep draws — the unmodified default beside each `plied`
 * count `PLIED_SWEEP_STRAND_COUNTS` names — and how many strands each one
 * puts in a repeat unit.
 */
const PLIES: readonly {
  readonly label: string;
  readonly modifier?: Modifier;
  readonly strands: number;
}[] = [
  { label: "unmodified", strands: DEFAULT_PARALLEL_STRANDS },
  { label: "plied 3", modifier: { name: "plied", strands: 3 }, strands: 3 },
  { label: "plied 4", modifier: { name: "plied", strands: 4 }, strands: 4 },
];

// 🧪 Tests

describe(ParallelMotifService, () => {
  let generationService: MeanderGenerationService;
  let geometryService: GridGeometryService;
  let latticeService: MeanderLatticeService;
  let renderingService: SvgRenderingService;
  let service: ParallelMotifService;
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
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    generationService = await module.resolve(MeanderGenerationService);
    geometryService = await module.resolve(GridGeometryService);
    latticeService = await module.resolve(MeanderLatticeService);
    renderingService = await module.resolve(SvgRenderingService);
    service = await module.resolve(ParallelMotifService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("strandCount", () => {
    it("draws the default ply when no modifier asks for one", () => {
      expect(service.strandCount(undefined)).toBe(DEFAULT_PARALLEL_STRANDS);
    });

    it("draws the ply the modifier names", () => {
      expect(service.strandCount({ name: "plied", strands: 5 })).toBe(5);
    });

    // 🎯 Nothing reaches this through `generate`, which checks compatibility
    // first. A family that answered "the default ply" to a modifier it did
    // not recognize would silently ink the wrong drawing; this one refuses.
    it("refuses a modifier it draws no ply for", () => {
      expect(() => service.strandCount({ name: "flip" })).toThrow(
        UnknownParallelModifierError,
      );
    });
  });

  describe("path", () => {
    // 🎯 The whole construction in two strings. A unit is a bundle of
    // nested brackets: strand 0's arms run the unit's outermost two lattice
    // columns and turn on the band's own border, strand 1's run the next two
    // in and turn one lattice row inside it. Even units open upward, odd
    // units downward, so the band reads as ⊔⊓⊔⊓ at whatever ply is asked
    // for.
    it("draws nested brackets opening upward in an even unit", () => {
      expect(
        service.path(geometryService.compute(4), {
          isLastUnit: false,
          rows: 4,
          unitIndex: 0,
        }),
      ).toBe("M3.75 3.75V63.75H48.75V3.75M18.75 3.75V48.75H33.75V3.75");
    });

    it("draws nested brackets opening downward in an odd unit", () => {
      expect(
        service.path(geometryService.compute(4), {
          isLastUnit: true,
          rows: 4,
          unitIndex: 1,
        }),
      ).toBe("M63.75 63.75V3.75H108.75V63.75M78.75 63.75V18.75H93.75V63.75");
    });

    // 🎯 The alternation again, at a ply the two strings above cannot see.
    // They pin it at the default ply and one row count only, so a bundle
    // that inverted its opening as it deepened — or stopped alternating at
    // all past two strands — would pass every other assertion in this file
    // and every case of the charter sweep, since an all-upward band is just
    // as much an exact cover as an alternating one. Three strands, an odd
    // unit: three crossbars stepping down from the band's top border, each
    // one lattice row inside the last.
    it("draws nested brackets opening downward in an odd unit at a deeper ply", () => {
      expect(
        service.path(geometryService.compute(4), {
          isLastUnit: true,
          modifier: { name: "plied", strands: 3 },
          rows: 4,
          unitIndex: 1,
        }),
      ).toBe(
        "M93.75 63.75V3.75H168.75V63.75M108.75 63.75V18.75H153.75V63.75M123.75 63.75V33.75H138.75V63.75",
      );
    });

    // 🎯 Why `strands` is bounded above by `rows` rather than by the shared
    // maximum. The innermost strand's arms are `rows - strands + 1` lattice
    // steps long, so one ply past the row count leaves them nothing at all:
    // its two vertical runs collapse onto the row its own crossbar sits on,
    // and what is left is a bare segment running alongside nothing. Measured
    // here rather than asserted in the error's own message.
    it("collapses the innermost strand's arms one ply past the row count", () => {
      expect(
        service.path(geometryService.compute(2), {
          isLastUnit: true,
          modifier: { name: "plied", strands: 3 },
          rows: 2,
          unitIndex: 0,
        }),
      ).toContain("M67.5 7.5V7.5H97.5V7.5");
    });
  });

  describe("rightEdge", () => {
    it("spans two lattice columns per strand per unit", () => {
      const geometry = geometryService.compute(4);

      expect(
        service.rightEdge(geometry, { repeatCount: 2, rows: 4 }),
      ).toBeCloseTo(
        geometry.offset +
          (COLUMNS_PER_STRAND * DEFAULT_PARALLEL_STRANDS * 2 - 1) *
            geometry.unit,
      );
    });
  });

  describe("the band", () => {
    // 🎯 Invariant 5, measured rather than assumed. An early attempt at
    // this family halved the canvas and stacked two bands inside it, and
    // both halves of that fail here: the lattice this drawing reads back
    // onto is exactly `rows` deep and exactly as wide as one band of
    // `COLUMNS_PER_STRAND × strands` columns per repeat unit, and the
    // canvas height is the same number `boxes` emits at the same row count
    // rather than a number of this family's own.
    it.each(
      SWEPT_ROWS.flatMap((rows) =>
        PLIES.map((ply) => ({
          ...ply,
          label: `${ply.label} at ${rows} rows`,
          rows,
        })),
      ),
    )(
      "tiles one band horizontally at $label",
      ({ modifier, rows, strands }) => {
        const document = generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows,
          type: "parallel",
          ...(modifier ? { modifier } : {}),
        });
        const lattice = latticeService.build(document);
        const shared = latticeService.build(
          generationService.generate({
            repeatCount: REPEAT_COUNT,
            rows,
            type: "boxes",
          }),
        );

        expect({ columns: lattice.columns, rows: lattice.rows }).toStrictEqual({
          columns: COLUMNS_PER_STRAND * strands * REPEAT_COUNT - 1,
          rows: shared.rows,
        });
      },
    );
  });

  describe("the stroke width", () => {
    // 🎯 #413's own arithmetic, refused in an assertion rather than in
    // prose. It states `strokeWidth = unit / (2N)`, which would make a
    // deeper ply draw a thinner line. Every ply draws at `unit / 2` — the
    // same number `boxes` declares at the same row count — so the lattice
    // these drawings read back onto is the lattice every other family's do,
    // which is what makes the charter sweep's verdict on them comparable at
    // all.
    it.each(
      SWEPT_ROWS.flatMap((rows) =>
        PLIES.map((ply) => ({
          ...ply,
          label: `${ply.label} at ${rows} rows`,
          rows,
        })),
      ),
    )("stays at half a grid unit for $label", ({ modifier, rows }) => {
      const geometry = geometryService.compute(rows);
      const declared = `stroke-width="${geometryService.formatCoordinate(
        geometry.unit / 2,
      )}"`;

      expect(
        generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows,
          type: "parallel",
          ...(modifier ? { modifier } : {}),
        }),
      ).toContain(declared);
      expect(
        generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows,
          type: "boxes",
        }),
      ).toContain(declared);
    });
  });

  describe("the charter", () => {
    // 🎯 The family's whole claim, measured through the single seam rather
    // than described: every lattice point of the band carries ink at every
    // ply, and no lattice point carries three arms or four. A ply of N puts
    // N strands in every repeat unit — that is the component count — and
    // every one of them is an open arc, which is the free-end count.
    //
    // `nodes` is invariant 2 as a count rather than as a boolean, and it is
    // the stronger of the two: `channelWidthCompliant` exempts the first
    // and last lattice column, where 2,114 documents in the corpus do leave
    // a gap, and this number counts them. Every lattice column of this
    // family's band is inked, so it has no band-termination gap at all.
    it.each(
      SWEPT_ROWS.flatMap((rows) =>
        PLIES.map((ply) => ({
          ...ply,
          label: `${ply.label} at ${rows} rows`,
          rows,
        })),
      ),
    )("holds at $label", ({ modifier, rows, strands }) => {
      const document = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows,
        type: "parallel",
        ...(modifier ? { modifier } : {}),
      });
      const { components, edges, freeEnds, nodes } =
        topologyService.connectivity(document);
      const { channelWidthCompliant, inkTJunctions, inkXJunctions } =
        topologyService.measure(document);

      expect({
        channelWidthCompliant,
        components,
        freeEnds,
        inkTJunctions,
        inkXJunctions,
        loops: edges - nodes + components,
        nodes,
      }).toStrictEqual({
        channelWidthCompliant: true,
        components: strands * REPEAT_COUNT,
        freeEnds: 2 * strands * REPEAT_COUNT,
        inkTJunctions: 0,
        inkXJunctions: 0,
        loops: 0,
        nodes: COLUMNS_PER_STRAND * strands * REPEAT_COUNT * (rows + 1),
      });
    });

    /**
     * A drawing rendered straight through the motif service, at row counts
     * `MeanderGenerationService.generate` refuses. The bounds live on that
     * service rather than here, which is what lets the reason for the
     * minimum be measured at the row counts it excludes.
     */
    const belowMinimum = (rows: number): string => {
      const geometry = geometryService.compute(rows);
      const format = (value: number): string =>
        geometryService.formatCoordinate(value);

      return renderingService.render({
        height: format(
          geometry.offset + geometry.height + geometry.strokeWidth / 2,
        ),
        paths: Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
          service.path(geometry, {
            isLastUnit: unitIndex === REPEAT_COUNT - 1,
            rows,
            unitIndex,
          }),
        ),
        strokeWidth: format(geometry.strokeWidth),
        width: format(
          service.rightEdge(geometry, { repeatCount: REPEAT_COUNT, rows }) +
            geometry.strokeWidth / 2,
        ),
      });
    };

    // 🎯 The default ply is not a floor the geometry imposes; it draws
    // perfectly well below the family's own structural minimum, which its
    // deepest swept ply sets instead. Measured at both row counts the
    // minimum excludes, the same way `branch` measures its own modes below
    // theirs.
    it.each([2, 3])(
      "still holds at %i rows, below the family's structural minimum",
      (rows) => {
        expect(topologyService.measure(belowMinimum(rows))).toStrictEqual({
          channelWidthCompliant: true,
          inkTJunctions: 0,
          inkXJunctions: 0,
          negativeTJunctions: 0,
          negativeXJunctions: 0,
        });
      },
    );

    // 🎯 `plied` naming the default ply is the default, byte for byte. The
    // sweep leaves it out for exactly this reason: it would commit a second
    // copy of a drawing it already has under another name.
    it("draws the same document for the default ply named and unnamed", () => {
      expect(
        generationService.generate({
          modifier: { name: "plied", strands: DEFAULT_PARALLEL_STRANDS },
          repeatCount: REPEAT_COUNT,
          rows: 6,
          type: "parallel",
        }),
      ).toBe(
        generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows: 6,
          type: "parallel",
        }),
      );
    });
  });
});
