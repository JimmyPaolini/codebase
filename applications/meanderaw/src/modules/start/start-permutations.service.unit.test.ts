import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { StartContactSheetService } from "./start-contact-sheet.service";
import { StartPermutationsService } from "./start-permutations.service";

const { mockMkdir, mockWriteFile } = vi.hoisted(() => ({
  mockMkdir: vi
    .fn<
      (directoryPath: string, options: { recursive: boolean }) => Promise<void>
    >()
    .mockResolvedValue(undefined),
  mockWriteFile: vi
    .fn<(filePath: string, data: string) => Promise<void>>()
    .mockResolvedValue(undefined),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
}));

describe(StartPermutationsService, () => {
  let service: StartPermutationsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GridGeometryService,
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicSymmetryService,
        MosaicTilesService,
        StartContactSheetService,
        StartPermutationsService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(StartPermutationsService);
  });

  beforeEach(() => {
    mockMkdir.mockClear();
    mockWriteFile.mockClear();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("rowsSweep", () => {
    it("covers the mosaic's own minimum row count through the shared sweep maximum", () => {
      expect(service.rowsSweep()).toStrictEqual([4, 5, 6, 7, 8]);
    });
  });

  describe("write", () => {
    it("writes into a permutations subdirectory of the output directory", async () => {
      await service.write("output");

      expect(mockMkdir).toHaveBeenCalledWith("output/permutations", {
        recursive: true,
      });
    });

    it("reports how many mosaics it wrote, not counting the contact sheets", async () => {
      const total = await service.write("output");
      const written = mockWriteFile.mock.calls.map(([filePath]) => filePath);
      const sheets = written.filter((filePath) => filePath.includes("index-"));

      expect(total).toBe(3179);
      expect(written).toHaveLength(total + sheets.length);
      expect(sheets).toHaveLength(5);
    });

    it("names every file after the tile it draws, so no two collide", async () => {
      await service.write("output");

      const written = mockWriteFile.mock.calls.map(([filePath]) => filePath);

      expect(new Set(written).size).toBe(written.length);
      expect(written).toContain(
        "output/permutations/mosaic-6-rows-1-columns-ddddd-dots.svg",
      );
    });

    it("carries the sub-family in the filename where a tile has one, and only the identifier where it has none", async () => {
      await service.write("output");

      const written = mockWriteFile.mock.calls.map(([filePath]) => filePath);
      const named = written.filter((filePath) =>
        /-(?:dashes|diamond|dots|lines)\.svg$/.test(filePath),
      );

      // The mixed dot-and-vertical-dash tile at the smallest size there is
      // belongs to no sub-family, so nothing is appended to its identifier.
      expect(written).toContain(
        "output/permutations/mosaic-4-rows-1-columns-dvx.svg",
      );
      expect(named).toHaveLength(94);
    });
  });
});
