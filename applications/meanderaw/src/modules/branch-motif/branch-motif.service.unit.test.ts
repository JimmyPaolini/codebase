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
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicSubFamilyService } from "../mosaic-tile/mosaic-sub-family.service";
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
  BRANCH_MODES_BY_MODIFIER_NAME,
  BRANCH_UNIT_COLUMNS,
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
const SWEPT_ROWS: readonly number[] = [3, 4, 5, 6, 7, 8];

/**
 * Every mode the family draws — no modifier, and each parameterization of
 * the two modifiers it declares compatible — beside the ink T-junction count
 * and free-end count each produces at every swept row count, in
 * {@link SWEPT_ROWS} order, and how many pieces each falls into.
 *
 * `components` is one number per mode rather than one per row count, and it
 * is above one in every mode: each mode's figure is inset by a lattice row
 * from the rules beside it, so a rule never touches it. `comb` and `rung`
 * take one rule and are two pieces — the figure and that rule. `stagger`
 * takes both rules and is three. Every mode is a **forest**: no mode closes
 * a loop anywhere, which the sweep below asserts through the service's own
 * `isAcyclic` rather than restating as arithmetic.
 *
 * All but the two `rung` rows are flat, because their forks live where a
 * rail meets a tooth and a rail's length does not depend on how tall the
 * band is. `rung`'s forks sit on its stiles as well, so its row climbs by
 * one per unit per row added. Every mode leaves free ends now, because
 * nothing meets the far end of a tooth: `comb` and the staggers leave one
 * per uncovered tooth end plus two per rule, and `rung` leaves one per rung.
 *
 * `unitColumns` is how wide one repeat unit is, and only `stagger` varies
 * it: its crenel spans the branches one rail joins, so a run of `b`
 * branches is a unit `b - 1` lattice columns wide and the whole drawing is
 * that much wider. The two `rung` rows carry the same numbers as the
 * drawings they are reflections of, which is asserted below rather than
 * assumed here — no count in this table could tell a reflection from its
 * original.
 *
 * `README.md`'s own table under "The Branching Family" restates every number
 * here. Nothing keeps the two in step but this table being the measured one,
 * so a count that moves is corrected here first and copied there after.
 */
