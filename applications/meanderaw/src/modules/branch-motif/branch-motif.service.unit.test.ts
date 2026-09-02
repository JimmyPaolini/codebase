import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { CANVAS_HEIGHT } from "../grid-geometry/grid-geometry.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  COMPATIBLE_MODIFIERS,
  STRUCTURAL_MINIMUM_ROWS,
} from "../meander-generation/meander-generation.constants";
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
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import {
  BRANCH_MODES_BY_MODIFIER_NAME,
  BRANCH_UNIT_COLUMNS,
  UnknownBranchModeError,
} from "./branch-motif.constants";
import { BranchMotifService } from "./branch-motif.service";

import type { Modifier } from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching the sweep's own default. */
const REPEAT_COUNT = 6;

/**
 * How many lattice columns a drawing of {@link REPEAT_COUNT} units spans.
 * Lattice columns are counted, not the gaps between them, so the rightmost
 * column's index is one less than this.
 */
const LATTICE_COLUMNS = BRANCH_UNIT_COLUMNS * REPEAT_COUNT;

/** Every row count the sweep draws this family at: its structural minimum through the sweep maximum. */
const SWEPT_ROWS: readonly number[] = [2, 3, 4, 5, 6, 7, 8];

/**
 * Every mode the family draws — no modifier, and each of the two it declares
 * compatible — beside the ink T-junction count each produces at every swept
 * row count, in {@link SWEPT_ROWS} order.
 *
 * These twenty-one numbers are the table `README.md` publishes under "The
 * Branching Family", and this is the only thing making that table true. Two
 * of the three rows are flat because their forks live on the rail rather
 * than on the teeth: `comb` forks at every lattice column whose rail
 * continues on both sides, and `stagger` only where a whole crenel's rail
 * does, neither of which depends on how tall the band is. `rung`'s forks are
 * on its stiles, so its row climbs by one per unit per row added — which is
 * also the reason for the family's minimum row count, pinned below.
 */
const MODES: readonly {
  readonly freeEnds: readonly number[];
  readonly label: string;
  readonly modifier?: Modifier;
  readonly tJunctions: readonly number[];
}[] = [
  {
    freeEnds: [12, 12, 12, 12, 12, 12, 12],
    label: "comb",
    tJunctions: [10, 10, 10, 10, 10, 10, 10],
  },
  {
    freeEnds: [13, 19, 25, 31, 37, 43, 49],
    label: "rung",
    modifier: { name: "rung" },
    tJunctions: [11, 17, 23, 29, 35, 41, 47],
  },
  {
    freeEnds: [7, 7, 7, 7, 7, 7, 7],
    label: "stagger",
    modifier: { name: "stagger" },
    tJunctions: [5, 5, 5, 5, 5, 5, 5],
  },
];

/**
 * One drawing the sweep below measures: a mode, a row count, and the ink
 * T-junction count {@link MODES} publishes for the pair.
 *
 * Built by zipping rather than written out, so a row count added to
 * {@link SWEPT_ROWS} without a number beside it in {@link MODES} silently
 * drops its cases instead of measuring nothing — which the length assertion
 * below is what catches.
 */
const BRANCH_CASES = MODES.flatMap((mode) =>
  SWEPT_ROWS.flatMap((rows, index) => {
    const freeEnds = mode.freeEnds[index];
    const tJunctions = mode.tJunctions[index];

    return freeEnds === undefined || tJunctions === undefined
      ? []
      : [
          {
            freeEnds,
            label: `${mode.label} at ${rows} rows`,
            rows,
            tJunctions,
            ...(mode.modifier ? { modifier: mode.modifier } : {}),
          },
        ];
  }),
);

/** One declared dimension of a rendered document. */
const dimension = (document: string, pattern: RegExp): number =>
  Number(pattern.exec(document)?.[1]);

// 🧪 Tests

