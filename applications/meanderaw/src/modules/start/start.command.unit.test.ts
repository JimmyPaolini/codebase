import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { OutputFilenameService } from "../svg-rendering/output-filename.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { StartContactSheetService } from "./start-contact-sheet.service";
import { StartPermutationsService } from "./start-permutations.service";
import { StartCommand } from "./start.command";

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

describe(StartCommand, () => {
  let command: StartCommand;
  let meanderGenerationService: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StartCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        OutputFilenameService,
        GridGeometryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicSymmetryService,
        MosaicTilesService,
        StartContactSheetService,
        StartPermutationsService,
        SvgRenderingService,
      ],
    }).compile();

    command = await module.resolve(StartCommand);
    meanderGenerationService = await module.resolve(MeanderGenerationService);
  });

  beforeEach(() => {
    mockMkdir.mockClear();
    mockWriteFile.mockClear();
    vi.mocked(meanderGenerationService.generate).mockReturnValue(
      "<svg>fixture</svg>\n",
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        StartCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        OutputFilenameService,
        GridGeometryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicSymmetryService,
        MosaicTilesService,
        StartContactSheetService,
        StartPermutationsService,
        SvgRenderingService,
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("StartCommand");
  });

  describe("parseOutputDirectory", () => {
    it("passes the value through unchanged", () => {
      expect(command.parseOutputDirectory("./custom-output")).toBe(
        "./custom-output",
      );
    });
  });

  describe("run", () => {
    it("writes the expected number of files across all six types, with no name collisions", async () => {
      await command.run([], { outputDirectory: "output" });

      expect(mockMkdir).toHaveBeenCalledWith("output", { recursive: true });

      // 🎯 rows sweep is 3..8 (mosaic, boxes) or 4..8 (chain, snake, swirl,
      // whirl), crossed with "no modifier" plus every compatible modifier
      // (alternated and dot each expand to 2 representative values):
      // mosaic: 6 rows * (1 + 2 + 2 + 1) modifiers = 36
      // boxes: 6 rows * (1 + 1 + 1) modifiers = 18
      // chain: 5 rows * (1 + 1 + 1 + 1) modifiers = 20
      // snake: 5 rows * (1 + 1 + 1 + 1) modifiers = 20
      // swirl: 5 rows * (1 + 1) modifiers = 10
      // whirl: 5 rows * (1 + 1) modifiers = 10
      const expectedNamedTypeCount = 36 + 18 + 20 + 20 + 10 + 10;
      const writtenFileNames = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);
      const namedTypeFiles = writtenFileNames.filter(
        (filePath) => !filePath.includes("permutations"),
      );

      expect(namedTypeFiles).toHaveLength(expectedNamedTypeCount);
      expect(new Set(writtenFileNames).size).toBe(writtenFileNames.length);
    });

    it("writes the mosaic half into a subdirectory of its own, with a contact sheet per row count", async () => {
      await command.run([], { outputDirectory: "output" });

      const writtenFileNames = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);
      const permutations = writtenFileNames.filter((filePath) =>
        filePath.includes("permutations"),
      );
      const contactSheets = permutations.filter((filePath) =>
        filePath.includes("index-"),
      );

      expect(mockMkdir).toHaveBeenCalledWith("output/permutations", {
        recursive: true,
      });
      // Every distinct tile at 4 through 8 rows, plus one sheet per row count.
      expect(permutations).toHaveLength(3179 + 5);
      expect(contactSheets).toHaveLength(5);
      expect(permutations).toContain(
        "output/permutations/mosaic-6-rows-1-columns-ddddd.svg",
      );
    });

    it("generates every combination through the shared generation service", async () => {
      await command.run([], { outputDirectory: "output" });

      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([{ repeatCount: 6, rows: 3, type: "mosaic" }]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        { modifier: { name: "spin" }, repeatCount: 8, rows: 3, type: "boxes" },
      ]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        {
          modifier: { name: "alternated", period: 1 },
          repeatCount: 6,
          rows: 3,
          type: "mosaic",
        },
      ]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        {
          modifier: { name: "dot", shape: "up" },
          repeatCount: 6,
          rows: 3,
          type: "mosaic",
        },
      ]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        {
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 4,
          type: "chain",
        },
      ]);
    });

    it("writes each combination's filename under the requested output directory", async () => {
      await command.run([], { outputDirectory: "custom-batch-output" });

      const writtenFilePaths = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);

      expect(writtenFilePaths).toContainEqual(
        "custom-batch-output/mosaic-3-rows-6-repeats.svg",
      );
      expect(writtenFilePaths).toContainEqual(
        "custom-batch-output/boxes-3-rows-8-repeats-spin.svg",
      );
    });

    it("throws when two combinations would collide on filename", async () => {
      const collidingFileName = "boxes-3-rows-6-repeats.svg";
      const module = await Test.createTestingModule({
        providers: [
          StartCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: MeanderGenerationService,
            useValue: createMock<MeanderGenerationService>(),
          },
          {
            provide: OutputFilenameService,
            useValue: createMock<OutputFilenameService>({
              build: () => collidingFileName,
            }),
          },
          {
            provide: StartPermutationsService,
            useValue: createMock<StartPermutationsService>(),
          },
        ],
      }).compile();
      const collidingCommand = await module.resolve(StartCommand);

      await expect(
        collidingCommand.run([], { outputDirectory: "output" }),
      ).rejects.toThrow(/colliding output filenames/);
    });
  });

  describe("real generation integration", () => {
    it("generates every enumerated combination through the real generation service without throwing", async () => {
      const module = await Test.createTestingModule({
        imports: [MeanderGenerationModule],
        providers: [
          StartCommand,
          StartContactSheetService,
          StartPermutationsService,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
        ],
      }).compile();
      const realCommand = await module.resolve(StartCommand);

      mockMkdir.mockClear();
      mockWriteFile.mockClear();

      await expect(
        realCommand.run([], { outputDirectory: "output" }),
      ).resolves.toBeUndefined();

      // 🎯 every one of the 114 enumerated named-type combinations, and
      // every one of the 3,179 mosaic tiles, reached its real generation
      // service and real validators without throwing — this is the
      // regression guard the mocked tests above can't provide, since they
      // replace the generation services entirely. The five extra files are
      // the mosaic contact sheets, one per row count.
      expect(mockWriteFile).toHaveBeenCalledTimes(114 + 3179 + 5);
    });
  });
});
