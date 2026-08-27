// cspell:ignore vxdld hxdd — mosaic tile identifiers, one letter per cell
// of the tile, from MOSAIC_MARK_LETTERS.
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";

import type { MosaicTile } from "./meander-generation.types";

describe(MosaicSymmetryService, () => {
  let service: MosaicSymmetryService;

  // Six rows, one column: five interior levels carrying a vertical dash
  // across the top two, then a dot, then a line, then a dot.
  const singleColumn: MosaicTile = {
    columns: 1,
    pieces: [
      { column: 0, kind: "vertical", level: 0 },
      { column: 0, kind: "dot", level: 2 },
      { column: 0, kind: "line", level: 3 },
      { column: 0, kind: "dot", level: 4 },
    ],
    rows: 6,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MosaicSymmetryService],
    }).compile();

    service = await module.resolve(MosaicSymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("identify", () => {
    it("names every cell, writing x where a dash's other half lands", () => {
      expect(service.identify(singleColumn)).toBe("vxdld");
    });

    it("reads row-major, so a two-column tile interleaves its columns", () => {
      const tile: MosaicTile = {
        columns: 2,
        pieces: [
          { column: 0, kind: "horizontal", level: 0 },
          { column: 0, kind: "dot", level: 1 },
          { column: 1, kind: "dot", level: 1 },
        ],
        rows: 3,
      };

      expect(service.identify(tile)).toBe("hxdd");
    });
  });

  describe("canonicalIdentifier", () => {
    it("gives a tile and its own top-to-bottom mirror the same name", () => {
      const flipped: MosaicTile = {
        ...singleColumn,
        pieces: [
          { column: 0, kind: "dot", level: 0 },
          { column: 0, kind: "line", level: 1 },
          { column: 0, kind: "dot", level: 2 },
          { column: 0, kind: "vertical", level: 3 },
        ],
      };

      expect(service.canonicalIdentifier(flipped)).toBe(
        service.canonicalIdentifier(singleColumn),
      );
    });

    it("gives a tile and its own column shift the same name, since shifting only re-phases the pattern", () => {
      const tile: MosaicTile = {
        columns: 2,
        pieces: [
          { column: 0, kind: "dot", level: 0 },
          { column: 1, kind: "line", level: 0 },
        ],
        rows: 3,
      };
      const shifted: MosaicTile = {
        ...tile,
        pieces: [
          { column: 1, kind: "dot", level: 0 },
          { column: 0, kind: "line", level: 0 },
        ],
      };

      expect(service.canonicalIdentifier(shifted)).toBe(
        service.canonicalIdentifier(tile),
      );
    });

    it("prefers the name that anchors its dashes earliest, since x sorts after every mark letter", () => {
      // One interior level, both of whose cells the single dash claims.
      const dashes: MosaicTile = {
        columns: 2,
        pieces: [{ column: 0, kind: "horizontal", level: 0 }],
        rows: 2,
      };

      expect(service.canonicalIdentifier(dashes)).toBe("hx");
    });

    it("keeps two genuinely different tiles apart", () => {
      const aligned: MosaicTile = {
        columns: 2,
        pieces: [
          { column: 0, kind: "horizontal", level: 0 },
          { column: 0, kind: "horizontal", level: 1 },
        ],
        rows: 4,
      };
      const offset: MosaicTile = {
        columns: 2,
        pieces: [
          { column: 0, kind: "horizontal", level: 0 },
          { column: 1, kind: "horizontal", level: 1 },
        ],
        rows: 4,
      };

      expect(service.canonicalIdentifier(aligned)).not.toBe(
        service.canonicalIdentifier(offset),
      );
    });
  });

  describe("coveredCells", () => {
    it("claims one cell for a dot and for a single column's line", () => {
      expect(
        service.coveredCells({ column: 0, kind: "dot", level: 2 }, 1),
      ).toStrictEqual([2]);
      expect(
        service.coveredCells({ column: 0, kind: "line", level: 1 }, 1),
      ).toStrictEqual([1]);
    });

    it("claims the cell below for a vertical dash", () => {
      expect(
        service.coveredCells({ column: 1, kind: "vertical", level: 0 }, 2),
      ).toStrictEqual([1, 3]);
    });

    it("wraps a horizontal dash from the last column into the first", () => {
      expect(
        service.coveredCells({ column: 1, kind: "horizontal", level: 1 }, 2),
      ).toStrictEqual([3, 2]);
    });
  });
});
