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
  DEFAULT_COMB_IS_UPWARD,
  DEFAULT_RUNG_IS_LEFTWARD,
  MINIMUM_STAGGER_BRANCHES,
  UnknownBranchModeError,
} from "./branch-motif.constants";
import { BranchMotifService } from "./branch-motif.service";

import type { Modifier } from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching the sweep's own default. */
const REPEAT_COUNT = 6;

/** Every row count the sweep draws this family at: its structural minimum through the sweep maximum. */
const SWEPT_ROWS: readonly number[] = [2, 3, 4, 5, 6, 7, 8];

/**
 * Every mode the family draws — no modifier, and each parameterization of
 * the two modifiers it declares compatible — beside the ink T-junction
 * count each produces at every swept row count, in {@link SWEPT_ROWS}
 * order.
 *
 * These fifty-six numbers are the table `README.md` publishes under "The
 * Branching Family", and this is the only thing making that table true. All
 * but the two `rung` rows are flat, because their forks live on the rail
 * rather than on the teeth: a `comb` forks at every lattice column whose
 * rail continues on both sides, and a `stagger` only where a whole crenel's
 * rail does, neither of which depends on how tall the band is. `rung`'s
 * forks are on its stiles, so its row climbs by one per unit per row
 * added — which is also the reason for the family's minimum row count,
 * pinned below.
 *
 * `unitColumns` is how wide one repeat unit is, and only `stagger` varies
 * it: its crenel spans the branches one rail joins, so a run of `b`
 * branches is a unit `b - 1` lattice columns wide and the whole drawing is
 * that much wider. The upward `comb` and the two `rung` rows carry the same
 * numbers as the drawings they are reflections of, which is asserted below
 * rather than assumed here — no count in this table could tell a reflection
 * from its original. A `comb` drawn explicitly downward has no row of its
 * own for the opposite reason: it is byte-identical to the unmodified
 * drawing rather than merely equal to it in every count, which "the comb
 * direction" block asserts directly.
 */
const MODES: readonly {
  readonly freeEnds: readonly number[];
  readonly label: string;
  readonly modifier?: Modifier;
  readonly tJunctions: readonly number[];
  readonly unitColumns: number;
}[] = [
  {
    freeEnds: [12, 12, 12, 12, 12, 12, 12],
    label: "comb",
    tJunctions: [10, 10, 10, 10, 10, 10, 10],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    freeEnds: [12, 12, 12, 12, 12, 12, 12],
    label: "comb standing up",
    modifier: { isUpward: true, name: "comb" },
    tJunctions: [10, 10, 10, 10, 10, 10, 10],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    freeEnds: [13, 19, 25, 31, 37, 43, 49],
    label: "rung pointing right",
    modifier: { isLeftward: false, name: "rung" },
    tJunctions: [11, 17, 23, 29, 35, 41, 47],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    freeEnds: [13, 19, 25, 31, 37, 43, 49],
    label: "rung pointing left",
    modifier: { isLeftward: true, name: "rung" },
    tJunctions: [11, 17, 23, 29, 35, 41, 47],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    freeEnds: [7, 7, 7, 7, 7, 7, 7],
    label: "stagger over 3 branches",
    modifier: { branches: 3, name: "stagger" },
    tJunctions: [5, 5, 5, 5, 5, 5, 5],
    unitColumns: 2,
  },
  {
    freeEnds: [13, 13, 13, 13, 13, 13, 13],
    label: "stagger over 4 branches",
    modifier: { branches: 4, name: "stagger" },
    tJunctions: [11, 11, 11, 11, 11, 11, 11],
    unitColumns: 3,
  },
  {
    freeEnds: [19, 19, 19, 19, 19, 19, 19],
    label: "stagger over 5 branches",
    modifier: { branches: 5, name: "stagger" },
    tJunctions: [17, 17, 17, 17, 17, 17, 17],
    unitColumns: 4,
  },
  {
    freeEnds: [25, 25, 25, 25, 25, 25, 25],
    label: "stagger over 6 branches",
    modifier: { branches: 6, name: "stagger" },
    tJunctions: [23, 23, 23, 23, 23, 23, 23],
    unitColumns: 5,
  },
];

/**
 * How many lattice columns a drawing of {@link REPEAT_COUNT} units spans in
 * every mode but `stagger`, whose unit width is its own crenel's. Lattice
 * columns are counted, not the gaps between them, so the rightmost column's
 * index is one less than this.
 */
