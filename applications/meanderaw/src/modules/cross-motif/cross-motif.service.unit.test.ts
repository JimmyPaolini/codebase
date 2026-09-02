import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MeanderLatticeService } from "../meander-topology/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import { CROSS_UNIT_COLUMNS } from "./cross-motif.constants";
import { CrossMotifService } from "./cross-motif.service";

import type { GenerationParameters } from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching the sweep's own default. */
const REPEAT_COUNT = 6;

/**
 * Decimal places a measured pixel distance is compared to. Coordinates are
 * rounded to five places before they reach the document, so at a row count
 * whose grid unit does not divide the canvas evenly (7) a distance read back
 * out of two of them can land a hundred-thousandth away from the stroke
 * width it should equal.
 */
const TOLERANCE_DIGITS = 4;

/** One horizontal run of a document's path data, in raw pixel coordinates. */
interface HorizontalRun {
  readonly fromX: number;
  readonly toX: number;
  readonly y: number;
}

/** One inked interval along a single column, in pixels, cap extensions included. */
interface InkInterval {
  readonly from: number;
  readonly to: number;
}

/** One vertical run of a document's path data, in raw pixel coordinates. */
interface VerticalRun {
  readonly fromY: number;
  readonly toY: number;
  readonly x: number;
}

/** Every `M x y H x` and `M x y V y` run one document draws, as raw pixel coordinates. */
const runs = (
  document: string,
): { horizontal: HorizontalRun[]; vertical: VerticalRun[] } => {
  const horizontal: HorizontalRun[] = [];
  const vertical: VerticalRun[] = [];

  for (const match of document.matchAll(/(?<=\sd=")[^"]*(?=")/gu)) {
    let currentX = 0;
    let currentY = 0;

    for (const command of match[0].matchAll(
      /M(-?[\d.]+) (-?[\d.]+)|H(-?[\d.]+)|V(-?[\d.]+)/gu,
    )) {
      const moveX = command[1];
      const moveY = command[2];
      const toX = command[3];
      const toY = command[4];

      if (moveX !== undefined && moveY !== undefined) {
        currentX = Number(moveX);
        currentY = Number(moveY);
      } else if (toX !== undefined) {
        horizontal.push({ fromX: currentX, toX: Number(toX), y: currentY });
        currentX = Number(toX);
      } else if (toY !== undefined) {
        vertical.push({ fromY: currentY, toY: Number(toY), x: currentX });
        currentY = Number(toY);
      }
    }
  }

  return { horizontal, vertical };
};

/** The one stroke width the document declares. */
const strokeWidthOf = (document: string): number =>
  Number(/stroke-width="([\d.]+)"/u.exec(document)?.[1]);

/**
 * Every white gap along one vertical line of the drawing, measured in
 * pixels from the rendered document rather than derived from the geometry
 * that produced it. Ink along that line is whatever the column's own
 * vertical runs paint (extended by the square line cap at each end) plus
 * every horizontal run that passes across it.
 */
const whiteGapsDownColumn = (
  document: string,
  columnX: number,
): { from: number; width: number }[] => {
  const strokeWidth = strokeWidthOf(document);
  const half = strokeWidth / 2;
  const { horizontal, vertical } = runs(document);
  const intervals: InkInterval[] = [
    ...vertical
      .filter((run) => Math.abs(run.x - columnX) < half)
      .map((run) => ({
        from: Math.min(run.fromY, run.toY) - half,
        to: Math.max(run.fromY, run.toY) + half,
      })),
    ...horizontal
      .filter(
        (run) =>
          Math.min(run.fromX, run.toX) - half <= columnX &&
          columnX <= Math.max(run.fromX, run.toX) + half,
      )
      .map((run) => ({ from: run.y - half, to: run.y + half })),
  ].toSorted((left, right) => left.from - right.from);

  const gaps: { from: number; width: number }[] = [];
  let reached = intervals[0]?.to ?? 0;

  for (const interval of intervals.slice(1)) {
    if (interval.from > reached) {
      gaps.push({ from: reached, width: interval.from - reached });
    }

    reached = Math.max(reached, interval.to);
  }

  return gaps;
};

/**
 * Where the first warp bar runs, in pixels. The grid offset is half a stroke
 * width and the bar sits one grid unit — two stroke widths — in from it.
 */
const firstBarColumnX = (document: string): number => {
  const strokeWidth = strokeWidthOf(document);

  return strokeWidth / 2 + 2 * strokeWidth;
};

/**
 * Where the weft rail runs, in pixels: read back as the middle one of the
 * three runs that span the whole canvas, the other two being the band's own
 * borders.
 */
const railYOf = (document: string): number => {
  const width = Number(/\swidth="([\d.]+)"/u.exec(document)?.[1]);
  const strokeWidth = strokeWidthOf(document);
  const fullWidth = runs(document)
    .horizontal.filter(
      (run) =>
        Math.abs(run.fromX - strokeWidth / 2) < strokeWidth / 2 &&
        Math.abs(run.toX - (width - strokeWidth / 2)) < strokeWidth / 2,
    )
    .map((run) => run.y)
    .toSorted((left, right) => left - right);

  return fullWidth[1] ?? 0;
};

/** The lattice a document's ink reduces to, as the topology service reads it. */
const latticeOf = (
  document: string,
): { edges: Set<string>; nodes: Set<string> } => {
  const graph = new MeanderLatticeService().build(document);

  return {
    edges: new Set([
      ...[...graph.horizontalEdges].map((key) => `H${key}`),
      ...[...graph.verticalEdges].map((key) => `V${key}`),
    ]),
    nodes: new Set(graph.nodes),
  };
};

// 🧪 Tests

describe(CrossMotifService, () => {
  let service: CrossMotifService;
  let generationService: MeanderGenerationService;
  let gridGeometryService: GridGeometryService;
  let renderingService: SvgRenderingService;
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
        MotifTransformsService,
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    service = await module.resolve(CrossMotifService);
    generationService = await module.resolve(MeanderGenerationService);
    gridGeometryService = await module.resolve(GridGeometryService);
    renderingService = await module.resolve(SvgRenderingService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("rightEdge", () => {
    it("spans two grid levels per repeat plus one, so no bar sits on the canvas edge", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.rightEdge(geometry, { repeatCount: REPEAT_COUNT, rows: 6 }),
      ).toBe(
        geometry.offset +
          (CROSS_UNIT_COLUMNS * REPEAT_COUNT + 1) * geometry.unit,
      );
    });
  });

  describe("solid mode", () => {
    it.each([6, 7, 8])(
      "crosses once per bar at %i rows, and nothing branches",
      (rows) => {
        const parameters: GenerationParameters = {
          repeatCount: REPEAT_COUNT,
          rows,
          type: "cross",
        };

        expect(
          topologyService.measure(generationService.generate(parameters)),
        ).toMatchObject({
          channelWidthCompliant: true,
          inkTJunctions: 0,
          inkXJunctions: 2 * REPEAT_COUNT,
        });
      },
    );

    it.each([6, 7, 8])(
      "leaves a bar unbroken at %i rows, so its only white is the band's own two channels",
      (rows) => {
        const document = generationService.generate({
          repeatCount: REPEAT_COUNT,
          rows,
          type: "cross",
        });
        const strokeWidth = strokeWidthOf(document);
        const gaps = whiteGapsDownColumn(document, firstBarColumnX(document));

        // 🎯 One channel between the top border and the bar's own top, one
        // between its bottom and the bottom border, and nothing at the
        // crossing — the rail and the bar share their ink there.
        expect(gaps).toHaveLength(2);

        for (const gap of gaps) {
          expect(gap.width).toBeCloseTo(strokeWidth, TOLERANCE_DIGITS);
        }
      },
    );
  });

  describe("interrupted mode", () => {
    it.each([6, 7, 8])(
      "breaks the bar either side of the rail at %i rows, so no crossing survives",
      (rows) => {
        const parameters: GenerationParameters = {
          modifier: { name: "interrupted" },
          repeatCount: REPEAT_COUNT,
          rows,
          type: "cross",
        };

        expect(
          topologyService.measure(generationService.generate(parameters)),
        ).toMatchObject({
          channelWidthCompliant: true,
          inkTJunctions: 0,
          inkXJunctions: 0,
        });
      },
    );

    it.each([6, 7, 8])(
      "opens two further gaps at %i rows, one either side of the rail, each exactly one stroke width",
      (rows) => {
        const document = generationService.generate({
          modifier: { name: "interrupted" },
          repeatCount: REPEAT_COUNT,
          rows,
          type: "cross",
        });
        const strokeWidth = strokeWidthOf(document);
        const gaps = whiteGapsDownColumn(document, firstBarColumnX(document));

        // 🎯 The band's own two channels, plus the break either side of the
        // crossing — and every one of the four is the same width. That is
        // the cost this family pays: the interlace gap is exactly the
        // ordinary channel, so nothing about its width says "under".
        expect(gaps).toHaveLength(4);

        for (const gap of gaps) {
          expect(gap.width).toBeCloseTo(strokeWidth, TOLERANCE_DIGITS);
        }

        const railY = railYOf(document);

        expect(gaps[1]?.from).toBeCloseTo(
          railY - 3 * (strokeWidth / 2),
          TOLERANCE_DIGITS,
        );
        expect(gaps[2]?.from).toBeCloseTo(
          railY + strokeWidth / 2,
          TOLERANCE_DIGITS,
        );
      },
    );

    it("gives up ink the solid rendering draws, and paints no lattice point less", () => {
      const parameters = {
        repeatCount: REPEAT_COUNT,
        rows: 8,
        type: "cross",
      } as const;
      const solid = latticeOf(generationService.generate(parameters));
      const interrupted = latticeOf(
        generationService.generate({
          ...parameters,
          modifier: { name: "interrupted" },
        }),
      );
      const givenUp = [...solid.edges].filter(
        (edge) => !interrupted.edges.has(edge),
      );

      // 🎯 Every step of ink the interrupted rendering draws, the solid one
      // draws too: the break removes and never adds. What it removes is the
      // grid level either side of each of the 12 crossings.
      expect(
        [...interrupted.edges].filter((edge) => !solid.edges.has(edge)),
      ).toStrictEqual([]);
      expect(givenUp).toHaveLength(2 * (CROSS_UNIT_COLUMNS * REPEAT_COUNT));
      expect(givenUp.every((edge) => edge.startsWith("V"))).toBe(true);

      // 🎯 And no lattice point loses its ink, which is invariant 2 stated
      // the way the topology service measures it.
      expect([...interrupted.nodes].toSorted()).toStrictEqual(
        [...solid.nodes].toSorted(),
      );
    });
  });

  // 🎯 Why `STRUCTURAL_MINIMUM_ROWS.cross` is 6 rather than the 4 solid mode
  // alone would allow — pinned against the geometry, not against the
  // constant, so the number and its stated reason cannot drift apart.
  //
  // These row counts are below what `MeanderGenerationService.generate`
  // accepts, which is the point: the drawings are reached through the motif
  // service directly, because the whole question is what the constant is
  // refusing on the family's behalf.
  describe("below the structural minimum", () => {
    /**
     * One unit's interrupted path at a row count `generate` would reject,
     * plus the whole document assembled the way the generation service
     * assembles one, so the topology service can measure it.
     */
    const belowMinimum = (
      rows: number,
    ): { document: string; unitPath: string } => {
      const geometry = gridGeometryService.compute(rows);
      const unitPaths = Array.from({ length: REPEAT_COUNT }, (_value, index) =>
        service.path(geometry, {
          isLastUnit: index === REPEAT_COUNT - 1,
          modifier: { name: "interrupted" },
          rows,
          unitIndex: index,
        }),
      );
      const format = (value: number): string =>
        gridGeometryService.formatCoordinate(value);

      return {
        document: renderingService.render({
          height: format(
            geometry.offset + geometry.height + geometry.strokeWidth / 2,
          ),
          paths: [
            ...unitPaths,
            service.border(geometry, { repeatCount: REPEAT_COUNT, rows }),
          ],
          strokeWidth: format(geometry.strokeWidth),
          width: format(
            service.rightEdge(geometry, { repeatCount: REPEAT_COUNT, rows }) +
              geometry.strokeWidth / 2,
          ),
        }),
        unitPath: unitPaths[0] ?? "",
      };
    };

    /** Whether a bar's first run starts and ends on the same coordinate — a square cap and nothing else. */
    const firstRunCollapses = (unitPath: string): boolean => {
      const run = /M[\d.]+ ([\d.]+)V([\d.]+)/u.exec(unitPath);

      expect(run).not.toBeNull();

      return run?.[1] === run?.[2];
    };

    it.each([
      { collapses: true, rows: 4 },
      { collapses: true, rows: 5 },
      { collapses: false, rows: 6 },
    ])(
      "collapses the bar's upper remnant to a dot at $rows rows: $collapses",
      ({ collapses, rows }) => {
        expect(firstRunCollapses(belowMinimum(rows).unitPath)).toBe(collapses);
      },
    );

    it.each([4, 5])(
      "still measures as space-filling at %i rows, so no gate would catch the collapse",
      (rows) => {
        expect(
          topologyService.measure(belowMinimum(rows).document),
        ).toMatchObject({
          channelWidthCompliant: true,
          inkTJunctions: 0,
          inkXJunctions: 0,
        });
      },
    );

    it("is refused by the generation service all the same, at the family's own minimum", () => {
      expect(() =>
        generationService.generate({
          modifier: { name: "interrupted" },
          repeatCount: REPEAT_COUNT,
          rows: 5,
          type: "cross",
        }),
      ).toThrow(/rows must be between 6 and 12/u);
    });
  });

  describe("the band", () => {
    it("keeps the canvas height every other family uses", () => {
      const solid = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows: 6,
        type: "cross",
      });
      const snake = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows: 6,
        type: "snake",
      });
      const heightOf = (document: string): string =>
        /\sheight="([\d.]+)"/u.exec(document)?.[1] ?? "";

      expect(heightOf(solid)).toBe(heightOf(snake));
    });

    it("draws only orthogonal moves", () => {
      const document = generationService.generate({
        repeatCount: REPEAT_COUNT,
        rows: 7,
        type: "cross",
      });
      const commands = [...document.matchAll(/(?<=\sd=")[^"]*(?=")/gu)]
        .flatMap((match) => [...match[0].matchAll(/[A-Za-z]/gu)])
        .map((match) => match[0]);

      expect([...new Set(commands)].toSorted()).toStrictEqual(["H", "M", "V"]);
    });
  });
});
