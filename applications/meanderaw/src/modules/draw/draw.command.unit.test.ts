// cspell:ignore dldldl ddddd — mosaic tile identifiers, one letter per cell
// of the tile, from MOSAIC_MARK_LETTERS in
// src/modules/mosaic-motif/mosaic-motif.constants.ts.
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { NegativeTileGenerationService } from "../negative-motif/negative-tile-generation.service";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";
import { OutputPathService } from "../svg-rendering/output-path.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { DrawCombinationsService } from "./draw-combinations.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawNegativePermutationsService } from "./draw-negative-permutations.service";
import { DrawParametersService } from "./draw-parameters.service";
import { DrawPermutationsService } from "./draw-permutations.service";
import { DrawCommand } from "./draw.command";

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

describe(DrawCommand, () => {
  let command: DrawCommand;
  let meanderGenerationService: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        OutputPathService,
        GridGeometryService,
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MosaicSymmetryService,
        MosaicTilesService,
        NegativeMotifService,
        NegativeSourceService,
        NegativeTileGenerationService,
        DrawCombinationsService,
        ParallelSerpentineService,
        DrawIndexService,
        DrawParametersService,
        DrawNegativePermutationsService,
        DrawPermutationsService,
        SvgRenderingService,
      ],
    }).compile();

    command = await module.resolve(DrawCommand);
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
        DrawCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        OutputPathService,
        GridGeometryService,
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MosaicSymmetryService,
        MosaicTilesService,
        NegativeMotifService,
        NegativeSourceService,
        NegativeTileGenerationService,
        DrawCombinationsService,
        ParallelSerpentineService,
        DrawIndexService,
        DrawParametersService,
        DrawNegativePermutationsService,
        DrawPermutationsService,
        SvgRenderingService,
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DrawCommand");
  });

  describe("run", () => {
    it("writes the expected number of files across all ten types, with no path collisions", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

      expect(mockMkdir).toHaveBeenCalledWith("output/boxes/3-rows", {
        recursive: true,
      });

      // 🎯 rows sweep runs from each type's own structural minimum to its
      // own `FAMILY_MAXIMUM_ROWS`: 2..12 (branch, parallel), 3..12 (boxes,
      // negative), 4..12 (chain, snake, swirl, whirl), 6..12 (cross), or
      // 3..6 (mosaic, the one family with a ceiling of its own), crossed
      // with "no modifier" plus every compatible modifier (alternated, dot,
      // and rung each expand to 2 representative values, stagger to 4, and
      // comb to 1 — its other direction is what "no modifier" already
      // draws):
      // mosaic: 4 rows * (1 + 2 + 2 + 1) modifiers = 24
      // boxes: 10 rows * (1 + 1 + 1) modifiers = 30
      // chain: 9 rows * (1 + 1 + 1 + 1) modifiers = 36
      // snake: 9 rows * (1 + 1 + 1 + 1) modifiers = 36
      // swirl: 9 rows * (1 + 1) modifiers = 18
      // whirl: 9 rows * (1 + 1) modifiers = 18
      // cross: 7 rows * (1 + 1) modifiers = 14
      // negative: 10 rows * (1 + 9) modifiers = 100
      // branch: 11 rows * (1 + 1 + 2 + 4) modifiers = 88
      //
      // `parallel` is the one family whose modifiers do not expand to a
      // fixed number of values, so it is the one row here that is neither a
      // multiplication nor a single literal. It has no unmodified entry —
      // `plied` names that drawing — and `plied` and `aligned` each sweep
      // 1..rows, which is the `2 * rows` term. `serpentine` sweeps every
      // *distinct* rotation and flip of each of those plies, and distinct
      // is the operative word: rotating a partition whose strips are all the
      // same depth changes nothing, `alternating` and `one` name the same
      // ribbon below three strands, and flipping a strip with no depth is a
      // no-op. So its per-row counts are written out rather than derived —
      // they are what `ParallelSerpentineService.variants` deduplicates down
      // to, and a change in that deduplication should fail here rather than
      // quietly committing the same drawing twice.
      const serpentinePerRow: Record<number, number> = {
        2: 5,
        3: 9,
        4: 19,
        5: 19,
        6: 44,
        7: 45,
        8: 65,
        9: 66,
        10: 126,
        11: 85,
        12: 182,
      };
      const expectedParallelCount = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce(
        (total, rows) => total + 2 * rows + (serpentinePerRow[rows] ?? 0),
        0,
      );
      const expectedNamedTypeCount =
        24 + 30 + 36 + 36 + 18 + 18 + 14 + 100 + 88 + expectedParallelCount;
      const writtenFileNames = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);
      const namedTypeFiles = writtenFileNames.filter(
        (filePath) =>
          filePath.endsWith(".svg") && !filePath.includes("permutations"),
      );

      expect(namedTypeFiles).toHaveLength(expectedNamedTypeCount);
      expect(new Set(writtenFileNames).size).toBe(writtenFileNames.length);
    });

    it("nests each permutation half under the row count and column span that produced it", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

      const writtenFileNames = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);
      const permutations = writtenFileNames.filter((filePath) =>
        filePath.includes("permutations"),
      );

      expect(mockMkdir).toHaveBeenCalledWith(
        "output/mosaic/4-rows/permutations/1-columns",
        { recursive: true },
      );
      expect(mockMkdir).toHaveBeenCalledWith(
        "output/negative/3-rows/permutations/1-columns",
        { recursive: true },
      );
      // Every distinct `mosaic` tile at 4 through 6 rows and every distinct
      // one-column `negative` source at 3 through 6, and nothing else. Both
      // halves stop at `MOSAIC_TILE_MAXIMUM_ROWS` where the
      // named-type half runs on to `MAXIMUM_VALUE` for nine of its ten
      // families, because both of these enumerate their space exhaustively
      // rather than sampling it.
      expect(permutations).toHaveLength(290 + 159);
      expect(permutations).toContain(
        "output/mosaic/6-rows/permutations/1-columns/ddddd-dots.svg",
      );
      expect(permutations).toContain(
        "output/negative/6-rows/permutations/1-columns/dldldl-ruled.svg",
      );
    });

    it("writes one index page at the root of the output directory, listing every drawing", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

      const index = vi
        .mocked(mockWriteFile)
        .mock.calls.find(([filePath]) => filePath === "output/index.html");

      expect(index).toBeDefined();
      expect(index?.[1]).toContain("<title>Meanderaw</title>");
      expect(index?.[1]).toContain("1632 drawings");
      expect(index?.[1]).toContain(
        'src="mosaic/6-rows/permutations/1-columns/ddddd-dots.svg"',
      );
      expect(index?.[1]).toContain('src="boxes/3-rows/spin-8-repeats.svg"');
    });

    it("generates every combination through the shared generation service", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

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

    it("writes each combination's path under the requested output directory", async () => {
      await command.run([], {
        outputDirectory: "custom-batch-output",
        repeatCount: 6,
      });

      const writtenFilePaths = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);

      expect(writtenFilePaths).toContainEqual(
        "custom-batch-output/mosaic/3-rows/plain-6-repeats.svg",
      );
      expect(writtenFilePaths).toContainEqual(
        "custom-batch-output/boxes/3-rows/spin-8-repeats.svg",
      );
    });

    it("throws when two combinations would collide on path", async () => {
      const collidingPath = "boxes/3-rows/plain-6-repeats.svg";
      const module = await Test.createTestingModule({
        providers: [
          DrawCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: MeanderGenerationService,
            useValue: createMock<MeanderGenerationService>(),
          },
          {
            provide: OutputPathService,
            useValue: createMock<OutputPathService>({
              build: () => collidingPath,
            }),
          },
          DrawCombinationsService,
          GridGeometryService,
          ParallelSerpentineService,
          DrawParametersService,
          {
            provide: DrawIndexService,
            useValue: createMock<DrawIndexService>(),
          },
          {
            provide: DrawNegativePermutationsService,
            useValue: createMock<DrawNegativePermutationsService>(),
          },
          {
            provide: DrawPermutationsService,
            useValue: createMock<DrawPermutationsService>(),
          },
        ],
      }).compile();
      const collidingCommand = await module.resolve(DrawCommand);

      await expect(
        collidingCommand.run([], { outputDirectory: "output", repeatCount: 6 }),
      ).rejects.toThrow(/colliding output paths/i);
    });
  });

  describe("run, drawing one meander", () => {
    it("draws the named meander to the same path the sweep would have written it to", async () => {
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
        "output/boxes/5-rows/plain-8-repeats.svg",
        "<svg>fixture</svg>\n",
      );
    });

    it("draws one meander and nothing else — no sweep, and no index page", async () => {
      await command.run([], {
        outputDirectory: "output",
        repeatCount: 8,
        rows: 5,
        type: "boxes",
      });

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    it("names the file after the modifier and forwards it to the generation service", async () => {
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
        "output/boxes/5-rows/spin-4-repeats.svg",
        "<svg>fixture</svg>\n",
      );
    });

    it("combines the modifier name with its period and encodes both in the filename", async () => {
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
        "output/mosaic/5-rows/alternated-period-2-6-repeats.svg",
        "<svg>fixture</svg>\n",
      );
    });

    it("combines the modifier name with its shape and encodes both in the filename", async () => {
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
        "output/mosaic/6-rows/dot-bounce-6-repeats.svg",
        "<svg>fixture</svg>\n",
      );
    });

    it("forwards the parallel ply to the generation service and encodes it in the filename", async () => {
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
        "output/parallel/6-rows/plied-strands-3-6-repeats.svg",
        "<svg>fixture</svg>\n",
      );
    });

    it("forwards the sub-family to the generation service and encodes it in the filename", async () => {
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
        "output/mosaic/6-rows/dots-6-repeats.svg",
        "<svg>fixture</svg>\n",
      );
    });

    // 🎯 Neither flag can be `required`, since passing neither is how the
    // sweep is asked for — so this is the only thing standing between "one
    // without the other" and a sweep nobody asked for.
    it.each([
      { label: "--type without --rows", options: { type: "boxes" as const } },
      { label: "--rows without --type", options: { rows: 5 } },
    ])(
      "refuses $label rather than sweeping everything",
      async ({ options }) => {
        await expect(
          command.run([], {
            outputDirectory: "output",
            repeatCount: 6,
            ...options,
          }),
        ).rejects.toThrow(/needs both --type and --rows/);

        expect(mockWriteFile).not.toHaveBeenCalled();
      },
    );

    it.each([
      { flag: "--period", modifier: "alternated" as const },
      { flag: "--shape", modifier: "dot" as const },
      { flag: "--strands", modifier: "plied" as const },
    ])(
      "refuses $modifier without $flag rather than guessing one",
      async ({ flag, modifier }) => {
        await expect(
          command.run([], {
            modifier,
            outputDirectory: "output",
            repeatCount: 6,
            rows: 6,
            type: "mosaic",
          }),
        ).rejects.toThrow(new RegExp(`requires ${flag}`));
      },
    );
  });

  describe("option parsing", () => {
    it("passes a supported type through unchanged", () => {
      expect(command.parseType("boxes")).toBe("boxes");
    });

    it("rejects an unsupported type", () => {
      expect(() => command.parseType("triangles")).toThrow(/unsupported type/i);
    });

    it("passes a supported modifier name through unchanged", () => {
      expect(command.parseModifier("spin-flip")).toBe("spin-flip");
    });

    it("rejects an unsupported modifier name", () => {
      expect(() => command.parseModifier("bogus")).toThrow(
        /unsupported modifier/i,
      );
    });

    it("passes a supported sub-family through unchanged", () => {
      expect(command.parseSubFamily("dots")).toBe("dots");
    });

    it("rejects a name that is no sub-family, including the dot modifier it sounds like", () => {
      expect(() => command.parseSubFamily("dot")).toThrow(
        /unsupported sub-family/i,
      );
    });

    it("passes a supported shape through unchanged", () => {
      expect(command.parseShape("bounce")).toBe("bounce");
    });

    it("rejects an unsupported shape", () => {
      expect(() => command.parseShape("bogus")).toThrow(/unsupported shape/i);
    });

    it.each([
      { method: "parseBranches" as const, value: "2" },
      { method: "parsePeriod" as const, value: "2" },
      { method: "parseRepeatCount" as const, value: "2" },
      { method: "parseRows" as const, value: "2" },
      { method: "parseStrands" as const, value: "2" },
    ])("parses $method's numeric string as an integer", ({ method, value }) => {
      expect(command[method](value)).toBe(2);
    });

    // 🎯 The two boolean flags the command takes. Bare is the ordinary way
    // to pass either, and the two spellings that turn one off are there so
    // `--leftward false` means what a reader would expect rather than
    // silently meaning `true` — which is what a bare presence check would
    // have made it mean.
    it.each([
      { expected: true, given: "bare", value: undefined },
      { expected: true, given: '"true"', value: "true" },
      { expected: false, given: '"false"', value: "false" },
      { expected: false, given: '"0"', value: "0" },
    ])("parses --leftward $given as $expected", ({ expected, value }) => {
      expect(command.parseLeftward(value)).toBe(expected);
    });

    it.each([
      { expected: true, given: "bare", value: undefined },
      { expected: false, given: '"false"', value: "false" },
      { expected: false, given: '"0"', value: "0" },
    ])("parses --upward $given as $expected", ({ expected, value }) => {
      expect(command.parseUpward(value)).toBe(expected);
    });

    it("passes the output directory through unchanged", () => {
      expect(command.parseOutputDirectory("./custom-output")).toBe(
        "./custom-output",
      );
    });
  });

  describe("real generation integration", () => {
    it("generates every enumerated combination through the real generation service without throwing", async () => {
      const module = await Test.createTestingModule({
        imports: [MeanderGenerationModule],
        providers: [
          DrawCombinationsService,
          GridGeometryService,
          ParallelSerpentineService,
          DrawCommand,
          DrawIndexService,
          DrawParametersService,
          DrawNegativePermutationsService,
          DrawPermutationsService,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
        ],
      }).compile();
      const realCommand = await module.resolve(DrawCommand);

      mockMkdir.mockClear();
      mockWriteFile.mockClear();

      await expect(
        realCommand.run([], { outputDirectory: "output", repeatCount: 6 }),
      ).resolves.toBeUndefined();

      // 🎯 every one of the 1,183 enumerated named-type combinations, every
      // one of the 290 mosaic tiles, and every one of the 159 one-column
      // negative sources, reached its real generation
      // service and real validators without throwing — this is the
      // regression guard the mocked tests above can't provide, since they
      // replace the generation services entirely. The extra file is the
      // single index page listing all of them.
      expect(mockWriteFile).toHaveBeenCalledTimes(1183 + 290 + 159 + 1);
    });
  });
});