const LATTICE_COLUMNS = BRANCH_UNIT_COLUMNS * REPEAT_COUNT;

/**
 * One drawing the sweep below measures: a mode, a row count, the ink
 * T-junction count {@link MODES} publishes for the pair, and how many
 * lattice columns the drawing spans.
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
            latticeColumns: mode.unitColumns * REPEAT_COUNT,
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

/**
 * One run of ink read back off a rendered document: which axis it runs
 * along, the lattice line it sits on, and the span it covers along that
 * line. Every path this family emits is one `M` followed by one `H` or one
 * `V`, so a document parses into these exhaustively.
 */
interface InkSegment {
  readonly axis: "H" | "V";
  readonly from: number;
  readonly level: number;
  readonly to: number;
}

/**
 * A coordinate rounded past the noise a reflection leaves behind.
 * `formatCoordinate` already rounds every coordinate to five decimal
 * places, so subtracting one such value from another lands a few millionths
 * of a pixel off what the other document wrote. Rounding happens once, on
 * the way out: rounding a coordinate and then reflecting it would round
 * twice and move the value a whole place.
 */
const round = (value: number): number => Number(value.toFixed(4));

/** Orders segments so two documents drawing the same ink compare equal whatever order their paths were emitted in. */
const bySegment = (left: InkSegment, right: InkSegment): number =>
  `${left.axis}${left.level},${left.from},${left.to}`.localeCompare(
    `${right.axis}${right.level},${right.from},${right.to}`,
  );

/** One segment with every coordinate rounded, ready to compare. */
const settle = (segment: InkSegment): InkSegment => ({
  axis: segment.axis,
  from: round(segment.from),
  level: round(segment.level),
  to: round(segment.to),
});

/** Every run of ink a rendered document draws, at full precision and in emission order. */
const parseSegments = (document: string): InkSegment[] =>
  [...document.matchAll(/M([\d.]+) ([\d.]+)([HV])([\d.]+)/gu)].map(
    ([, start, along, command, end]) => {
      const isHorizontal = command === "H";
      const span = isHorizontal
        ? [Number(start), Number(end)]
        : [Number(along), Number(end)];

      return {
        axis: isHorizontal ? ("H" as const) : ("V" as const),
        from: Math.min(...span),
        level: Number(isHorizontal ? along : start),
        to: Math.max(...span),
      };
    },
  );

/** Every run of ink a rendered document draws, in a canonical order. */
const segments = (document: string): InkSegment[] =>
  parseSegments(document)
    .map((segment) => settle(segment))
    .toSorted(bySegment);

/**
 * The same ink reflected about a line at `axis` perpendicular to
 * `coordinate`, in the same canonical order.
 *
 * A run whose own direction is the one being reflected has its span
 * reversed and stays on its line; a run across it keeps its span and moves
 * to the reflected line. So reflecting `"x"` mirrors a drawing left to
 * right, and reflecting `"y"` turns it upside down.
 */
