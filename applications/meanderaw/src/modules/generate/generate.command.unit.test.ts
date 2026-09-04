import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

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
        OutputPathService,
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
        OutputPathService,
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

    it("passes split through unchanged", () => {
      expect(command.parseModifier("split")).toBe("split");
    });

    it("passes dot through unchanged", () => {
      expect(command.parseModifier("dot")).toBe("dot");
    });

    it("rejects an unsupported modifier name", () => {
      expect(() => command.parseModifier("bogus")).toThrow(
        /unsupported modifier/i,
      );
    });
  });

  describe("parseSubFamily", () => {
    it.each(["dashes", "diamond", "dots", "lines"])(
      "passes the %s sub-family through unchanged",
      (subFamily) => {
        expect(command.parseSubFamily(subFamily)).toBe(subFamily);
      },
    );

    it("rejects a name that is no sub-family, including the dot modifier it sounds like", () => {
      expect(() => command.parseSubFamily("dot")).toThrow(
        /unsupported sub-family/i,
      );
    });
  });

  describe("parsePeriod", () => {
    it("parses a numeric string", () => {
      expect(command.parsePeriod("2")).toBe(2);
    });
  });

  describe("parseStrands", () => {
    it("parses the strand count as an integer", () => {
      expect(command.parseStrands("3")).toBe(3);
    });
  });

  describe("parseShape", () => {
    it("passes a supported shape through unchanged", () => {
      expect(command.parseShape("bounce")).toBe("bounce");
    });

    it("passes up through unchanged", () => {
      expect(command.parseShape("up")).toBe("up");
    });

    it("rejects an unsupported shape", () => {
      expect(() => command.parseShape("bogus")).toThrow(/unsupported shape/i);
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
    it("generates the SVG and writes it to a kebab-case path beneath the output directory", async () => {
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
      expect(mockMkdir).toHaveBeenCalledWith("output/boxes/5-rows", {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("output/boxes/5-rows/plain-8-repeats.svg"),
        "<svg>fixture</svg>\n",
      );
    });

    it("names the file after the modifier and forwards it to the generation service", async () => {
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
        expect.stringContaining("output/boxes/5-rows/spin-4-repeats.svg"),
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
        type: "mosaic",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        modifier: { name: "alternated", period: 2 },
        repeatCount: 6,
        rows: 5,
        type: "mosaic",
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "output/mosaic/5-rows/alternated-period-2-6-repeats.svg",
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
          type: "mosaic",
        }),
      ).rejects.toThrow(/requires --period/);
    });

    it("combines the modifier name with its shape and encodes both in the filename", async () => {
      vi.mocked(meanderGenerationService.generate).mockReturnValue(
        "<svg>fixture</svg>\n",
      );

      await command.run([], {
        modifier: "dot",
        outputDirectory: "output",
        repeatCount: 6,
        rows: 6,
        shape: "bounce",
        type: "mosaic",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        modifier: { name: "dot", shape: "bounce" },
        repeatCount: 6,
        rows: 6,
        type: "mosaic",
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "output/mosaic/6-rows/dot-bounce-6-repeats.svg",
        ),
        "<svg>fixture</svg>\n",
      );
    });

    it("forwards the sub-family to the generation service and encodes it in the filename", async () => {
      vi.mocked(meanderGenerationService.generate).mockReturnValue(
        "<svg>fixture</svg>\n",
      );

      await command.run([], {
        outputDirectory: "output",
        repeatCount: 6,
        rows: 6,
        subFamily: "dots",
        type: "mosaic",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        repeatCount: 6,
        rows: 6,
        subFamily: "dots",
        type: "mosaic",
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("output/mosaic/6-rows/dots-6-repeats.svg"),
        "<svg>fixture</svg>\n",
      );
    });

    it("throws when dot is requested without a shape", async () => {
      await expect(
        command.run([], {
          modifier: "dot",
          outputDirectory: "output",
          repeatCount: 6,
          rows: 6,
          type: "mosaic",
        }),
      ).rejects.toThrow(/requires --shape/);
    });

    it("forwards the parallel ply to the generation service and encodes it in the filename", async () => {
      vi.mocked(meanderGenerationService.generate).mockReturnValue(
        "<svg>fixture</svg>\n",
      );

      await command.run([], {
        modifier: "plied",
        outputDirectory: "output",
        repeatCount: 6,
        rows: 6,
        strands: 3,
        type: "parallel",
      });

      expect(meanderGenerationService.generate).toHaveBeenCalledWith({
        modifier: { name: "plied", strands: 3 },
        repeatCount: 6,
        rows: 6,
        type: "parallel",
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "output/parallel/6-rows/plied-strands-3-6-repeats.svg",
        ),
        "<svg>fixture</svg>\n",
      );
    });

    it("throws when plied is requested without a strand count", async () => {
      await expect(
        command.run([], {
          modifier: "plied",
          outputDirectory: "output",
          repeatCount: 6,
          rows: 6,
          type: "parallel",
        }),
      ).rejects.toThrow(/requires --strands/);
    });
  });
});
