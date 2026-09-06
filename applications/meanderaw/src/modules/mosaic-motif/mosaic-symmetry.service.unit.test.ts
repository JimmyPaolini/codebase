// cspell:ignore vxdld hxdd dldvx — mosaic tile identifiers, one letter per
// point of the tile, from MosaicSymmetryService.identify.
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";

describe(MosaicSymmetryService, () => {
  let service: MosaicSymmetryService;

  // Six rows, one column: five interior levels whose top point sends a
  // southward edge, then a bare point, then the wrapped east-west rule,
  // then another bare point.
  const singleColumn = mosaicTile(["s", ".", ".", "e", "."]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MosaicSymmetryService, MosaicTileService],
    }).compile();

    service = await module.resolve(MosaicSymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("identify", () => {
    it("names every point, writing x where a neighbor's edge is what reaches it", () => {
      expect(service.identify(singleColumn)).toBe("vxdld");
    });

    it("reads row-major, so a two-column tile interleaves its columns", () => {
      expect(service.identify(mosaicTile(["e.", ".."]))).toBe("hxdd");
    });

    it("writes l rather than h where a single column's eastward edge wraps onto its own point", () => {
      expect(service.identify(mosaicTile(["e"]))).toBe("l");
      expect(service.identify(mosaicTile(["e."]))).toBe("hx");
    });
  });

  describe("canonicalIdentifier", () => {
    it("gives a tile and its own top-to-bottom mirror the same name", () => {
      const flipped = mosaicTile([".", "e", ".", "s", "."]);

      expect(service.identify(flipped)).toBe("dldvx");
      expect(service.canonicalIdentifier(flipped)).toBe(
        service.canonicalIdentifier(singleColumn),
      );
    });

    it("gives a tile and its own column shift the same name, since shifting only re-phases the pattern", () => {
      expect(service.canonicalIdentifier(mosaicTile([".e", ".."]))).toBe(
        service.canonicalIdentifier(mosaicTile(["e.", ".."])),
      );
    });

    it("prefers the name that anchors its edges earliest, since x sorts after every other letter", () => {
      // One interior level, whose single eastward edge reaches the point
      // beside it.
      expect(service.canonicalIdentifier(mosaicTile(["e."]))).toBe("hx");
    });

    it("keeps two genuinely different tiles apart", () => {
      const aligned = mosaicTile(["e.", "e.", ".."]);
      const offset = mosaicTile(["e.", ".e", ".."]);

      expect(service.canonicalIdentifier(aligned)).not.toBe(
        service.canonicalIdentifier(offset),
      );
    });
  });

  describe("canonicalTile", () => {
    it("hands every member of a symmetry class the same tile", () => {
      const flipped = mosaicTile([".", "e", ".", "s", "."]);

      expect(service.canonicalTile(flipped)).toStrictEqual(
        service.canonicalTile(singleColumn),
      );
    });

    it("is idempotent, so the representative of a class represents itself", () => {
      const representative = service.canonicalTile(singleColumn);

      expect(service.canonicalTile(representative)).toStrictEqual(
        representative,
      );
    });

    it("picks the member that anchors its edges earliest, which is not always the one the name is taken from", () => {
      // `lvx` names the class, because `l` sorts before `v`; the tile the
      // corpus draws is the one whose southward edge is anchored first,
      // which the old exact-cover search reached first for the same reason.
      const tile = mosaicTile(["e", "s", "."]);

      expect(service.canonicalIdentifier(tile)).toBe("lvx");
      expect(service.identify(service.canonicalTile(tile))).toBe("vxl");
    });
  });
});