const MODES: readonly {
  readonly components: number;
  readonly freeEnds: readonly number[];
  readonly label: string;
  readonly modifier?: Modifier;
  readonly tJunctions: readonly number[];
  readonly unitColumns: number;
}[] = [
  {
    components: 2,
    freeEnds: [14, 14, 14, 14, 14, 14],
    label: "comb",
    tJunctions: [10, 10, 10, 10, 10, 10],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    components: 2,
    freeEnds: [15, 21, 27, 33, 39, 45],
    label: "rung pointing right",
    modifier: { isLeftward: false, name: "rung" },
    tJunctions: [11, 17, 23, 29, 35, 41],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    components: 2,
    freeEnds: [15, 21, 27, 33, 39, 45],
    label: "rung pointing left",
    modifier: { isLeftward: true, name: "rung" },
    tJunctions: [11, 17, 23, 29, 35, 41],
    unitColumns: BRANCH_UNIT_COLUMNS,
  },
  {
    components: 3,
    freeEnds: [17, 17, 17, 17, 17, 17],
    label: "stagger over 4 branches",
    modifier: { branches: 4, name: "stagger" },
    tJunctions: [11, 11, 11, 11, 11, 11],
    unitColumns: 3,
  },
  {
    components: 3,
    freeEnds: [23, 23, 23, 23, 23, 23],
    label: "stagger over 5 branches",
    modifier: { branches: 5, name: "stagger" },
    tJunctions: [17, 17, 17, 17, 17, 17],
    unitColumns: 4,
  },
  {
    components: 3,
    freeEnds: [29, 29, 29, 29, 29, 29],
    label: "stagger over 6 branches",
    modifier: { branches: 6, name: "stagger" },
    tJunctions: [23, 23, 23, 23, 23, 23],
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
            components: mode.components,
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
  let latticeService: MeanderLatticeService;
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
        ParallelSerpentineService,
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    generationService = await module.resolve(MeanderGenerationService);
    gridGeometryService = await module.resolve(GridGeometryService);
    latticeService = await module.resolve(MeanderLatticeService);
    renderingService = await module.resolve(SvgRenderingService);
    service = await module.resolve(BranchMotifService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  /**
   * Every horizontal run one repeat unit emits, in lattice steps and lattice
   * rows.
   *
   * The unit's own path rather than the finished drawing, because both border
   * rules now cover both of the rows a rail runs along: a rail is a subset of
   * the rule above or below it, so the document cannot say which row a mode
   * chose or how far one run reached. `path` is the seam that can, and it is
   * public.
   */
  const unitRails = (
    modifier: Modifier,
    rows: number,
  ): { rows: number[]; steps: number[] } => {
    const geometry = gridGeometryService.compute(rows);
    const runs = Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
      service.path(geometry, {
        isLastUnit: unitIndex === REPEAT_COUNT - 1,
        modifier,
        rows,
        unitIndex,
      }),
    )
      .flatMap((pathData) => parseSegments(pathData))
      .filter((segment) => segment.axis === "H");

    return {
      rows: [
        ...new Set(
          runs.map((segment) =>
            Math.round((segment.level - geometry.offset) / geometry.unit),
          ),
        ),
      ],
      steps: runs.map((segment) => (segment.to - segment.from) / geometry.unit),
    };
  };

  /** Which lattice rows one mode's own rails run along, in first-emitted order. */
  const unitRailRows = (modifier: Modifier, rows: number): number[] =>
    unitRails(modifier, rows).rows;

  /** How many lattice steps the longest of one mode's own rail runs covers. */
  const longestUnitRail = (modifier: Modifier, rows: number): number =>
    Math.max(...unitRails(modifier, rows).steps);

  /**
   * Every run of ink one mode's repeat units emit, in lattice indices rather
   * than pixels.
   *
   * The units' own paths rather than the finished drawing, for the same
   * reason {@link unitRails} reads them: the border rules span the whole
   * repeat, so a document cannot say how far one unit reached.
   */
  const unitLatticeSegments = (
    rows: number,
    modifier?: Modifier,
  ): InkSegment[] => {
    const geometry = gridGeometryService.compute(rows);
    const index = (value: number): number =>
      Math.round((value - geometry.offset) / geometry.unit);

    return Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
      service.path(geometry, {
        isLastUnit: unitIndex === REPEAT_COUNT - 1,
        rows,
        unitIndex,
        ...(modifier ? { modifier } : {}),
      }),
    )
      .flatMap((pathData) => parseSegments(pathData))
      .map((segment) => ({
        axis: segment.axis,
        from: index(segment.from),
        level: index(segment.level),
        to: index(segment.to),
      }));
  };

  /** The distinct lattice row spans one mode's vertical runs cover, as `from-to` strings. */
  const verticalSpans = (rows: number, modifier?: Modifier): string[] => [
    ...new Set(
      unitLatticeSegments(rows, modifier)
        .filter((segment) => segment.axis === "V")
        .map((segment) => `${segment.from}-${segment.to}`),
    ),
  ];

  /** Which lattice rows {@link BranchMotifService.border} rules, in ascending order. */
  const borderRows = (rows: number, modifier?: Modifier): number[] => {
    const geometry = gridGeometryService.compute(rows);

    return parseSegments(
      service.border(geometry, {
        repeatCount: REPEAT_COUNT,
        rows,
        ...(modifier ? { modifier } : {}),
      }),
    )
      .map((segment) =>
        Math.round((segment.level - geometry.offset) / geometry.unit),
      )
      .toSorted((left, right) => left - right);
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the swept space", () => {
    // 🎯 The guard against a property test that empties itself. Every
    // assertion below reads this table, so a zip that stopped lining up
    // would quietly measure fewer drawings — or none — without failing.
    it("covers every mode at every swept row count", () => {
      expect(BRANCH_CASES).toHaveLength(MODES.length * SWEPT_ROWS.length);
      expect(BRANCH_CASES).toHaveLength(36);
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

  describe("the inset figure", () => {
    // 🎯 What a rule may not do: land on top of the ink it closes the band
    // around. A rule drawn along a row a figure already occupies is
    // invisible, and it took the crenellation with it — every `stagger`
    // drawing read as the plain comb because `spineRow` only ever named a
    // border row and a rule now covered both. So each mode's figure is inset
    // by one lattice row from every rule beside it, and how many rules a
    // mode draws follows from which of its own rows are free.
    it.each([
      { label: "comb", rules: [8] },
      {
        label: "rung",
        modifier: { isLeftward: false, name: "rung" as const },
        rules: [8],
      },
      {
        label: "stagger",
        modifier: {
          branches: MINIMUM_STAGGER_BRANCHES,
          name: "stagger" as const,
        },
        rules: [0, 8],
      },
    ])("rules rows $rules for $label", ({ modifier, rules }) => {
      expect(borderRows(8, modifier)).toStrictEqual(rules);
    });

    // 🎯 `comb` and `rung` keep their rail on row 0, where it already reads
    // as the band's top border, so only the row below their free ends needs
    // a rule. `stagger` has no such row: its rail moves, so both borders are
    // ruled and the figure sits strictly between them.
    it.each([
      { label: "comb", spans: ["0-7"] },
      {
        label: "rung",
        modifier: { isLeftward: false, name: "rung" as const },
        spans: ["0-7"],
      },
      {
        label: "stagger",
        modifier: {
          branches: MINIMUM_STAGGER_BRANCHES,
          name: "stagger" as const,
        },
        spans: ["1-7"],
      },
    ])("spans rows $spans for $label", ({ modifier, spans }) => {
      expect(verticalSpans(8, modifier)).toStrictEqual(spans);
    });

    // 🎯 The crenellation, back in the ink. A rail one row clear of a border
    // is not on a ruled row, so nothing covers it and the alternation a
    // reader is meant to see is visible again.
    it("alternates a stagger rail one row clear of each border", () => {
      expect(
        unitRailRows(
          { branches: MINIMUM_STAGGER_BRANCHES, name: "stagger" },
          8,
        ),
      ).toStrictEqual([1, 7]);
    });

    // 🎯 Every lattice row of a `rung` unit carries a rung, and the stile
    // stops where they do — one row short of the rule below it.
    it("reaches a rung across every row a stile spans", () => {
      expect(
        unitLatticeSegments(8, { isLeftward: false, name: "rung" })
          .filter((segment) => segment.axis === "H")
          .map((segment) => segment.level)
          .toSorted((left, right) => left - right)
          .filter((row, index, rowsSeen) => rowsSeen.indexOf(row) === index),
      ).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe("the closed borders", () => {
    // 🎯 The one thing every mode still shares, read off the lattice rather
    // than off the path data: both border rows carry ink across every
    // lattice step of the repeat. Before this the borders were whatever a
    // mode's own rails happened to leave — `comb` ruled the top and left the
    // bottom to twelve tooth ends, `stagger` alternated, `rung` left every
    // second step of its bottom row bare — so a drawing's interior alone
    // could not say which mode drew it.

    // Which path draws each row is now the mode's business rather than this
    // assertion's. `comb` and `rung` run their own rail the full width of
    // row 0 and take one rule along the bottom; `stagger` runs neither and
    // takes both rules. Reading the lattice instead of `border` is what lets
    // one assertion cover both arrangements — the rows are closed either
    // way, and {@link BranchMotifService.border} is asserted per mode under
    // "the inset figure".
    it.each(BRANCH_CASES)(
      "$label closes both borders end to end",
      (testCase) => {
        const graph = latticeService.build(
          generationService.generate({
            repeatCount: REPEAT_COUNT,
            rows: testCase.rows,
            type: "branch",
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
      },
    );
  });

  describe("forking, loop-free ink", () => {
    // 🎯 The family's claim in the numbers it is made of. `nodes` is every
    // lattice point of the band, so it is invariant 2 measured as a count
    // rather than as a boolean — and it counts the first and last lattice
    // column too, which `channelWidthCompliant` exempts, so this family has
    // no band-termination gap at all.

    // This is where insetting the figure from its rules shows. A rule one
    // lattice row clear of the ink it closes the band around touches none of
    // it, so it is a piece of its own: `comb` and `rung` fall into two, and
    // `stagger`, which takes both rules, into three. `edges === nodes -
    // components` is what says no piece closes a loop — a forest, taken
    // through the service's own `isAcyclic` rather than restated as
    // arithmetic here. The family was a forest before either border was
    // ruled, became one connected looped piece when both were, and is a
    // forest again now; no charter invariant is about a loop, so this is the
    // family's shape as a graph rather than its compliance.

    // `freeEnds` is not structural. It is what keeps the figure reading as a
    // meander rather than as a grille, and every mode has some again: a
    // tooth's far end reaches for the rule below it and stops one row short.
    it.each(BRANCH_CASES)(
      "$label draws $components pieces with no loop and $freeEnds free ends",
      (testCase) => {
        const document = generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows: testCase.rows,
          type: "branch",
          ...(testCase.modifier ? { modifier: testCase.modifier } : {}),
        });
        const connectivity = topologyService.connectivity(document);
        const nodes = testCase.latticeColumns * (testCase.rows + 1);

        expect({
          acyclic: topologyService.isAcyclic(connectivity),
          connectivity,
          oneComponent: topologyService.isOneComponent(connectivity),
        }).toStrictEqual({
          acyclic: true,
          connectivity: {
            components: testCase.components,
            edges: nodes - testCase.components,
            freeEnds: testCase.freeEnds,
            nodes,
          },
          oneComponent: false,
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
    // would still fork, still be orthogonal, still be the same height.
    it.each([
      { branches: MINIMUM_STAGGER_BRANCHES, unitColumns: 3 },
      { branches: 5, unitColumns: 4 },
      { branches: 6, unitColumns: 5 },
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

  describe("the stagger crenel", () => {
    /**
     * A `stagger` drawn straight through the motif service, at a branch
     * count `MeanderGenerationService.generate` refuses. The bound lives on
     * that service rather than here, which is what lets the reason for the
     * floor be measured at the value it excludes.
     *
     * The border rules are appended exactly as
     * `MeanderGenerationService.buildPaths` appends them, so what is measured
     * is the drawing the family would make at that branch count rather than
     * its units alone.
     */
    const belowBranchMinimum = (branches: number, rows: number): string => {
      const geometry = gridGeometryService.compute(rows);
      const modifier: Modifier = { branches, name: "stagger" };
      const pattern = { modifier, repeatCount: REPEAT_COUNT, rows };
      const format = (value: number): string =>
        gridGeometryService.formatCoordinate(value);

      return renderingService.render({
        height: format(
          geometry.offset + geometry.height + geometry.strokeWidth / 2,
        ),
        paths: [
          ...Array.from({ length: REPEAT_COUNT }, (_value, unitIndex) =>
            service.path(geometry, {
              isLastUnit: unitIndex === REPEAT_COUNT - 1,
              modifier,
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

    // 🎯 The parameter's whole job, read off the ink rather than off the
    // modifier: a rail joins exactly `branches` teeth before it changes
    // side. Measured as the longest horizontal run in lattice steps, which
    // is one fewer than the teeth it touches — and taken from the units'
    // own paths, since the border rules span the whole repeat and would be
    // the longest run in every drawing whatever the crenel does.
    it.each([
      { branches: MINIMUM_STAGGER_BRANCHES },
      { branches: 5 },
      { branches: 8 },
    ])("joins $branches branches per rail run", ({ branches }) => {
      expect(longestUnitRail({ branches, name: "stagger" }, 5)).toBeCloseTo(
        branches - 1,
        5,
      );
    });

    // 🎯 What is left of `MINIMUM_STAGGER_BRANCHES`'s reason, measured at
    // the value it excludes — and what is no longer left of it.

    // The unit width still coincides: a three-branch crenel's rail spans
    // exactly `BRANCH_UNIT_COLUMNS` lattice steps, which is the plain comb's
    // own unit width, and that is what once isolated three. The collapse it
    // was isolated *for* is gone. While every rail ran along a border row
    // and both borders were ruled, a three-branch run lay wholly inside a
    // rule and what was left was a plain comb. A `stagger` rail is now one
    // row clear of both rules, so nothing swallows it: the three-branch
    // figure is a distinct drawing, differing from the comb of the same
    // width in components, edges, free ends, and forks alike.

    // The bound is therefore retained rather than derived, and this is the
    // measurement that says so. Restoring three is a decision about which
    // drawings the corpus should commit, not a correction of a degeneracy.
    it("draws a distinct figure at three branches", () => {
      const threeBranch = belowBranchMinimum(3, 5);
      const plain = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows: 5,
        type: "branch",
      });

      expect(longestUnitRail({ branches: 3, name: "stagger" }, 5)).toBe(
        BRANCH_UNIT_COLUMNS,
      );
      expect(topologyService.connectivity(threeBranch)).not.toStrictEqual(
        topologyService.connectivity(plain),
      );
      expect(topologyService.connectivity(threeBranch)).toStrictEqual({
        components: 3,
        edges: 69,
        freeEnds: 11,
        nodes: BRANCH_UNIT_COLUMNS * REPEAT_COUNT * 6,
      });
      expect(topologyService.measure(threeBranch).inkTJunctions).toBe(5);
    });

    it.each([
      { branches: 3, reason: "below the family's own floor" },
      { branches: 13, reason: "past the shared maximum" },
      { branches: 3.5, reason: "not a whole number" },
    ])("refuses $branches branches, $reason", ({ branches }) => {
      expect(() =>
        generationService.generate({
          modifier: { branches, name: "stagger" },
          repeatCount: REPEAT_COUNT,
          rows: 5,
          type: "branch",
        }),
      ).toThrow(/branches must be between 4 and 12/u);
    });
  });

  describe("the structural minimum", () => {
    /**
     * A drawing rendered straight through the motif service, at row counts
     * `MeanderGenerationService.generate` refuses. The bounds live on that
     * service rather than here, which is what lets the reason for the
     * minimum be measured at the row count it excludes — for the mode the
     * minimum is set by, and for the two it is not.
     *
     * The border rules are appended exactly as
     * `MeanderGenerationService.buildPaths` appends them, so what is measured
     * is the drawing the family would make at that row count rather than its
     * units alone.
     */
    const belowMinimum = (rows: number, modifier?: Modifier): string => {
      const geometry = gridGeometryService.compute(rows);
      const pattern = {
        repeatCount: REPEAT_COUNT,
        rows,
        ...(modifier ? { modifier } : {}),
      };
      const format = (value: number): string =>
        gridGeometryService.formatCoordinate(value);

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
              ...(modifier ? { modifier } : {}),
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

    // 🎯 The whole reason the family's minimum is 3, measured at the row
    // count it excludes. `stagger` is the mode inset from *both* borders, so
    // it needs two free lattice rows between them for a tooth to have any
    // length at all. A 2-row band leaves it one: every tooth collapses to
    // zero length, no vertical ink is drawn anywhere, and the drawing is
    // three parallel rules with not one fork in it — the crenellation the
    // mode exists for absent entirely.
    it.each([
      { branches: MINIMUM_STAGGER_BRANCHES, unitColumns: 3 },
      { branches: 5, unitColumns: 4 },
    ])(
      "collapses a $branches-branch stagger to parallel rules at two rows",
      ({ branches, unitColumns }) => {
        const document = belowMinimum(2, { branches, name: "stagger" });
        const graph = latticeService.build(document);
        const nodes = unitColumns * REPEAT_COUNT * 3;

        expect({
          connectivity: topologyService.connectivity(document),
          forks: topologyService.measure(document).inkTJunctions,
          verticalSteps: graph.verticalEdges.size,
        }).toStrictEqual({
          connectivity: {
            components: 3,
            edges: nodes - 3,
            freeEnds: 6,
            nodes,
          },
          forks: 0,
          verticalSteps: 0,
        });
      },
    );

    // 🎯 The other half of the minimum's reason: the family takes the
    // stricter of its modes, which means the other two must actually be
    // drawable at two rows. They are — both fork there, `comb` at exactly
    // the count it holds at every other row count, and `rung` at the first
    // step of its own climb. So 3 is `stagger`'s floor rather than the
    // lattice's.
    it.each([
      {
        components: 2,
        freeEnds: 14,
        label: "comb",
        nodes: LATTICE_COLUMNS * 3,
        tJunctions: 10,
      },
      {
        components: 2,
        freeEnds: 9,
        label: "rung",
        modifier: { isLeftward: false, name: "rung" as const },
        nodes: LATTICE_COLUMNS * 3,
        tJunctions: 5,
      },
    ])("still draws $label at two rows", (testCase) => {
      const document = belowMinimum(2, testCase.modifier);

      expect(topologyService.connectivity(document)).toStrictEqual({
        components: testCase.components,
        edges: testCase.nodes - testCase.components,
        freeEnds: testCase.freeEnds,
        nodes: testCase.nodes,
      });
      expect(topologyService.measure(document).inkTJunctions).toBe(
        testCase.tJunctions,
      );
    });

    // 🎯 `rung`'s forks decompose into two terms: one per stile per lattice
    // row strictly inside the stile's own span, and `repeatCount - 1` where
    // the rail arrives at a stile's head — the stile at the drawing's far
    // edge has no rail beyond it, so it is one fewer than the number of
    // stiles. The stile spans rows 0 through `rows - 1`, so it has `rows - 2`
    // interior rows and the first term appears at 3 rows rather than at 2.
    it.each([
      { railForks: REPEAT_COUNT - 1, rows: 2, stileForks: 0 },
      { railForks: REPEAT_COUNT - 1, rows: 3, stileForks: REPEAT_COUNT },
      { railForks: REPEAT_COUNT - 1, rows: 4, stileForks: REPEAT_COUNT * 2 },
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

    // 🎯 The drawing below the minimum still fills space, so no charter gate
    // would have caught it — its three rules paint every lattice point of
    // the band between them. What it does not do is fork, which the
    // relaxation gate in `meander-topology.service.integration.test.ts`
    // *would* have caught, from the other direction: a family declared to
    // relax `no-branching` and drawing a document that branches nowhere
    // fails there. So this minimum is both a legibility floor, as `cross`'s
    // is, and the thing keeping that declaration true.
    it("still measures as space-filling at two rows", () => {
      const document = belowMinimum(2, {
        branches: MINIMUM_STAGGER_BRANCHES,
        name: "stagger",
      });

      expect(topologyService.measure(document).channelWidthCompliant).toBe(
        true,
      );
    });

    it("is refused by the generation service all the same", () => {
      expect(() =>
        generationService.generate({
          modifier: { branches: MINIMUM_STAGGER_BRANCHES, name: "stagger" },
          repeatCount: REPEAT_COUNT,
          rows: 2,
          type: "branch",
        }),
      ).toThrow(/rows must be between 3 and 12/u);
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
