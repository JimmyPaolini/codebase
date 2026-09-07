import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  COMPATIBLE_MODIFIERS,
  MAXIMUM_VALUE,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifRegistryService } from "../meander-generation/motif-registry.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicSubFamilyService } from "../mosaic-tile/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-tile/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import {
  COLUMNS_PER_SERPENTINE_UNIT,
  COLUMNS_PER_STRAND,
  DEFAULT_PARALLEL_STRANDS,
  PARALLEL_MODIFIER_NAMES,
  UnknownParallelModifierError,
} from "./parallel-motif.constants";
import { ParallelMotifService } from "./parallel-motif.service";
import { ParallelSerpentineService } from "./parallel-serpentine.service";

import type { Modifier } from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching the sweep's own default. */
const REPEAT_COUNT = 6;

/** Every row count the sweep draws this family at: its structural minimum through the sweep maximum. */
const SWEPT_ROWS: readonly number[] = [4, 5, 6, 7, 8];

/**
 * Representative plies of the bracket-bundle shapes, and how many strands
 * each one puts in a repeat unit. One at the floor the family now admits,
 * one at its own default, and two above it.
 *
 * `cycles` and `tJunctions` are one number per ply rather than one per row
 * count, because both are properties of the band's width: the border rules
 * run the whole repeat, and a rule's length does not depend on how tall the
 * band is. Neither is simply the column count, though — an inner strand's
 * arms reach only the border its own bundle opens onto, so a deeper ply adds
 * columns faster than it adds forks.
 */
const PLIES: readonly {
  readonly cycles: number;
  readonly label: string;
  readonly modifier?: Modifier;
  readonly strands: number;
  readonly tJunctions: number;
}[] = [
  {
    cycles: 17,
    label: "unmodified",
    strands: DEFAULT_PARALLEL_STRANDS,
    tJunctions: 32,
  },
  {
    cycles: 11,
    label: "plied 1",
    modifier: { name: "plied", strands: 1 },
    strands: 1,
    tJunctions: 20,
  },
  {
    cycles: 23,
    label: "plied 3",
    modifier: { name: "plied", strands: 3 },
    strands: 3,
    tJunctions: 44,
  },
  {
    cycles: 29,
    label: "plied 4",
    modifier: { name: "plied", strands: 4 },
    strands: 4,
    tJunctions: 56,
  },
];

/**
 * One drawing of each of the family's three shapes at each swept row count,
 * beside how many lattice columns its own pitch gives it.
 *
 * The two pitches are the point of the table: a bracket bundle's grows with
 * its ply and a serpentine's does not, so a border rule that measured the
 * band with one of them would fall short on the other. Every ply here is
 * within the validator's bound of the shallowest row count swept.
 */
const SHAPES: readonly {
  readonly label: string;
  readonly latticeColumns: number;
  readonly modifier?: Modifier;
}[] = [
  {
    label: "unmodified",
    latticeColumns:
      COLUMNS_PER_STRAND * DEFAULT_PARALLEL_STRANDS * REPEAT_COUNT,
  },
  {
    label: "plied 1",
    latticeColumns: COLUMNS_PER_STRAND * REPEAT_COUNT,
    modifier: { name: "plied", strands: 1 },
  },
  {
    label: "plied 4",
    latticeColumns: COLUMNS_PER_STRAND * 4 * REPEAT_COUNT,
    modifier: { name: "plied", strands: 4 },
  },
  {
    label: "aligned 3",
    latticeColumns: COLUMNS_PER_STRAND * 3 * REPEAT_COUNT,
    modifier: { name: "aligned", strands: 3 },
  },
  {
    label: "serpentine 1",
    latticeColumns: COLUMNS_PER_SERPENTINE_UNIT * REPEAT_COUNT,
    modifier: { name: "serpentine", strands: 1 },
  },
  {
    label: "serpentine 4",
    latticeColumns: COLUMNS_PER_SERPENTINE_UNIT * REPEAT_COUNT,
    modifier: { name: "serpentine", strands: 4 },
  },
  {
    label: "serpentine 3 turned over and rotated",
    latticeColumns: COLUMNS_PER_SERPENTINE_UNIT * REPEAT_COUNT,
    modifier: { flip: "one", name: "serpentine", offset: 1, strands: 3 },
  },
];

// 🧪 Tests

