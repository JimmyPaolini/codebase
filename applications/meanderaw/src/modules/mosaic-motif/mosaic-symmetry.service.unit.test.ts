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
    it("writes one hexadecimal character per point, worth 8 north, 4 south, 2 east and 1 west", () => {
      // A point sending a southward edge, the point below it receiving one,
      // two bare points, and one carrying the wrapped east-west rule.
      expect(service.identify(singleColumn)).toBe("48030");
    });

    it("reads row-major, so a two-column tile interleaves its columns", () => {
      expect(service.identify(mosaicTile(["e.", ".."]))).toBe("2100");
      expect(service.identify(mosaicTile([".e", ".."]))).toBe("1200");
    });

    it("writes a single column's wrapped edge as both east and west, which is what its ink does", () => {
      expect(service.identify(mosaicTile(["e"]))).toBe("3");
      expect(service.identify(mosaicTile(["e."]))).toBe("21");
    });

    it("writes a point owning both its edges as one character, which a per-mark letter had none for", () => {
      expect(service.identify(mosaicTile(["b.", "..", ".."]))).toBe("618000");
    });

    it("names a tile completely, so two tiles of one shape share it only when they are the same tile", () => {
      expect(service.identify(mosaicTile(["e.", "e.", ".."]))).not.toBe(
        service.identify(mosaicTile(["e.", ".e", ".."])),
      );
    });
  });

  describe("canonicalIdentifier", () => {
    it("gives a tile and its own top-to-bottom mirror the same name", () => {
      const flipped = mosaicTile([".", "e", ".", "s", "."]);

      expect(service.canonicalIdentifier(flipped)).toBe(
        service.canonicalIdentifier(singleColumn),
      );
    });

    it("gives a tile and its own column shift the same name, since shifting only re-phases the pattern", () => {
      expect(service.canonicalIdentifier(mosaicTile([".e", ".."]))).toBe(
        service.canonicalIdentifier(mosaicTile(["e.", ".."])),
      );
    });

    it("is the representative's own bit string, so a filename describes the tile that drew it", () => {
      expect(service.canonicalIdentifier(singleColumn)).toBe(
        service.identify(service.canonicalTile(singleColumn)),
      );
      expect(service.canonicalIdentifier(singleColumn)).toBe("03048");
    });

    it("keeps two genuinely different tiles apart", () => {
      expect(
        service.canonicalIdentifier(mosaicTile(["e.", "e.", ".."])),
      ).not.toBe(service.canonicalIdentifier(mosaicTile(["e.", ".e", ".."])));
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

    it("picks the member that anchors its edges earliest, which is not always the one written down", () => {
      // A bare point followed by a southward edge is reached earlier than
      // the wrapped rule, so the mirror of this tile is what the corpus
      // draws — the same order the old exact-cover search found covers in.
      const tile = mosaicTile(["e", "s", "."]);

      expect(service.identify(tile)).toBe("348");
      expect(service.identify(service.canonicalTile(tile))).toBe("483");
    });
  });

  describe("variants", () => {
    it("holds every distinct tile that draws the same pattern, itself included", () => {
      const variants = service.variants(singleColumn);

      expect(variants).toContainEqual(singleColumn);
      expect(new Set(variants.map((tile) => service.identify(tile))).size).toBe(
        variants.length,
      );
    });

    it("is smaller than the group where a tile is symmetric under one of its elements", () => {
      // Every point bare is fixed by every element of the group.
      expect(service.variants(mosaicTile([".", ".", "."]))).toHaveLength(1);
      expect(
        service.variants(mosaicTile(["e.", ".e", ".."])).length,
      ).toBeGreaterThan(1);
    });
  });
});
