import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { CANVAS_HEIGHT } from "../grid-geometry/grid-geometry.constants";
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

/** Every row count the sweep draws this family at: its structural minimum through the sweep maximum. */
const SWEPT_ROWS: readonly number[] = [3, 4, 5, 6, 7, 8];

/**
 * Every mode the family draws — no modifier, and each of the two the family
 * declares compatible — beside the ink T-junction count each one produces at
 * every swept row count, in {@link SWEPT_ROWS} order.
 *
 * These eighteen numbers are the table `README.md` publishes under "The
 * Negative Space Family", and this is the only thing making that table true.
 * The corridor-identity test in
 * `meander-topology.service.integration.test.ts` equates two computed values
 * against each other, so it would still pass if both drifted together, and it
 * covers only the fifteen drawings whose source the survey enumerated — the
 * 8-row column has no committed source to be compared against at all. Written
 * out here, every published figure is the output of an assertion rather than
 * prose standing beside one.
 */
const MODES: readonly {
  readonly modifier?: Modifier;
  readonly tJunctions: readonly number[];
}[] = [
  { tJunctions: [38, 48, 58, 68, 78, 88] },
  { modifier: { name: "brick" }, tJunctions: [30, 40, 50, 60, 70, 80] },
  { modifier: { name: "ruled" }, tJunctions: [16, 16, 24, 24, 32, 32] },
];

/** Every swept drawing, as the parameters that produce it, the branching it owes, and a label to read it back by. */
const SWEEP: readonly {
  label: string;
  parameters: GenerationParameters;
  tJunctions: number;
}[] = MODES.flatMap(({ modifier, tJunctions }) =>
  SWEPT_ROWS.map((rows, index) => ({
    label: `${rows} rows${modifier ? ` with ${modifier.name}` : ""}`,
    parameters: {
      repeatCount: REPEAT_COUNT,
      rows,
      type: "negative" as const,
      ...(modifier ? { modifier } : {}),
    },
    tJunctions: tJunctions[index] ?? 0,
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
          [...new Set(commands.map((match) => match[0]))].toSorted(),
        ).toStrictEqual(["H", "M", "V"]);
      },
    );
  });

  describe("charter invariant 3, relaxed on purpose", () => {
    // 🎯 The guard against the table above vacating: an entry gone missing
    // would read back as a `?? 0` fallback, and zero asserted against a
    // drawing that branches would fail loudly — but only if something checks
    // the table is the length and shape it claims to be.
    it("owes a published branching count for every drawing the sweep commits", () => {
      expect(SWEEP).toHaveLength(18);
      expect(SWEEP.filter(({ tJunctions }) => tJunctions <= 0)).toStrictEqual(
        [],
      );
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

    it.each(SWEEP)("$label does not cross", ({ parameters }) => {
      expect(
        topologyService.measure(generationService.generate(parameters))
          .inkXJunctions,
      ).toBe(0);
    });
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
    // 🎯 A band's height is decided by `rows` alone. Comparing against
    // `mosaic` at the same row count is what makes that concrete: the two
    // families draw entirely different things and must still declare the
    // same canvas height, because both take it from the shared geometry.
    it.each(SWEEP)(
      "$label is as tall as a mosaic of the same rows",
      ({ parameters }) => {
        const declared = height(generationService.generate(parameters));

        // 🎯 Two independent statements of the same fact, so neither can pass
        // by accident: the concrete number the shared geometry implies —
        // `CANVAS_HEIGHT` plus half a grid unit of stroke margin — and the
        // height a completely different family declares at the same rows.
        expect(declared).toBeCloseTo(
          CANVAS_HEIGHT + CANVAS_HEIGHT / parameters.rows / 2,
          TOLERANCE_DIGITS,
        );
        expect(declared).toBe(
          height(
            generationService.generate({
              repeatCount: REPEAT_COUNT,
              rows: parameters.rows,
              type: "mosaic",
            }),
          ),
        );
      },
    );

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