const reflectedSegments = (
  document: string,
  axis: number,
  coordinate: "x" | "y",
): InkSegment[] =>
  parseSegments(document)
    .map((segment) => {
      const runsAlongCoordinate =
        coordinate === "x" ? segment.axis === "H" : segment.axis === "V";

      return runsAlongCoordinate
        ? { ...segment, from: axis - segment.to, to: axis - segment.from }
        : { ...segment, level: axis - segment.level };
    })
    .map((segment) => settle(segment))
    .toSorted(bySegment);

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
      expect(BRANCH_CASES).toHaveLength(56);
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
          edges: testCase.latticeColumns * (testCase.rows + 1) - 1,
          freeEnds: testCase.freeEnds,
          nodes: testCase.latticeColumns * (testCase.rows + 1),
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

    // 🎯 The one parameter that changes how wide a repeat unit is, so it is
    // also the one that changes where the band ends. A right edge computed
    // off the family's fixed unit width would clip every crenel wider than
    // the minimum, and nothing else in this suite would notice: the ink
    // would still be a tree, still orthogonal, still the same height.
    it.each([
      { branches: MINIMUM_STAGGER_BRANCHES, unitColumns: 2 },
      { branches: 4, unitColumns: 3 },
      { branches: 5, unitColumns: 4 },
    ])(
      "reaches $unitColumns columns per unit when a stagger joins $branches branches",
      ({ branches, unitColumns }) => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.rightEdge(geometry, {
            modifier: { branches, name: "stagger" },
            repeatCount: REPEAT_COUNT,
            rows: 5,
          }),
        ).toBe(
          geometry.offset + (unitColumns * REPEAT_COUNT - 1) * geometry.unit,
        );
      },
    );
  });

  describe("the rung direction", () => {
    // 🎯 The whole claim of the `--leftward` flag, and the reason its row of
    // `MODES` repeats the rightward numbers rather than carrying its own:
    // the two drawings are the same figure seen in a mirror. Reflecting one
    // about the band's own width reproduces the other exactly — stiles,
    // rungs, rails, and the one stile with no rail beyond it included — so
    // no topology count could have told them apart, and this is what says
    // the direction changed anything at all.
    it.each(SWEPT_ROWS)("mirrors the rightward drawing at %i rows", (rows) => {
      const drawing = (isLeftward: boolean): string =>
        generationService.generate({
          modifier: { isLeftward, name: "rung" },
          repeatCount: REPEAT_COUNT,
          rows,
          type: "branch",
        });
      const geometry = gridGeometryService.compute(rows);
      const axis = 2 * geometry.offset + (LATTICE_COLUMNS - 1) * geometry.unit;

      expect(reflectedSegments(drawing(true), axis, "x")).toStrictEqual(
        segments(drawing(false)),
      );
    });

    // 🎯 A boolean cannot refuse an absent flag, so the direction a bare
    // `--modifier rung` draws is a choice rather than an error — and this
    // is the assertion that it is still the one every committed `rung`
    // drawing was made with.
    it("points the rungs right by default", () => {
      expect(DEFAULT_RUNG_IS_LEFTWARD).toBe(false);
      expect(
        service.mode({ isLeftward: DEFAULT_RUNG_IS_LEFTWARD, name: "rung" }),
      ).toBe("rung");
    });
  });

  describe("the comb direction", () => {
    const drawing = (modifier?: Modifier): string =>
      generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows: 5,
        type: "branch",
        ...(modifier ? { modifier } : {}),
      });

    // 🎯 The claim `--upward` rests on, and the reason its two rows of
    // `MODES` repeat the unmodified row's numbers: the drawing is the same
    // figure turned upside down. Every tooth already spans the whole band,
    // so the rail's own border row is the only thing left for a direction to
    // move — and reflecting one drawing across the band has to reproduce the
    // other exactly.
    it.each(SWEPT_ROWS)("turns the comb upside down at %i rows", (rows) => {
      const comb = (isUpward: boolean): string =>
        generationService.generate({
          modifier: { isUpward, name: "comb" },
          repeatCount: REPEAT_COUNT,
          rows,
          type: "branch",
        });
      const geometry = gridGeometryService.compute(rows);
      const axis = 2 * geometry.offset + rows * geometry.unit;

      expect(reflectedSegments(comb(true), axis, "y")).toStrictEqual(
        segments(comb(false)),
      );
    });

    // 🎯 `--modifier comb` is not a second spelling of "no modifier" — it
    // takes a direction the unmodified drawing cannot be given — but with
    // no direction asked for it has to draw exactly what the unmodified one
    // does, or the family would have two defaults. A byte identity rather
    // than a topology comparison, because that is the whole claim.
    it("draws what no modifier draws when no direction is asked for", () => {
      expect(drawing({ isUpward: DEFAULT_COMB_IS_UPWARD, name: "comb" })).toBe(
        drawing(),
      );
    });

    // 🎯 The one thing the two directions genuinely disagree about, read
    // off the drawing: which border row carries the rail. Every tooth spans
    // both rows either way, so this is what a reader would point at.
    it.each([
      { isUpward: false, railRow: 0 },
      { isUpward: true, railRow: 5 },
    ])(
      "runs an upward=$isUpward rail along row $railRow",
      ({ isUpward, railRow }) => {
        const geometry = gridGeometryService.compute(5);
        const railLevels = segments(drawing({ isUpward, name: "comb" }))
          .filter((segment) => segment.axis === "H")
          .map((segment) => (segment.level - geometry.offset) / geometry.unit);

        expect([
          ...new Set(railLevels.map((level) => Math.round(level))),
        ]).toStrictEqual([railRow]);
      },
    );
  });

  describe("the stagger crenel", () => {
    /**
     * A `stagger` drawn straight through the motif service, at a branch
     * count `MeanderGenerationService.generate` refuses. The bound lives on
     * that service rather than here, which is what lets the reason for the
     * floor be measured at the value it excludes.
     */
    const belowBranchMinimum = (branches: number, rows: number): string => {
      const geometry = gridGeometryService.compute(rows);
      const modifier: Modifier = { branches, name: "stagger" };
      const format = (value: number): string =>
        gridGeometryService.formatCoordinate(value);

      return renderingService.render({
        height: format(
          geometry.offset + geometry.height + geometry.strokeWidth / 2,
        ),
        paths: Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
          service.path(geometry, {
            isLastUnit: unitIndex === REPEAT_COUNT - 1,
            modifier,
            rows,
            unitIndex,
          }),
        ),
        strokeWidth: format(geometry.strokeWidth),
        width: format(
          service.rightEdge(geometry, {
            modifier,
            repeatCount: REPEAT_COUNT,
            rows,
          }) +
            geometry.strokeWidth / 2,
        ),
      });
    };

    // 🎯 The parameter's whole job, read off the drawing rather than off the
    // modifier: a rail joins exactly `branches` teeth before it changes
    // side. Measured as the longest horizontal run in lattice steps, which
    // is one fewer than the teeth it touches.
    it.each([
      { branches: MINIMUM_STAGGER_BRANCHES },
      { branches: 4 },
      { branches: 5 },
      { branches: 8 },
    ])("joins $branches branches per rail run", ({ branches }) => {
      const geometry = gridGeometryService.compute(5);
      const document = generationService.generate({
        modifier: { branches, name: "stagger" },
        repeatCount: REPEAT_COUNT,
        rows: 5,
        type: "branch",
      });
      const railSteps = segments(document)
        .filter((segment) => segment.axis === "H")
        .map((segment) => (segment.to - segment.from) / geometry.unit);

      expect(Math.max(...railSteps)).toBeCloseTo(branches - 1, 5);
    });

    // 🎯 The reason `MINIMUM_STAGGER_BRANCHES` is 3 rather than 2, measured
    // at the value it excludes. A two-branch run has no tooth strictly
    // inside it, so nothing forks: the figure is still connected and still
    // `nodes - 1` edges, but every lattice point carries at most two arms
    // and it is a simple path rather than a branching tree. `branch`
    // declares invariant 3 relaxed in every mode and the charter property
    // test asserts a declared relaxation is present, so this drawing would
    // fail the charter — which is what the floor is for.
    it("stops forking altogether at two branches", () => {
      const document = belowBranchMinimum(2, 5);

      expect(topologyService.measure(document).inkTJunctions).toBe(0);
      expect(topologyService.connectivity(document)).toStrictEqual({
        components: 1,
        edges: REPEAT_COUNT * 6 - 1,
        freeEnds: 2,
        nodes: REPEAT_COUNT * 6,
      });
    });

    it.each([
      { branches: 2, reason: "below the family's own floor" },
      { branches: 13, reason: "past the shared maximum" },
      { branches: 2.5, reason: "not a whole number" },
    ])("refuses $branches branches, $reason", ({ branches }) => {
      expect(() =>
        generationService.generate({
          modifier: { branches, name: "stagger" },
          repeatCount: REPEAT_COUNT,
          rows: 5,
          type: "branch",
        }),
      ).toThrow(/branches must be between 3 and 12/u);
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
          service.rightEdge(geometry, {
            repeatCount: REPEAT_COUNT,
            rows,
            ...(modifier ? { modifier } : {}),
          }) +
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
          topologyService.measure(
            belowMinimum(rows, { isLeftward: false, name: "rung" }),
          ).inkTJunctions,
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
        modifier: {
          branches: MINIMUM_STAGGER_BRANCHES,
          name: "stagger" as const,
        },
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
      const document = belowMinimum(1, { isLeftward: false, name: "rung" });

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
          modifier: { isLeftward: false, name: "rung" },
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
      {
        expected: "rung" as const,
        modifier: { isLeftward: false, name: "rung" as const },
      },
      {
        expected: "rung" as const,
        modifier: { isLeftward: true, name: "rung" as const },
      },
      {
        expected: "comb" as const,
        modifier: { isUpward: false, name: "comb" as const },
      },
      {
        expected: "comb" as const,
        modifier: { isUpward: true, name: "comb" as const },
      },
      {
        expected: "stagger" as const,
        modifier: {
          branches: MINIMUM_STAGGER_BRANCHES,
          name: "stagger" as const,
        },
      },
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
