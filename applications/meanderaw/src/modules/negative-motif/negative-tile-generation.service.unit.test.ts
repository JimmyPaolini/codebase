import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  InvalidRepeatCountError,
  InvalidRowsError,
} from "../meander-generation/meander-generation.constants";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { NEGATIVE_SOURCE_ROW_OFFSET } from "./negative-motif.constants";
import { NegativeMotifService } from "./negative-motif.service";
import { NegativeSourceService } from "./negative-source.service";
import { NegativeTileGenerationService } from "./negative-tile-generation.service";

import type { MosaicTile } from "../mosaic-motif/mosaic-motif.types";

// 🔧 Configuration

/** The repeat count every case below is drawn at, matching both halves of the sweep. */
const REPEAT_COUNT = 6;

// 🧪 Tests

describe(NegativeTileGenerationService, () => {
  let motifService: NegativeMotifService;
  let service: NegativeTileGenerationService;
  let sourceService: NegativeSourceService;

  /** The `ruled` source at a row count, as a tile to hand straight to `generate`. */
  const ruledTile = (rows: number): MosaicTile =>
    sourceService.tile("ruled", rows);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GridGeometryService,
        MosaicTileService,
        NegativeMotifService,
        NegativeSourceService,
        NegativeTileGenerationService,
        SvgRenderingService,
      ],
    }).compile();

    motifService = await module.resolve(NegativeMotifService);
    service = await module.resolve(NegativeTileGenerationService);
    sourceService = await module.resolve(NegativeSourceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("renders a document with a root element and path data", () => {
      const document = service.generate(ruledTile(6), REPEAT_COUNT);

      expect(document.startsWith("<svg ")).toBe(true);
      expect(document).toContain("<path d=");
    });

    // 🎯 The whole reason this service exists rather than a second copy of
    // the geometry: the permutation half and the named half draw through the
    // same `NegativeMotifService.tilePath`, so a tile that happens to be a
    // named source produces the identical document either way. If the two
    // ever diverged, an enumerated drawing and the named drawing beside it
    // would silently stop being the same picture.
    it.each([3, 4, 5, 6, 7])(
      "draws a named source identically to the family's own motif at %i rows",
      (rows) => {
        const tile = ruledTile(rows);
        const geometry = new GridGeometryService().compute(rows);
        const throughMotif = Array.from(
          { length: REPEAT_COUNT },
          (_value, unitIndex) =>
            motifService.path(geometry, {
              isLastUnit: unitIndex === REPEAT_COUNT - 1,
              modifier: { name: "ruled" },
              rows,
              unitIndex,
            }),
        );

        for (const pathData of throughMotif) {
          expect(service.generate(tile, REPEAT_COUNT)).toContain(pathData);
        }
      },
    );

    // 🎯 The row count validated is the negative's, one below the tile's, so
    // a tile at the `mosaic` family's own minimum is accepted here and one a
    // row shallower is not — see `NEGATIVE_SOURCE_ROW_OFFSET`.
    it("refuses a tile whose negative would fall below the family's minimum", () => {
      expect(() => service.generate(mosaicTile(["."]), REPEAT_COUNT)).toThrow(
        InvalidRowsError,
      );
    });

    it("accepts a tile one row deeper than that, which is the offset itself", () => {
      const tile = ruledTile(3);

      expect(tile.rows).toBe(3 + NEGATIVE_SOURCE_ROW_OFFSET);
      expect(() => service.generate(tile, REPEAT_COUNT)).not.toThrow();
    });

    it("refuses a repeat count outside the shared bounds", () => {
      expect(() => service.generate(ruledTile(6), 0)).toThrow(
        InvalidRepeatCountError,
      );
      expect(() => service.generate(ruledTile(6), 13)).toThrow(
        InvalidRepeatCountError,
      );
    });

    it("widens with the repeat count and keeps its height", () => {
      const widths = [4, 6, 8].map((repeatCount) =>
        /\swidth="([\d.]+)"/u.exec(service.generate(ruledTile(6), repeatCount)),
      );
      const heights = [4, 6, 8].map((repeatCount) =>
        /\sheight="([\d.]+)"/u.exec(
          service.generate(ruledTile(6), repeatCount),
        ),
      );

      expect(new Set(heights.map((match) => match?.[1])).size).toBe(1);
      expect(new Set(widths.map((match) => match?.[1])).size).toBe(3);
    });
  });
});
