import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { InvalidRepeatCountError } from "../meander-generation/invalid-repeat-count.errors";
import { InvalidRowsError } from "../meander-generation/invalid-rows.errors";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileGenerationService } from "./mosaic-tile-generation.service";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicTile } from "./mosaic-motif.types";

/** The longest unfilled stretch any column of a rendered mosaic leaves, in pixels. */
const longestBlank = (svg: string, strokeWidth: number): number => {
  const half = strokeWidth / 2;
  const segments: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }[] = [];

  for (const match of svg.matchAll(/ d="([^"]+)"/g)) {
    // A leading minus is expected: the overhang that closes the pattern's
    // left edge is drawn from the column before the origin, and the canvas
    // crops it.
    const tokens = match[1]?.match(/[MVH]-?[\d.]+(?: -?[\d.]+)?/g) ?? [];
    let currentX = 0;
    let currentY = 0;

    for (const token of tokens) {
      const [first = 0, second = 0] = token.slice(1).split(" ").map(Number);

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
  }

  const columns = new Set(
    segments
      .filter((segment) => segment.fromX === segment.toX)
      .map((segment) => segment.fromX),
  );
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

describe(MosaicTileGenerationService, () => {
  let service: MosaicTileGenerationService;
  let mosaicTilesService: MosaicTilesService;
  let gridGeometryService: GridGeometryService;

  const dots: MosaicTile = {
    columns: 1,
    pieces: Array.from({ length: 5 }, (_value, level) => ({
      column: 0,
      kind: "dot" as const,
      level,
    })),
    rows: 6,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GridGeometryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicSymmetryService,
        MosaicTilesService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(MosaicTileGenerationService);
    mosaicTilesService = await module.resolve(MosaicTilesService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("draws the all-dots tile the way 6 rows dots.svg does", () => {
      // The reference file traces each dot as a sub-pixel jog rather than a
      // true zero-length segment, and draws its bottom cap right to left;
      // every coordinate below is otherwise the reference's own. Its two cap
      // ticks collapse onto the single dot column here because this one unit
      // is also the pattern's last, so there is no following tile for a
      // full-width tick to stay contiguous with.
      expect(service.generate(dots, 1)).toContain(
        'd="M2.5 12.5H2.5M2.5 22.5H2.5M2.5 32.5H2.5M2.5 42.5H2.5M2.5 52.5H2.5M2.5 2.5H2.5M2.5 62.5H2.5"',
      );
    });

    it("declares a canvas wide enough for the last column's own marks", () => {
      expect(service.generate(dots, 6)).toContain('width="55"');
    });

    it("widens the canvas by a unit when the last column's mark reaches right, the way 6 rows lines.svg does", () => {
      const lines: MosaicTile = {
        ...dots,
        pieces: dots.pieces.map((piece) => ({ ...piece, kind: "line" })),
      };

      expect(service.generate(lines, 6)).toContain('width="65"');
    });

    it("throws below the mosaic's own minimum rows", () => {
      expect(() => service.generate({ ...dots, rows: 3 }, 6)).toThrow(
        InvalidRowsError,
      );
    });

    it("throws when the repeat count falls outside the shared bounds", () => {
      expect(() => service.generate(dots, 0)).toThrow(InvalidRepeatCountError);
      expect(() => service.generate(dots, 13)).toThrow(InvalidRepeatCountError);
    });

    it.each([4, 5, 6, 7])(
      "renders every enumerated tile space-filling at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);

        for (const columns of [1, 2]) {
          for (const tile of mosaicTilesService.enumerate(rows, columns)) {
            expect(
              longestBlank(service.generate(tile, 3), geometry.strokeWidth),
            ).toBeLessThanOrEqual(geometry.strokeWidth + 0.0001);
          }
        }
      },
    );
  });
});
