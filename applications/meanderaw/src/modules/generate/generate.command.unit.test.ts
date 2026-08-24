import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MeanderGenerationService } from "../meander-generation/meander-generation.service";

import { GenerateCommand } from "./generate.command";

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

describe(GenerateCommand, () => {
  let command: GenerateCommand;
  let meanderGenerationService: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
      ],
    }).compile();

    command = await module.resolve(GenerateCommand);
    meanderGenerationService = await module.resolve(MeanderGenerationService);
  });

  beforeEach(() => {
    mockMkdir.mockClear();
    mockWriteFile.mockClear();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("GenerateCommand");
  });

  describe("parseType", () => {
    it("passes a supported type through unchanged", () => {
      expect(command.parseType("boxes")).toBe("boxes");
    });

    it("rejects an unsupported type", () => {
      expect(() => command.parseType("triangles")).toThrow(
        /unsupported meander type/i,
      );
    });
  });

  describe("parseRows", () => {
    it("parses a numeric string", () => {
      expect(command.parseRows("5")).toBe(5);
    });
  });

  describe("parseModifier", () => {
    it("passes a supported modifier name through unchanged", () => {
      expect(command.parseModifier("spin")).toBe("spin");
    });

    it("passes spin-flip through unchanged", () => {
      expect(command.parseModifier("spin-flip")).toBe("spin-flip");
    });

    it("passes edge through unchanged", () => {
      expect(command.parseModifier("edge")).toBe("edge");
    });

    it("passes flip through unchanged", () => {
      expect(command.parseModifier("flip")).toBe("flip");
    });

    it("passes edge-flip through unchanged", () => {
      expect(command.parseModifier("edge-flip")).toBe("edge-flip");
    });

    it("passes alternated through unchanged", () => {
      expect(command.parseModifier("alternated")).toBe("alternated");
    });

    it("rejects an unsupported modifier name", () => {
      expect(() => command.parseModifier("bogus")).toThrow(
        /unsupported modifier/i,
      );
    });
  });

  describe("parsePeriod", () => {
    it("parses a numeric string", () => {
      expect(command.parsePeriod("2")).toBe(2);
    });
  });

  describe("parseRepeatCount", () => {
    it("parses a numeric string", () => {
      expect(command.parseRepeatCount("8")).toBe(8);
    });
  });

  describe("parseOutputDirectory", () => {
    it("passes the value through unchanged", () => {
      expect(command.parseOutputDirectory("./custom-output")).toBe(
        "./custom-output",
      );
    });
  });

  describe("run", () => {
    it("generates the SVG and writes it to a kebab-case file in the output directory", async () => {
      vi.mocked(meanderGenerationService.generate).mockReturnValue(
        "<svg>fixture</svg>\n",
      );

      await command.run([], {
        outputDirectory: "output",
        repeatCount: 8,
        rows: 5,
        type: "boxes",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        repeatCount: 8,
        rows: 5,
        type: "boxes",
      });
      expect(mockMkdir).toHaveBeenCalledWith("output", { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("boxes-5-rows-8-repeats.svg"),
        "<svg>fixture</svg>\n",
      );
    });

    it("encodes the modifier in the filename and forwards it to the generation service", async () => {
      vi.mocked(meanderGenerationService.generate).mockReturnValue(
        "<svg>fixture</svg>\n",
      );

      await command.run([], {
        modifier: "spin",
        outputDirectory: "output",
        repeatCount: 4,
        rows: 5,
        type: "boxes",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        modifier: { name: "spin" },
        repeatCount: 4,
        rows: 5,
        type: "boxes",
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("boxes-5-rows-4-repeats-spin.svg"),
        "<svg>fixture</svg>\n",
      );
    });

    it("combines the modifier name with its period and encodes both in the filename", async () => {
      vi.mocked(meanderGenerationService.generate).mockReturnValue(
        "<svg>fixture</svg>\n",
      );

      await command.run([], {
        modifier: "alternated",
        outputDirectory: "output",
        period: 2,
        repeatCount: 6,
        rows: 5,
        type: "bars",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        modifier: { name: "alternated", period: 2 },
        repeatCount: 6,
        rows: 5,
        type: "bars",
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "bars-5-rows-6-repeats-alternated-period-2.svg",
        ),
        "<svg>fixture</svg>\n",
      );
    });

    it("throws when alternated is requested without a period", async () => {
      await expect(
        command.run([], {
          modifier: "alternated",
          outputDirectory: "output",
          repeatCount: 6,
          rows: 5,
          type: "bars",
        }),
      ).rejects.toThrow(/requires --period/);
    });
  });
});
