import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { OutputFilenameService } from "../meander-generation/output-filename.service";

import { GenerateBatchCommand } from "./generate-batch.command";

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

describe(GenerateBatchCommand, () => {
  let command: GenerateBatchCommand;
  let meanderGenerationService: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateBatchCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        OutputFilenameService,
      ],
    }).compile();

    command = await module.resolve(GenerateBatchCommand);
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
        GenerateBatchCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        OutputFilenameService,
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("GenerateBatchCommand");
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

      // 🎯 rows sweep is 3..8 (bars, boxes) or 4..8 (chain, snake, swirl,
      // whirl), crossed with "no modifier" plus every compatible modifier
      // (alternated and dot each expand to 2 representative values):
      // bars: 6 rows * (1 + 2 + 2 + 1) modifiers = 36
      // boxes: 6 rows * (1 + 1 + 1) modifiers = 18
      // chain: 5 rows * (1 + 1 + 1 + 1) modifiers = 20
      // snake: 5 rows * (1 + 1 + 1 + 1) modifiers = 20
      // swirl: 5 rows * (1 + 1) modifiers = 10
      // whirl: 5 rows * (1 + 1) modifiers = 10
      const expectedFileCount = 36 + 18 + 20 + 20 + 10 + 10;

      expect(mockWriteFile).toHaveBeenCalledTimes(expectedFileCount);

      const writtenFileNames = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);

      expect(new Set(writtenFileNames).size).toBe(writtenFileNames.length);
    });

    it("generates every combination through the shared generation service", async () => {
      await command.run([], { outputDirectory: "output" });

      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([{ repeatCount: 6, rows: 3, type: "bars" }]);
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
          type: "bars",
        },
      ]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        {
          modifier: { name: "dot", shape: "up" },
          repeatCount: 6,
          rows: 3,
          type: "bars",
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
        "custom-batch-output/bars-3-rows-6-repeats.svg",
      );
      expect(writtenFilePaths).toContainEqual(
        "custom-batch-output/boxes-3-rows-8-repeats-spin.svg",
      );
    });

    it("throws when two combinations would collide on filename", async () => {
      const collidingFileName = "boxes-3-rows-6-repeats.svg";
      const module = await Test.createTestingModule({
        providers: [
          GenerateBatchCommand,
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
        ],
      }).compile();
      const collidingCommand = await module.resolve(GenerateBatchCommand);

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
          GenerateBatchCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
        ],
      }).compile();
      const realCommand = await module.resolve(GenerateBatchCommand);

      mockMkdir.mockClear();
      mockWriteFile.mockClear();

      await expect(
        realCommand.run([], { outputDirectory: "output" }),
      ).resolves.toBeUndefined();

      // 🎯 every one of the 114 enumerated combinations reached the real
      // `MeanderGenerationService.generate` and its real validators without
      // throwing — this is the regression guard the mocked tests above
      // can't provide, since they replace the generation service entirely.
      expect(mockWriteFile).toHaveBeenCalledTimes(114);
    });
  });
});
