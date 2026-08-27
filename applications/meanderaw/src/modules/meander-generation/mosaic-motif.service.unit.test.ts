import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { COORDINATE_ROUNDING_TOLERANCE } from "../../../testing/path-data";

import { GridGeometryService } from "./grid-geometry.service";
import { MosaicMotifService } from "./mosaic-motif.service";
import { MotifTransformsService } from "./motif-transforms.service";

import type { Modifier, MotifUnit } from "./meander-generation.types";

// 🔧 Configuration

/** One drawn stroke of a `mosaic` path, as the two endpoints it was traced between. */
interface PathSegment {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/** Re-traces a `mosaic` path attribute back into the segments it draws, in order. */
const parseSegments = (pathData: string): PathSegment[] => {
  const tokens = pathData.match(/[MVH][\d.]+(?: [\d.]+)?/g) ?? [];
  const segments: PathSegment[] = [];
  let currentX = 0;
  let currentY = 0;

  for (const token of tokens) {
    const numbers = token.slice(1).split(" ").map(Number);
    const [first = 0, second = 0] = numbers;

    if (token.startsWith("M")) {
      currentX = first;
      currentY = second;
      continue;
    }

    const fromX = currentX;
    const fromY = currentY;

    if (token.startsWith("H")) {
      currentX = first;
    } else {
      currentY = first;
    }

    segments.push({ fromX, fromY, toX: currentX, toY: currentY });
  }

  return segments;
};

/**
 * The longest unfilled vertical stretch any single column of a `mosaic` path
 * leaves behind, in pixels. Every segment is inflated by half a stroke width
 * in both directions, since `stroke-linecap="square"` extends each stroke
 * that far past its own endpoints, and the two cap ticks count as ink for
 * every column they span.
 */
const longestBlank = (pathData: string, strokeWidth: number): number => {
  const half = strokeWidth / 2;
  const segments = parseSegments(pathData);
  const columns = new Set(
    segments
      .filter((segment) => segment.fromX === segment.toX)
      .map((segment) => segment.fromX),
  );

  if (columns.size === 0) {
    throw new Error(`No column drawn in path data: ${pathData}`);
  }

  let longest = 0;

  for (const column of columns) {
    const spans = segments
      .filter(
        (segment) =>
          Math.min(segment.fromX, segment.toX) - half <= column &&
          column <= Math.max(segment.fromX, segment.toX) + half,
      )
      .map((segment) => ({
        from: Math.min(segment.fromY, segment.toY) - half,
        to: Math.max(segment.fromY, segment.toY) + half,
      }))
      .toSorted((first, second) => first.from - second.from);

    let filledTo = spans[0]?.to ?? 0;

    for (const span of spans) {
      longest = Math.max(longest, span.from - filledTo);
      filledTo = Math.max(filledTo, span.to);
    }
  }

  return longest;
};

/** One `mosaic` variant the CLI can produce: a label, and the modifier that produces it. */
interface MosaicVariant {
  readonly label: string;
  readonly modifier?: Modifier;
}

const variants: readonly MosaicVariant[] = [
  { label: "plain" },
  { label: "alternated period 1", modifier: { name: "alternated", period: 1 } },
  { label: "alternated period 2", modifier: { name: "alternated", period: 2 } },
  { label: "alternated period 3", modifier: { name: "alternated", period: 3 } },
  { label: "dot bounce", modifier: { name: "dot", shape: "bounce" } },
  { label: "dot up", modifier: { name: "dot", shape: "up" } },
  { label: "split", modifier: { name: "split" } },
];

const rowsValues = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Builds one repeat unit's options, leaving `modifier` off entirely for the plain variant. */
const motifUnit = (
  variant: MosaicVariant,
  rows: number,
  unitIndex: number,
): MotifUnit =>
  variant.modifier
    ? { isLastUnit: false, modifier: variant.modifier, rows, unitIndex }
    : { isLastUnit: false, rows, unitIndex };

/**
 * How far right a unit's two cap ticks reach, and how far right its own
 * marks do. The caps are the only segments drawn on the outermost grid
 * levels — the bar spans levels 1 through `rows - 1` and every dot sits
 * inside that — so the extreme `fromY` values separate the two without
 * needing to re-derive either coordinate from the geometry.
 */
const rightmostReach = (pathData: string): { caps: number; marks: number } => {
  const segments = parseSegments(pathData);
  const levels = segments.map((segment) => segment.fromY);
  const capLevels = new Set([Math.max(...levels), Math.min(...levels)]);
  const rightmostOf = (of: PathSegment[]): number =>
    Math.max(...of.map((segment) => Math.max(segment.fromX, segment.toX)));

  return {
    caps: rightmostOf(
      segments.filter((segment) => capLevels.has(segment.fromY)),
    ),
    marks: rightmostOf(
      segments.filter((segment) => !capLevels.has(segment.fromY)),
    ),
  };
};

/** The same options as {@link motifUnit}, marked as the pattern's last unit. */
const lastMotifUnit = (
  variant: MosaicVariant,
  rows: number,
  unitIndex: number,
): MotifUnit => ({ ...motifUnit(variant, rows, unitIndex), isLastUnit: true });

// 🧪 Tests

describe(MosaicMotifService, () => {
  let service: MosaicMotifService;
  let gridGeometryService: GridGeometryService;
  let motifTransformsService: MotifTransformsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MosaicMotifService,
        GridGeometryService,
        MotifTransformsService,
      ],
    }).compile();

    service = await module.resolve(MosaicMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
    motifTransformsService = await module.resolve(MotifTransformsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("path", () => {
    it("draws the first unit's bar, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 0 }),
      ).toBe("M3 15V51M3 3H15M3 63H15");
    });

    it("shifts each subsequent unit by one grid unit, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 1 }),
      ).toBe("M15 15V51M15 3H27M15 63H27");

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 11 }),
      ).toBe("M135 15V51M135 3H147M135 63H147");
    });

    it("draws a shallower bar at 6 rows, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 6, unitIndex: 0 }),
      ).toBe("M2.5 12.5V52.5M2.5 2.5H12.5M2.5 62.5H12.5");
    });

    it("draws a deeper bar at 8 rows, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 8, unitIndex: 0 }),
      ).toBe("M1.875 9.375V54.375M1.875 1.875H9.375M1.875 61.875H9.375");
    });

    it("draws a plain rectangle-free bar at the structural minimum of 3 rows", () => {
      const geometry = gridGeometryService.compute(3);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 3, unitIndex: 0 }),
      ).toBe("M5 25V45M5 5H25M5 65H25");
    });

    it("draws period 1's zigzag with both columns filled against the caps at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "alternated", period: 1 },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe("M3 15V27M3 39V51M15 15V51M3 3H27M3 63H27");
    });

    it("advances two real columns per unit index for the alternated modifier", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "alternated", period: 1 },
          rows: 5,
          unitIndex: 1,
        }),
      ).toBe("M27 15V27M27 39V51M39 15V51M27 3H51M27 63H51");
    });

    it("draws period 1's zigzag at 8 rows, where the own column's final dash absorbs the gap that would have ended it", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "alternated", period: 1 },
          rows: 8,
          unitIndex: 0,
        }),
      ).toBe(
        "M1.875 9.375V16.875M1.875 24.375V31.875M1.875 39.375V54.375M9.375 9.375V24.375M9.375 31.875V39.375M9.375 46.875V54.375M1.875 1.875H16.875M1.875 61.875H16.875",
      );
    });

    it("widens the tile to 2 * period columns at period 2, filling each half with a period-1-style zigzag pair", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "alternated", period: 2 },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe(
        "M3 15V27M3 39V51M27 15V51M15 15V27M15 39V51M39 15V51M3 3H51M3 63H51",
      );
    });

    it("advances the tile by 2 * period columns per unit index at period 2", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "alternated", period: 2 },
          rows: 5,
          unitIndex: 1,
        }),
      ).toBe(
        "M51 15V27M51 39V51M75 15V51M63 15V27M63 39V51M87 15V51M51 3H99M51 63H99",
      );
    });

    it("draws the bounce dot phases at 6 rows: a whole bar per column with one grid unit lifted out around that column's dot", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "bounce" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.5 12.5V42.5M2.5 52.5H2.5M12.5 12.5V22.5M12.5 42.5V52.5M12.5 32.5H12.5M22.5 22.5V52.5M22.5 12.5H22.5M32.5 12.5V22.5M32.5 42.5V52.5M32.5 32.5H32.5M2.5 2.5H42.5M2.5 62.5H42.5",
      );
    });

    it("advances the tile by the bounce period's column count per unit index", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "bounce" },
          rows: 6,
          unitIndex: 1,
        }),
      ).toBe(
        "M42.5 12.5V42.5M42.5 52.5H42.5M52.5 12.5V22.5M52.5 42.5V52.5M52.5 32.5H52.5M62.5 22.5V52.5M62.5 12.5H62.5M72.5 12.5V22.5M72.5 42.5V52.5M72.5 32.5H72.5M42.5 2.5H82.5M42.5 62.5H82.5",
      );
    });

    it("draws the bounce dot phases at a deeper row count, one more column per period", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "bounce" },
          rows: 8,
          unitIndex: 0,
        }),
      ).toBe(
        "M1.875 9.375V46.875M1.875 54.375H1.875M9.375 9.375V31.875M9.375 46.875V54.375M9.375 39.375H9.375M16.875 9.375V16.875M16.875 31.875V54.375M16.875 24.375H16.875M24.375 16.875V54.375M24.375 9.375H24.375M31.875 9.375V16.875M31.875 31.875V54.375M31.875 24.375H31.875M39.375 9.375V31.875M39.375 46.875V54.375M39.375 39.375H39.375M1.875 1.875H46.875M1.875 61.875H46.875",
      );
    });

    it("draws the up dot phases at 6 rows: the same first three columns as bounce, reset at a 3-column period instead of mirrored at 4", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "up" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.5 12.5V42.5M2.5 52.5H2.5M12.5 12.5V22.5M12.5 42.5V52.5M12.5 32.5H12.5M22.5 22.5V52.5M22.5 12.5H22.5M2.5 2.5H32.5M2.5 62.5H32.5",
      );
    });

    it("draws the up dot phases at a deeper row count, one more column per period", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "up" },
          rows: 8,
          unitIndex: 0,
        }),
      ).toBe(
        "M1.875 9.375V46.875M1.875 54.375H1.875M9.375 9.375V31.875M9.375 46.875V54.375M9.375 39.375H9.375M16.875 9.375V16.875M16.875 31.875V54.375M16.875 24.375H16.875M24.375 16.875V54.375M24.375 9.375H24.375M1.875 1.875H31.875M1.875 61.875H31.875",
      );
    });

    it("draws a genuinely visible dot at an odd row count, without a bare square mark beside it", () => {
      const geometry = gridGeometryService.compute(5);

      // Regression coverage for issue #339. At 5 rows the bar spans grid
      // levels 1 through 4 and `dotLevels(5, ...)` is `[4, 1]` — both ends
      // of the bar, taking a three-level step rather than passing through
      // level 2. A dot on level 2 would leave `[1, dotLevel - 1]` collapsed
      // onto the single level 1, which renders as a square mark the viewer
      // cannot tell apart from the dot one level below it.
      const expected = "M3 15V39M3 51H3M15 27V51M15 15H15M3 3H27M3 63H27";

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "bounce" },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe(expected);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "up" },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe(expected);
    });

    it("falls through to the unmodified bar for the dot modifier at 3 rows, where the bar has no two levels to give up", () => {
      const geometry = gridGeometryService.compute(3);
      const plainPath = service.path(geometry, {
        isLastUnit: false,
        rows: 3,
        unitIndex: 0,
      });

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "dot", shape: "up" },
          rows: 3,
          unitIndex: 0,
        }),
      ).toBe(plainPath);
    });

    it("absorbs the split modifier's trailing gap at an even row count, so the bar still ends on a dash", () => {
      const geometry = gridGeometryService.compute(6);

      // At 6 rows the bar spans four grid units, an even count, so a strict
      // dash/gap alternation would end on a gap and leave that gap butting
      // against the bottom cap's own gap. The final dash runs two units
      // instead.
      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "split" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe("M2.5 12.5V22.5M2.5 32.5V52.5M2.5 2.5H12.5M2.5 62.5H12.5");
    });

    it("degenerates the split modifier to the unmodified bar at 4 rows, the same way 3 rows already did", () => {
      const geometry = gridGeometryService.compute(4);
      const plainPath = service.path(geometry, {
        isLastUnit: false,
        rows: 4,
        unitIndex: 0,
      });

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "split" },
          rows: 4,
          unitIndex: 0,
        }),
      ).toBe(plainPath);
    });

    it("draws alternating dash/gap segments for the split modifier, matching 5 rows bars split.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "split" },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe("M3 15V27M3 39V51M3 3H15M3 63H15");
    });

    it("shifts the split modifier's column by one grid unit per unit index", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "split" },
          rows: 5,
          unitIndex: 1,
        }),
      ).toBe("M15 15V27M15 39V51M15 3H27M15 63H27");
    });

    it("draws one extra dash/gap pair for the split modifier, matching 7 rows bars split.svg", () => {
      const geometry = gridGeometryService.compute(7);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "split" },
          rows: 7,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.14286 10.71429V19.28571M2.14286 27.85714V36.42857M2.14286 45V53.57143M2.14286 2.14286H10.71429M2.14286 62.14286H10.71429",
      );
    });

    it("draws a single dash and no gap for the split modifier at the structural minimum of 3 rows", () => {
      const geometry = gridGeometryService.compute(3);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "split" },
          rows: 3,
          unitIndex: 0,
        }),
      ).toBe("M5 25V45M5 5H25M5 65H25");
    });
  });

  describe("space-filling", () => {
    it.each(
      rowsValues.flatMap((rows) =>
        variants.map((variant) => ({ ...variant, rows })),
      ),
    )(
      "leaves no unfilled stretch wider than one stroke width in $label at $rows rows",
      (variant) => {
        const geometry = gridGeometryService.compute(variant.rows);
        const pathData = service.path(
          geometry,
          motifUnit(variant, variant.rows, 0),
        );

        expect(
          longestBlank(pathData, geometry.strokeWidth),
        ).toBeLessThanOrEqual(
          geometry.strokeWidth + COORDINATE_ROUNDING_TOLERANCE,
        );
      },
    );

    it.each(variants)(
      "stays space-filling in later repeat units too, in $label",
      (variant) => {
        const geometry = gridGeometryService.compute(6);
        const pathData = service.path(geometry, motifUnit(variant, 6, 3));

        expect(
          longestBlank(pathData, geometry.strokeWidth),
        ).toBeLessThanOrEqual(
          geometry.strokeWidth + COORDINATE_ROUNDING_TOLERANCE,
        );
      },
    );

    it.each(
      variants.flatMap((variant) =>
        rowsValues.map((rows) => [variant.label, rows, variant] as const),
      ),
    )(
      "ends the last unit's cap ticks flush with its own last column, for %s at %i rows",
      (_label, rows, variant) => {
        const geometry = gridGeometryService.compute(rows);
        const { caps, marks } = rightmostReach(
          service.path(geometry, lastMotifUnit(variant, rows, 5)),
        );

        expect(caps).toBe(marks);
      },
    );

    it.each(
      variants.flatMap((variant) =>
        rowsValues.map((rows) => [variant.label, rows, variant] as const),
      ),
    )(
      "keeps an interior unit's cap ticks reaching into the next tile, for %s at %i rows",
      (_label, rows, variant) => {
        const geometry = gridGeometryService.compute(rows);
        const { caps, marks } = rightmostReach(
          service.path(geometry, motifUnit(variant, rows, 5)),
        );

        expect(caps).toBeCloseTo(marks + geometry.unit, 4);
      },
    );

    it.each(rowsValues)(
      "never draws a bare square mark that a dot could be confused with, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);

        for (const shape of ["bounce", "up"] as const) {
          const pathData = service.path(geometry, {
            isLastUnit: false,
            modifier: { name: "dot", shape },
            rows,
            unitIndex: 0,
          });
          const marks = parseSegments(pathData).filter(
            (segment) =>
              segment.fromX === segment.toX && segment.fromY === segment.toY,
          );
          const dotLevelCount =
            rows < 4 ? 0 : motifTransformsService.dotLevels(rows, shape).length;

          // One zero-length mark per phase — the dot — and not one more.
          expect(marks).toHaveLength(dotLevelCount);
        }
      },
    );
  });

  describe("rightEdge", () => {
    it("stops at the last unit's own column, matching the declared canvas width in 5 rows bars.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.rightEdge(geometry, { repeatCount: 12, rows: 5 })).toBe(
        135,
      );
    });

    it("stops at the last unit's own column, matching the declared canvas width in 6 rows bars.svg", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.rightEdge(geometry, { repeatCount: 12, rows: 6 })).toBe(
        112.5,
      );
    });

    it("stops at the last unit's own column, matching the declared canvas width in 8 rows bars.svg", () => {
      const geometry = gridGeometryService.compute(8);

      expect(service.rightEdge(geometry, { repeatCount: 12, rows: 8 })).toBe(
        84.375,
      );
    });

    it("doubles the touched columns for the alternated modifier at period 1, matching 5 rows bars alternated.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "alternated", period: 1 },
          repeatCount: 6,
          rows: 5,
        }),
      ).toBe(135);
    });

    it("widens the touched columns to 2 * period * repeatCount - 1 at period 2", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "alternated", period: 2 },
          repeatCount: 6,
          rows: 8,
        }),
      ).toBe(174.375);
    });

    it("widens the touched columns to the bounce period * repeatCount - 1, matching the declared canvas width in 6 rows bars dot bounce.svg", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "dot", shape: "bounce" },
          repeatCount: 6,
          rows: 6,
        }),
      ).toBe(232.5);
    });

    it("widens the touched columns to the up period * repeatCount - 1, matching the declared canvas width in 6 rows bars dot up.svg", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "dot", shape: "up" },
          repeatCount: 6,
          rows: 6,
        }),
      ).toBe(172.5);
    });

    it("widens the touched columns to the up period * repeatCount - 1 at a deeper row count, matching the declared canvas width in 8 rows bars dot up.svg", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "dot", shape: "up" },
          repeatCount: 6,
          rows: 8,
        }),
      ).toBe(174.375);
    });

    it.each`
      period | expectedColumns
      ${1}   | ${2}
      ${2}   | ${4}
      ${3}   | ${6}
    `(
      "spans 2 * period ($expectedColumns) real columns per repeat, matching 7 rows bars alternated / alternated 2 / alternated 3 at period $period",
      ({
        expectedColumns,
        period,
      }: {
        expectedColumns: number;
        period: number;
      }) => {
        const geometry = gridGeometryService.compute(7);
        const singleUnitRightEdge = service.rightEdge(geometry, {
          modifier: { name: "alternated", period },
          repeatCount: 1,
          rows: 7,
        });

        expect(singleUnitRightEdge).toBeCloseTo(
          geometry.offset + (expectedColumns - 1) * geometry.unit,
        );
      },
    );
  });
});