describe(BranchMotifService, () => {
  let generationService: MeanderGenerationService;
  let gridGeometryService: GridGeometryService;
  let renderingService: SvgRenderingService;
  let service: BranchMotifService;
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
    gridGeometryService = await module.resolve(GridGeometryService);
    renderingService = await module.resolve(SvgRenderingService);
    service = await module.resolve(BranchMotifService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the swept space", () => {
    // 🎯 The guard against a property test that empties itself. Every
    // assertion below reads this table, so a zip that stopped lining up
    // would quietly measure fewer drawings — or none — without failing.
    it("covers every mode at every swept row count", () => {
      expect(BRANCH_CASES).toHaveLength(MODES.length * SWEPT_ROWS.length);
      expect(BRANCH_CASES).toHaveLength(21);
    });

    it("starts at the family's own structural minimum", () => {
      expect(SWEPT_ROWS[0]).toBe(STRUCTURAL_MINIMUM_ROWS.branch);
    });

    it("names exactly the modifiers the family declares compatible", () => {
      expect(
        Object.keys(BRANCH_MODES_BY_MODIFIER_NAME).toSorted(),
      ).toStrictEqual([...COMPATIBLE_MODIFIERS.branch].toSorted());
    });
  });

  describe("bounded-tree ink", () => {
    // 🎯 The family's whole claim, in the two numbers a tree is defined by.
    // `nodes` is every lattice point of the band, so it is invariant 2
    // measured as a count rather than as a boolean — and it counts the
    // first and last lattice column too, which `channelWidthCompliant`
    // exempts, so this family has no band-termination gap at all. `edges`
    // one short of it, over a single component, is exactly a tree: a
    // connected figure with a loop would need at least as many edges as
    // nodes.
    //
    // `freeEnds` is the fourth number and it is not structural. It is what
    // keeps the figure reading as a meander rather than as a grille, and it
    // is the column the README's unbounded-branching write-up compares
    // against: both looped constructions measured there have none.
    it.each(BRANCH_CASES)(
      "$label inks a spanning tree with $freeEnds free ends",
      (testCase) => {
        const document = generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows: testCase.rows,
          type: "branch",
          ...(testCase.modifier ? { modifier: testCase.modifier } : {}),
        });

        expect(topologyService.connectivity(document)).toStrictEqual({
          components: 1,
          edges: LATTICE_COLUMNS * (testCase.rows + 1) - 1,
          freeEnds: testCase.freeEnds,
          nodes: LATTICE_COLUMNS * (testCase.rows + 1),
        });
      },
    );

    it.each(BRANCH_CASES)(
      "$label forks $tJunctions times and crosses nowhere",
      (testCase) => {
        const topology = topologyService.measure(
          generationService.generate({
            repeatCount: REPEAT_COUNT,
            rows: testCase.rows,
            type: "branch",
            ...(testCase.modifier ? { modifier: testCase.modifier } : {}),
          }),
        );

        expect({
          channelWidthCompliant: topology.channelWidthCompliant,
          inkTJunctions: topology.inkTJunctions,
          inkXJunctions: topology.inkXJunctions,
        }).toStrictEqual({
          channelWidthCompliant: true,
          inkTJunctions: testCase.tJunctions,
          inkXJunctions: 0,
        });
      },
    );
  });

  describe("the band", () => {
    it.each(BRANCH_CASES)(
      "$label keeps the canvas height every other family uses",
      (testCase) => {
        const document = generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows: testCase.rows,
          type: "branch",
          ...(testCase.modifier ? { modifier: testCase.modifier } : {}),
        });
        const strokeWidth = dimension(document, /stroke-width="([\d.]+)"/u);

        // 🎯 The band is `CANVAS_HEIGHT` tall whatever the row count, and
        // the canvas is that plus the half stroke width the square line cap
        // adds past the lattice line at each end. Row count is density, not
        // size — which is invariant 5.
        expect(
          dimension(document, /\sheight="([\d.]+)"/u) - strokeWidth,
        ).toBeCloseTo(CANVAS_HEIGHT, 5);
      },
    );

    it.each(BRANCH_CASES)("$label draws no diagonal", (testCase) => {
      const document = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows: testCase.rows,
        type: "branch",
        ...(testCase.modifier ? { modifier: testCase.modifier } : {}),
      });
      const commands = [
        ...new Set(
          [...document.matchAll(/(?<=\sd=")[^"]*(?=")/gu)]
            .flatMap((match) => [...match[0].matchAll(/[A-Za-z]/gu)])
            .map((match) => match[0]),
        ),
      ];

      expect(commands.toSorted()).toStrictEqual(["H", "M", "V"]);
    });

    it("widens with the repeat count and never with the row count", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.rightEdge(geometry, { repeatCount: REPEAT_COUNT, rows: 5 }),
      ).toBe(
        geometry.offset +
          (BRANCH_UNIT_COLUMNS * REPEAT_COUNT - 1) * geometry.unit,
      );
    });
  });

  describe("the structural minimum", () => {
    /**
     * A drawing rendered straight through the motif service, at row counts
     * `MeanderGenerationService.generate` refuses. The bounds live on that
     * service rather than here, which is what lets the reason for the
     * minimum be measured at the row count it excludes — for the mode the
     * minimum is set by, and for the two it is not.
     */
    const belowMinimum = (rows: number, modifier?: Modifier): string => {
      const geometry = gridGeometryService.compute(rows);
      const format = (value: number): string =>
        gridGeometryService.formatCoordinate(value);

      return renderingService.render({
        height: format(
          geometry.offset + geometry.height + geometry.strokeWidth / 2,
        ),
        paths: Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
          service.path(geometry, {
            isLastUnit: unitIndex === REPEAT_COUNT - 1,
            rows,
            unitIndex,
            ...(modifier ? { modifier } : {}),
          }),
        ),
        strokeWidth: format(geometry.strokeWidth),
        width: format(
          service.rightEdge(geometry, { repeatCount: REPEAT_COUNT, rows }) +
            geometry.strokeWidth / 2,
        ),
      });
    };

    // 🎯 `rung`'s forks decompose into two terms: one per stile per interior
    // lattice row, and `repeatCount - 1` where the rail arrives at a stile's
    // head — one fewer than the stiles, since the first has no rail on its
    // left, which is what `railForks` below spells out. At one row a
    // stile has no interior row, so the first term is zero and every fork
    // left is a rail junction — the mode draws a plain bracket per unit and
    // the junction it is named for is absent. That is the whole reason the
    // family's minimum is 2 rather than 1, measured rather than argued.
    it.each([
      { railForks: REPEAT_COUNT - 1, rows: 1, stileForks: 0 },
      { railForks: REPEAT_COUNT - 1, rows: 2, stileForks: REPEAT_COUNT },
      { railForks: REPEAT_COUNT - 1, rows: 3, stileForks: REPEAT_COUNT * 2 },
    ])(
      "leaves rung with $stileForks stile forks at $rows rows",
      ({ railForks, rows, stileForks }) => {
        expect(
          topologyService.measure(belowMinimum(rows, { name: "rung" }))
            .inkTJunctions,
        ).toBe(railForks + stileForks);
      },
    );

    // 🎯 The other half of the minimum's reason, and the half that was
    // asserted only in prose before: the family takes the stricter of its
    // modes, which means the other two must actually be drawable at one
    // row. They are — both fork there, at exactly the counts they hold at
    // every other row count, because their forks sit on the rail and a
    // rail's length does not depend on the band's height. So 2 is `rung`'s
    // floor rather than the lattice's.
    it.each([
      { freeEnds: 12, label: "comb", tJunctions: 10 },
      {
        freeEnds: 7,
        label: "stagger",
        modifier: { name: "stagger" as const },
        tJunctions: 5,
      },
    ])("still draws $label at one row", (testCase) => {
      const document = belowMinimum(1, testCase.modifier);

      expect(topologyService.connectivity(document)).toStrictEqual({
        components: 1,
        edges: LATTICE_COLUMNS * 2 - 1,
        freeEnds: testCase.freeEnds,
        nodes: LATTICE_COLUMNS * 2,
      });
      expect(topologyService.measure(document).inkTJunctions).toBe(
        testCase.tJunctions,
      );
    });

    // 🎯 The drawing below the minimum is still a tree and still
    // space-filling, so no charter gate would have caught it. The minimum is
    // this family's own legibility floor, exactly as `cross`'s is.
    it("still measures as a space-filling tree at one row", () => {
      const document = belowMinimum(1, { name: "rung" });

      expect(topologyService.connectivity(document)).toStrictEqual({
        components: 1,
        edges: LATTICE_COLUMNS * 2 - 1,
        freeEnds: 7,
        nodes: LATTICE_COLUMNS * 2,
      });
      expect(topologyService.measure(document).channelWidthCompliant).toBe(
        true,
      );
    });

    it("is refused by the generation service all the same", () => {
      expect(() =>
        generationService.generate({
          modifier: { name: "rung" },
          repeatCount: REPEAT_COUNT,
          rows: 1,
          type: "branch",
        }),
      ).toThrow(/rows must be between 2 and 12/u);
    });
  });

  describe("mode", () => {
    it("inks the default mode when no modifier is given", () => {
      expect(service.mode(undefined)).toBe("comb");
    });

    it.each([
      { expected: "rung" as const, modifier: { name: "rung" as const } },
      { expected: "stagger" as const, modifier: { name: "stagger" as const } },
    ])("inks $expected under its own modifier", ({ expected, modifier }) => {
      expect(service.mode(modifier)).toBe(expected);
    });

    // 🎯 Nothing reaches this through `generate`, which rejects an
    // incompatible modifier first. It exists so an unrecognized modifier is
    // refused rather than silently answered with the default mode.
    it("refuses a modifier it draws no mode for", () => {
      expect(() => service.mode({ name: "flip" })).toThrow(
        UnknownBranchModeError,
      );
    });
  });
});
