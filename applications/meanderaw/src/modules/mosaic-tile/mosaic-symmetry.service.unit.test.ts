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

      expect(service.canonicalTile(tile)).toStrictEqual(
        mosaicTile(["s", ".", "e"]),
      );
    });
  });

  describe("variants", () => {
    it("holds every distinct tile that draws the same pattern, itself included", () => {
      const variants = service.variants(singleColumn);

      expect(variants).toContainEqual(singleColumn);
      expect(new Set(variants.map((tile) => service.edgeKey(tile))).size).toBe(
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
