import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { OutputPathService } from "../svg-rendering/output-path.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { DrawPermutationsService } from "./draw-permutations.service";

describe(DrawPermutationsService, () => {
  let service: DrawPermutationsService;

  /** Every path the whole sweep renders, as one flat list to assert against. */
  const sweepPaths = (): string[] =>
    service
      .rowsSweep()
      .flatMap((rows) => service.render(rows))
      .map((document) => `${document.directory}/${document.fileName}`);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawPermutationsService,
        GridGeometryService,
        MosaicNamingService,
        MosaicSymmetryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MosaicTilesService,
        OutputPathService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(DrawPermutationsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("rowsSweep", () => {
    it("covers the mosaic's own minimum row count through the shared sweep maximum", () => {
      expect(service.rowsSweep()).toStrictEqual([4, 5, 6]);
    });
  });

  describe("render", () => {
    it("files every tile under its own row count and column span", () => {
      const directories = new Set(
        service.render(4).map((document) => document.directory),
      );

      expect([...directories]).toStrictEqual([
        "mosaic/4-rows/permutations/1-columns",
        "mosaic/4-rows/permutations/2-columns",
      ]);
    });

    it("renders a document for every distinct tile in the family", () => {
      expect(sweepPaths()).toHaveLength(290);
    });

    it("names every file after the tile it draws, so no two collide", () => {
      const paths = sweepPaths();

      expect(new Set(paths).size).toBe(paths.length);
      expect(paths).toContain(
        "mosaic/6-rows/permutations/1-columns/000000000-dots.svg",
      );
    });

    it("carries the sub-family in the filename where a tile has one, and only the identifier where it has none", () => {
      const paths = sweepPaths();
      const named = paths.filter((filePath) =>
        /-(?:dashes|diamond|dots|lines)\.svg$/.test(filePath),
      );

      // The tile whose only edge is a southward one over the lower two
      // levels earns no name, so nothing is appended to its bit string.
      expect(paths).toContain("mosaic/4-rows/permutations/1-columns/00001.svg");
      expect(named).toHaveLength(30);
    });

    it("renders the tile itself, so the document is the drawing rather than a placeholder", () => {
      const [first] = service.render(4);

      expect(first?.svg).toContain("<svg");
    });
  });
});
