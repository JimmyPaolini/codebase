// cspell:ignore dldl dldldl ddd lll — mosaic tile identifiers, one letter per
// cell of the tile, from MOSAIC_MARK_LETTERS in
// src/modules/mosaic-motif/mosaic-motif.constants.ts.
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { NegativeTileGenerationService } from "../negative-motif/negative-tile-generation.service";
import { OutputPathService } from "../svg-rendering/output-path.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { DrawNegativePermutationsService } from "./draw-negative-permutations.service";

// 🔧 Configuration

/**
 * How many one-column sources this half enumerates at each row count it
 * covers, in `rowsSweep` order.
 *
 * Written out rather than counted at run time, because the whole point of an
 * exhaustive half is that its size is a fact about the space rather than
 * whatever the search happened to find. The count roughly two-and-a-half
 * times per row, which is also the reason the half stops where it does.
 */
const TILE_COUNTS: readonly number[] = [8, 18, 40, 93];

/**
 * How many of each row count's tiles carry the name of a source the family
 * draws by name, in `rowsSweep` order.
 *
 * Seven at an odd row count and six at an even one, and that alternation is
 * the one collision in the whole scheme: a label names a symmetry class, and
 * at an even row count `ruled` and `ruled-raised` are one class re-phased
 * rather than two. The test below asserts they are the only pair that
 * ever collides.
 */
const NAMED_COUNTS: readonly number[] = [7, 6, 7, 6];

/** The label a permutation filename carries after its source's identifier, where it carries one. */
const SOURCE_LABEL = /^[a-z]+-([a-z-]+)\.svg$/u;

// 🧪 Tests

describe(DrawNegativePermutationsService, () => {
  let service: DrawNegativePermutationsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawNegativePermutationsService,
        GridGeometryService,
        MosaicSymmetryService,
        MosaicTileService,
        MosaicTilesService,
        NegativeMotifService,
        NegativeSourceService,
        NegativeTileGenerationService,
        OutputPathService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(DrawNegativePermutationsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("rowsSweep", () => {
    // 🎯 The range is read from a constant rather than chosen, and this is
    // what makes that concrete: it ends at the same
    // `MOSAIC_TILE_MAXIMUM_ROWS` the `mosaic` half stops at, so both
    // exhaustive halves of the sweep cover the same row counts.
    //
    // It used to end one row lower, because a negative is one row shorter
    // than the source it inverts and every drawing here therefore had a
    // committed `mosaic` tile to be compared against. It no longer does:
    // the deepest row count inverts a seven-row source that is enumerated
    // but not committed, so the corridor-identity gate covers rows 3
    // through 5 and the charter sweep covers the rest.
    it("covers the family's minimum row count through the cap both exhaustive halves share", () => {
      expect(service.rowsSweep()).toStrictEqual([3, 4, 5, 6]);
    });
  });

  describe("render", () => {
    it("files every source under its own row count and column span", () => {
      expect([
        ...new Set(service.render(4).map(({ directory }) => directory)),
      ]).toStrictEqual(["negative/4-rows/permutations/1-columns"]);
    });

    it.each(TILE_COUNTS.map((tiles, index) => ({ rows: index + 3, tiles })))(
      "enumerates all $tiles one-column sources at $rows rows",
      ({ rows, tiles }) => {
        expect(service.render(rows)).toHaveLength(tiles);
      },
    );

    it("names every document distinctly", () => {
      const paths = service
        .rowsSweep()
        .flatMap((rows) => service.render(rows))
        .map(({ directory, fileName }) => `${directory}/${fileName}`);

      expect(new Set(paths).size).toBe(paths.length);
    });

    it("draws a document for every source it files", () => {
      expect(
        service
          .render(5)
          .filter(
            ({ svg }) => !svg.startsWith("<svg") || !svg.includes("<path"),
          ),
      ).toStrictEqual([]);
    });

    it.each(NAMED_COUNTS.map((named, index) => ({ named, rows: index + 3 })))(
      "carries $named named sources into the listing at $rows rows",
      ({ named, rows }) => {
        expect(
          service
            .render(rows)
            .filter(({ fileName }) =>
              /-[a-z]+(-[a-z]+)*\.svg$/u.test(fileName),
            ),
        ).toHaveLength(named);
      },
    );

    // 🎯 The one place the label scheme is lossy, asserted rather than
    // trusted. A label names a symmetry class, and `ruled` and `ruled-raised`
    // share one at every even row count — so those drawings are filed under
    // `ruled`, the earlier of the two in `NEGATIVE_SOURCE_NAMES`. If a third
    // name ever joined that class, or a different pair started colliding, the
    // named counts above would move and this would say which pair did it.
    it("loses only the raised phase of ruled, and only at an even row count", () => {
      const missing = service.rowsSweep().flatMap((rows) => {
        const names = service
          .render(rows)
          .flatMap(({ fileName }) => SOURCE_LABEL.exec(fileName)?.[1] ?? []);

        return names.includes("ruled-raised") ? [] : [rows];
      });

      expect(missing).toStrictEqual([4, 6]);
    });
  });
});