describe(ParallelMotifService, () => {
  let generationService: MeanderGenerationService;
  let geometryService: GridGeometryService;
  let latticeService: MeanderLatticeService;
  let renderingService: SvgRenderingService;
  let serpentineService: ParallelSerpentineService;
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
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
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

    generationService = await module.resolve(MeanderGenerationService);
    geometryService = await module.resolve(GridGeometryService);
    latticeService = await module.resolve(MeanderLatticeService);
    renderingService = await module.resolve(SvgRenderingService);
    serpentineService = await module.resolve(ParallelSerpentineService);
    service = await module.resolve(ParallelMotifService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the closed borders", () => {
    // 🎯 The one thing all three shapes now share, read off the lattice
    // rather than off the path data: an unbroken rule along both border rows,
    // covering every lattice step of the repeat. Before this a bracket
    // bundle's arms ended in mid-air at whichever border it opened onto, and
    // a serpentine ruled a border only where a flat strip happened to land
    // there — so which border was ruled read as the shape's signature rather
    // than as the band's, and the family's four one-strand variants were
    // indistinguishable by their interiors.
    it.each(
      SWEPT_ROWS.flatMap((rows) =>
        SHAPES.map((shape) => ({
          ...shape,
          label: `${shape.label} at ${rows} rows`,
          rows,
        })),
      ),
    )("rules both borders end to end at $label", (testCase) => {
      const graph = latticeService.build(
        generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows: testCase.rows,
          type: "parallel",
          ...(testCase.modifier ? { modifier: testCase.modifier } : {}),
        }),
      );
      const bareSteps = (row: number): string[] =>
        Array.from(
          { length: graph.columns },
          (_value, column) => `${column},${row}`,
        ).filter((step) => !graph.horizontalEdges.has(step));

      expect({
        bottom: bareSteps(graph.rows),
        columns: graph.columns,
        top: bareSteps(0),
      }).toStrictEqual({
        bottom: [],
        columns: testCase.latticeColumns - 1,
        top: [],
      });
    });
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

  // 🎯 The family's three shapes: two bracket bundles that differ only in
  // whether they flip, and one that abandons brackets altogether.
  describe("the shapes", () => {
    // 🎯 Two lists in two files, made to agree here rather than by anybody
    // remembering. A name in `COMPATIBLE_MODIFIERS` and not in this
    // family's own list is a modifier the seam admits and the family
    // refuses at run time; a name in this family's list and not in
    // `COMPATIBLE_MODIFIERS` is a shape nothing can ask for.
    it("draws a ply for exactly the modifiers the seam declares compatible", () => {
      expect([...PARALLEL_MODIFIER_NAMES].toSorted()).toStrictEqual(
        [...COMPATIBLE_MODIFIERS.parallel].toSorted(),
      );
    });

    // 🎯 A single-strand ply is one bracket per unit and two lattice
    // columns wide — the shallow end of the same axis, and the drawing the
    // old floor of two made unreachable. Pinned as a string because the
    // claim is about the shape and not only about its validity.
    it("draws one bracket per unit at a ply of one", () => {
      expect(
        service.path(geometryService.compute(4), {
          isLastUnit: false,
          modifier: { name: "plied", strands: 1 },
          rows: 4,
          unitIndex: 0,
        }),
      ).toBe("M3.75 3.75V63.75H18.75V3.75");
    });

    // 🎯 `aligned` is the bundle with the alternation taken away, pinned as
    // the two strings that differ. An odd `aligned` unit is its even
    // neighbor translated one unit right — same crossbar on the band's
    // bottom border, same arms reaching its top — where the same odd unit
    // under `plied` is that bundle turned over. A shape that quietly
    // stopped alternating, or one that quietly started, changes one of
    // these two strings and fails.
    it("translates an aligned unit rather than turning it over", () => {
      const geometry = geometryService.compute(4);
      const unit = { isLastUnit: false, rows: 4, unitIndex: 1 };

      expect(
        service.path(geometry, {
          ...unit,
          modifier: { name: "aligned", strands: 2 },
        }),
      ).toBe("M63.75 3.75V63.75H108.75V3.75M78.75 3.75V48.75H93.75V3.75");

      expect(
        service.path(geometry, {
          ...unit,
          modifier: { name: "plied", strands: 2 },
        }),
      ).toBe("M63.75 63.75V3.75H108.75V63.75M78.75 63.75V18.75H93.75V63.75");
    });

    // 🎯 Why the serpentine's repeat pitch does not move with its ply, and
    // the bracket bundles' does. Reading the ply for a serpentine would
    // widen the canvas past its own ink.
    it("keeps one pitch at every ply, unlike the bracket bundles", () => {
      const geometry = geometryService.compute(6);
      const widthOf = (modifier: Modifier): number =>
        service.rightEdge(geometry, { modifier, repeatCount: 6, rows: 6 });

      expect(widthOf({ name: "serpentine", strands: 2 })).toBe(
        widthOf({ name: "serpentine", strands: 5 }),
      );
      expect(widthOf({ name: "plied", strands: 5 })).toBeGreaterThan(
        widthOf({ name: "plied", strands: 2 }),
      );
    });

    // 🎯 What a serpentine keeps that a bracket bundle gives up: the ply is
    // still the component count. Ruling both borders joins every bracket of
    // a bundle into one figure, because both of a bracket's arms end on the
    // border it opens onto — but only the top and bottom of a ribbon stack
    // reach a border at all, so the ribbons between them are untouched.

    // The third case is the family's one non-forking corner, and it is here
    // because it is what the other two are being distinguished from: at six
    // rows and a ply of six, one rotation puts a flat strip at each end of
    // the stack, those two flat ribbons are the two rules, and the drawing
    // closes nothing.
    it.each([
      { components: 1, loops: 11, strands: 1 },
      { components: 3, loops: 11, strands: 3 },
      { components: 6, loops: 0, offset: 1, strands: 6 },
    ])(
      "leaves $components connected ribbon(s) closing $loops loop(s) at a serpentine ply of $strands",
      ({ components: expected, loops, offset, strands }) => {
        const document = generationService.generate({
          modifier: {
            name: "serpentine",
            strands,
            ...(offset ? { offset } : {}),
          },
          repeatCount: REPEAT_COUNT,
          rows: 6,
          type: "parallel",
        });
        const { components, edges, nodes } =
          topologyService.connectivity(document);

        expect({ components, loops: edges - nodes + components }).toStrictEqual(
          { components: expected, loops },
        );
      },
    );
  });

  // 🎯 The structural condition the family's charter relaxation is declared
  // by, swept over every `(rows, strands, offset)` a serpentine admits at
  // four row counts rather than sampled: a drawing forks unless its first
  // and last strips are each one lattice row deep.
  describe("the border strips", () => {
    // 🎯 The two sides are read by two independent routes — the fork count
    // off the rendered ink, the strip depths off `strips` — and nothing in
    // either consults the other, so this is a cross-check rather than a
    // tautology. `strips` is a partition of the band's lattice rows; whether
    // the ink forks is a fact about lattice degree.

    // A flat strip at one end and depth at the other is not enough, which is
    // why the condition names both: the rule along the deep end still meets
    // an arm rising out of it. Each row count is swept over its whole ply and
    // rotation range, because an integer partition and its rotation are what
    // put the flat strips where they are.

    // The two pinned counts are the guard against a sweep that agrees by
    // being empty on both sides. A two-row band has no rotation that puts a
    // flat strip at each end, so all three of its drawings fork; the three
    // deeper row counts each have some that do not, and `deep` below `total`
    // is what says so.
    it.each([
      { deep: 3, rows: 2, total: 3 },
      { deep: 8, rows: 4, total: 10 },
      { deep: 16, rows: 6, total: 21 },
      { deep: 27, rows: 8, total: 36 },
    ])(
      "forks in exactly $deep of $total serpentine drawings at $rows rows",
      ({ deep, rows, total }) => {
        const forking: string[] = [];
        const deepBordered: string[] = [];
        const swept: string[] = [];

        for (let strands = 1; strands <= rows; strands += 1) {
          for (let offset = 0; offset < strands; offset += 1) {
            const label = `${strands} strands rotated ${offset}`;
            const strips = serpentineService.strips(rows, strands, offset);
            const first = strips.at(0);
            const last = strips.at(-1);

            swept.push(label);

            if (
              first?.bottomRow !== first?.topRow ||
              last?.bottomRow !== last?.topRow
            ) {
              deepBordered.push(label);
            }

            if (
              topologyService.measure(
                generationService.generate({
                  modifier: { name: "serpentine", offset, strands },
                  repeatCount: REPEAT_COUNT,
                  rows,
                  type: "parallel",
                }),
              ).inkTJunctions > 0
            ) {
              forking.push(label);
            }
          }
        }

        expect(forking).toStrictEqual(deepBordered);
        expect({
          deep: deepBordered.length,
          total: swept.length,
        }).toStrictEqual({ deep, total });
      },
    );
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
    // ply, the ink forks against the border rules, and no lattice point
    // carries four arms. A border row has no ink above it, so there is
    // nowhere a fourth arm could come from.

    // `nodes` is invariant 2 as a count rather than as a boolean, and it is
    // the stronger of the two: `channelWidthCompliant` exempts the first
    // and last lattice column, where 6,005 documents in the corpus do leave
    // a gap, and this number counts them. Every lattice column of this
    // family's band is inked, so it has no band-termination gap at all.

    // This is where the border rules show. A bundle's every bracket ends on
    // the border it opens onto, so ruling both leaves one component with no
    // free end anywhere — where a ply of `N` used to leave `N` open arcs per
    // repeat unit and close no loop at all. It still fills space and still
    // crosses nowhere; what it gave up was never a charter invariant.
    it.each(
      SWEPT_ROWS.flatMap((rows) =>
        PLIES.map((ply) => ({
          ...ply,
          label: `${ply.label} at ${rows} rows`,
          rows,
        })),
      ),
    )("holds at $label", ({ cycles, modifier, rows, strands, tJunctions }) => {
      const document = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows,
        type: "parallel",
        ...(modifier ? { modifier } : {}),
      });
      const connectivity = topologyService.connectivity(document);
      const { components, edges, freeEnds, nodes } = connectivity;
      const { channelWidthCompliant, inkTJunctions, inkXJunctions } =
        topologyService.measure(document);

      expect({
        acyclic: topologyService.isAcyclic(connectivity),
        channelWidthCompliant,
        components,
        freeEnds,
        inkTJunctions,
        inkXJunctions,
        loops: edges - nodes + components,
        nodes,
      }).toStrictEqual({
        acyclic: false,
        channelWidthCompliant: true,
        components: 1,
        freeEnds: 0,
        inkTJunctions: tJunctions,
        inkXJunctions: 0,
        loops: cycles,
        nodes: COLUMNS_PER_STRAND * strands * REPEAT_COUNT * (rows + 1),
      });
    });

    /**
     * A drawing rendered straight through the motif service, at row counts
     * `MeanderGenerationService.generate` refuses. The bounds live on that
     * service rather than here, which is what lets the reason for the
     * minimum be measured at the row counts it excludes.
     *
     * The border rules are appended exactly as
     * `MeanderGenerationService.buildPaths` appends them, so what is measured
     * is the drawing the family would make at that row count rather than its
     * units alone.
     */
    const belowMinimum = (rows: number): string => {
      const geometry = geometryService.compute(rows);
      const pattern = { repeatCount: REPEAT_COUNT, rows };
      const format = (value: number): string =>
        geometryService.formatCoordinate(value);

      return renderingService.render({
        height: format(
          geometry.offset + geometry.height + geometry.strokeWidth / 2,
        ),
        paths: [
          ...Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
            service.path(geometry, {
              isLastUnit: unitIndex === REPEAT_COUNT - 1,
              rows,
              unitIndex,
            }),
          ),
          service.border(geometry, pattern),
        ],
        strokeWidth: format(geometry.strokeWidth),
        width: format(
          service.rightEdge(geometry, pattern) + geometry.strokeWidth / 2,
        ),
      });
    };

    // 🎯 Why the family's minimum of 2 is a floor on the *family* rather
    // than on any one drawing. A one-row band holds every invariant this
    // family holds anywhere, and breaks the one it breaks everywhere —
    // measured here, through the motif service, at the one row count
    // `MeanderGenerationService.generate` refuses. What it cannot hold is
    // the family's own axis: `strands` is bounded above by `rows`, so a
    // one-row band admits a single ply and there is no second strand to run
    // alongside the first. The number and its reason are pinned together
    // here the same way `branch` pins its own.

    // The forks are the two rules meeting the twenty arms a one-row bundle
    // still stands up, and they are fewer than the 32 the same ply leaves at
    // any deeper row count: at one row the inner strand's arms have no
    // length, so only the outer strand rises out of a border.
    it("holds and breaks the same invariants at 1 row, below the family's structural minimum", () => {
      expect(topologyService.measure(belowMinimum(1))).toStrictEqual({
        channelWidthCompliant: true,
        inkTJunctions: 20,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
      });
    });

    // 🎯 The other half of that claim: at 1 row the ply axis has exactly one
    // value, and at 2 it has two. This is the number the minimum is set by.
    it.each([
      { plies: 1, rows: 1 },
      { plies: 2, rows: 2 },
    ])("admits $plies ply/plies at $rows row(s)", ({ plies, rows }) => {
      const admitted = Array.from(
        { length: MAXIMUM_VALUE },
        (_value, index) => index + 1,
      ).filter((strands) => strands <= rows);

      expect(admitted).toHaveLength(plies);
    });

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
