import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildTile } from "../../../testing/tiles";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import {
  InvalidCodeCharacterError,
  InvalidCodeLengthError,
} from "./code.constants";
import { CodeService } from "./code.service";

// 🔧 Configuration

/** The point that carries no ink at all, which is what a position off the Code reads as. */
const BARE = { east: false, north: false, south: false, west: false };

// 🧪 Tests

describe(CodeService, () => {
  let service: CodeService;
  let symmetryService: SymmetryService;

  // Six rows, one column: five interior levels whose top point sends a
  // southward edge, then a bare point, then the wrapped east-west rule,
  // then another bare point.
  const singleColumn = buildTile(["s", ".", ".", "e", "."]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodeService, SymmetryService, TileService],
    }).compile();

    service = await module.resolve(CodeService);
    symmetryService = await module.resolve(SymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("parse", () => {
    it("reads a Code at the shape it was given, carrying the interior level count beside it", () => {
      expect(service.parse("36c9", 3, 2)).toStrictEqual({
        columns: 2,
        digits: "36c9",
        levels: 2,
        rows: 3,
      });
    });

    it("refuses a Code whose length disagrees with the rows and columns it was handed", () => {
      expect(() => service.parse("36c", 3, 2)).toThrow(InvalidCodeLengthError);
    });

    it("refuses a character outside the hexadecimal alphabet rather than reading it as a bit pattern", () => {
      expect(() => service.parse("36cz", 3, 2)).toThrow(
        InvalidCodeCharacterError,
      );
    });

    it("accepts an upper-case digit, since a Code names the same point either way", () => {
      expect(service.parse("36CA", 3, 2).digits).toBe("36CA");
    });
  });

  describe("directionsAt", () => {
    it.each([
      ["0", BARE],
      ["3", { ...BARE, east: true, west: true }],
      ["c", { ...BARE, north: true, south: true }],
      ["6", { ...BARE, east: true, south: true }],
      ["f", { east: true, north: true, south: true, west: true }],
    ])("reads %s as the four bits it spells", (digit, directions) => {
      expect(
        service.directionsAt(service.parse(digit, 2, 1), 0, 0),
      ).toStrictEqual(directions);
    });

    it("finds a point at level times columns plus column, which is the whole of the addressing", () => {
      const code = service.parse("0369", 3, 2);

      expect(service.directionsAt(code, 0, 0)).toStrictEqual(BARE);
      expect(service.directionsAt(code, 1, 1)).toStrictEqual({
        ...BARE,
        north: true,
        west: true,
      });
    });

    it.each([
      ["a level past the last", 2, 0],
      ["a level before the first", -1, 0],
      ["a column past the last", 0, 2],
      ["a column before the first", 0, -1],
    ])(
      "reads %s as carrying no ink, since nothing is there to be inked",
      (_name, level, column) => {
        expect(
          service.directionsAt(service.parse("0369", 3, 2), level, column),
        ).toStrictEqual(BARE);
      },
    );
  });

  describe("spell", () => {
    it("writes one hexadecimal character per point, worth 8 north, 4 south, 2 east and 1 west", () => {
      // A point sending a southward edge, the point below it receiving one,
      // two bare points, and one carrying the wrapped east-west rule.
      expect(service.spell(singleColumn)).toBe("48030");
    });

    it("reads row-major, so a two-column tile interleaves its columns", () => {
      expect(service.spell(buildTile(["e.", ".."]))).toBe("2100");
      expect(service.spell(buildTile([".e", ".."]))).toBe("1200");
    });

    it("writes a single column's wrapped edge as both east and west, which is what its ink does", () => {
      expect(service.spell(buildTile(["e"]))).toBe("3");
      expect(service.spell(buildTile(["e."]))).toBe("21");
    });

    it("writes a point owning both its edges as one character, which a per-mark letter had none for", () => {
      expect(service.spell(buildTile(["b.", "..", ".."]))).toBe("618000");
    });

    it("round-trips a tile through a Code and back to the same tile, which is what makes the two directions one conversion", () => {
      const tile = buildTile(["bs", "e."]);

      expect(
        service.tile(service.parse(service.spell(tile), 3, 2)),
      ).toStrictEqual(tile);
    });

    it("names a tile completely, so two tiles of one shape share it only when they are the same tile", () => {
      expect(service.spell(buildTile(["e.", "e.", ".."]))).not.toBe(
        service.spell(buildTile(["e.", ".e", ".."])),
      );
    });
  });

  describe("spellCanonical", () => {
    it("gives a tile and its own top-to-bottom mirror the same name", () => {
      const flipped = buildTile([".", "e", ".", "s", "."]);

      expect(service.spellCanonical(flipped)).toBe(
        service.spellCanonical(singleColumn),
      );
    });

    it("gives a tile and its own column shift the same name, since shifting only re-phases the pattern", () => {
      expect(service.spellCanonical(buildTile([".e", ".."]))).toBe(
        service.spellCanonical(buildTile(["e.", ".."])),
      );
    });

    it("is the representative's own bit string, so a Code describes the tile that spelled it", () => {
      expect(service.spellCanonical(singleColumn)).toBe(
        service.spell(symmetryService.canonicalTile(singleColumn)),
      );
      expect(service.spellCanonical(singleColumn)).toBe("03048");
    });

    it("keeps two genuinely different tiles apart", () => {
      expect(service.spellCanonical(buildTile(["e.", "e.", ".."]))).not.toBe(
        service.spellCanonical(buildTile(["e.", ".e", ".."])),
      );
    });
  });

  describe("rotate", () => {
    it("shifts every level's own columns west by the same amount", () => {
      const code = service.parse("1230abc0", 5, 2);

      expect(service.rotate(code, 1).digits).toBe("2103ba0c");
    });

    it("leaves the Code alone at a shift of no columns", () => {
      const code = service.parse("36c9", 3, 2);

      expect(service.rotate(code, 0).digits).toBe("36c9");
    });

    it("returns to the Code it started from after a whole span of shifts", () => {
      const code = service.parse("012345", 3, 3);

      expect(service.rotate(code, 3).digits).toBe("012345");
    });

    it("takes a shift past the span modulo it, since every integer names a real phase", () => {
      const code = service.parse("012345", 3, 3);

      expect(service.rotate(code, 4).digits).toBe(
        service.rotate(code, 1).digits,
      );
    });

    it("reads a negative shift as the phase it names rather than refusing it", () => {
      const code = service.parse("012345", 3, 3);

      expect(service.rotate(code, -1).digits).toBe(
        service.rotate(code, 2).digits,
      );
    });

    it("keeps the shape it was given, since re-phasing a band cuts it elsewhere rather than resizing it", () => {
      const rotated = service.rotate(service.parse("012345", 3, 3), 1);

      expect(rotated).toStrictEqual({
        columns: 3,
        digits: "120453",
        levels: 2,
        rows: 3,
      });
    });
  });
});
