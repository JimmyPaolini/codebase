import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { LatticeIdentificationModule } from "../lattice-identification/lattice-identification.module";
import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifPitchService } from "../meander-generation/motif-pitch.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingModule } from "../mosaic-naming/mosaic-naming.module";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-tile/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-tile/mosaic-tiles.service";
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
import { COLUMN_SPAN_PATTERN } from "./draw.constants";

import type { LatticeAddress } from "../lattice-identification/lattice-identification.types";

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

/**
 * How long the assertions that drive a whole sweep are given.
 *
 * `mosaic`'s enumerated half is 8,551 tiles and `negative`'s a further 208,
 * each of them really rendered, so this is real work rather than a hang —
 * declared rather than left to the default five seconds, the same way the
 * charter measurement declares its own.
 */
const FULL_SWEEP_TIMEOUT_MILLISECONDS = 120_000;

/**
 * A fixed lattice address stood in for real identification everywhere below
 * but "real generation integration": `meanderGenerationService.generate` is
 * mocked to the same fixture text for every combination there, which no row
 * count could really be read at, so `identifyDocument` is spied to return
 * this instead of parsing it. Real identification is exercised by "real
 * generation integration" against real, per-combination documents.
 */
const MOCKED_ADDRESS: LatticeAddress = {
  address: "3r2c-56a9",
  canonicalIdentifier: "56a9",
  identifier: "56a9",
  rows: 3,
  span: 2,
};

/**
 * The suffix `MOCKED_ADDRESS` carries in a shape-only family's filename —
 * every named-type combination this suite asserts an exact filename for is
 * one, so the full-address spelling is exercised only by "real generation
 * integration" and by `output-path.service.unit.test.ts`.
 */
const MOCKED_SHAPE_SUFFIX = "-3r2c";

describe(DrawCommand, () => {
  let command: DrawCommand;
  let latticeIdentificationService: LatticeIdentificationService;
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
        {
          provide: MotifPitchService,
          useValue: createMock<MotifPitchService>(),
        },
        OutputPathService,
        GridGeometryService,
        MosaicNamingService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MeanderLatticeService,
        LatticeIdentificationService,
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
    latticeIdentificationService = await module.resolve(
      LatticeIdentificationService,
    );
    meanderGenerationService = await module.resolve(MeanderGenerationService);
  });

  beforeEach(() => {
    mockMkdir.mockClear();
    mockWriteFile.mockClear();
    vi.mocked(meanderGenerationService.generate).mockReturnValue(
      "<svg>fixture</svg>\n",
    );
    // 🎯 The fixture above is not a document any row count could really be
    // read at, so identification is stood in for rather than exercised —
    // see `MOCKED_ADDRESS`.
    vi.spyOn(latticeIdentificationService, "identifyDocument").mockReturnValue(
      MOCKED_ADDRESS,
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
        {
          provide: MotifPitchService,
          useValue: createMock<MotifPitchService>(),
        },
        OutputPathService,
        GridGeometryService,
        MosaicNamingService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MeanderLatticeService,
        LatticeIdentificationService,
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
    it(
      "writes the expected number of files across all nine motif-drawn types, with no path collisions",

      async () => {
        await command.run([], { outputDirectory: "output", repeatCount: 6 });

        expect(mockMkdir).toHaveBeenCalledWith("output/boxes/3-rows", {
          recursive: true,
        });

        // 🎯 rows sweep runs from each type's own structural minimum to its
        // own `FAMILY_MAXIMUM_ROWS`: 2..12 (branch, parallel), 3..12 (boxes,
        // negative), 4..12 (chain, snake, swirl, whirl), or 6..12 (cross),
        // crossed with "no modifier" plus every compatible modifier (rung
        // expands to 2 representative values, stagger to 3):

        // `mosaic` contributes nothing. It is drawn from its enumerated
        // space rather than from a motif — see `TILE_DRAWN_TYPES` — so
        // every one of its drawings is counted in the permutation half
        // below instead. It used to contribute 24 here.

        // boxes: 10 rows * (1 + 1 + 1) modifiers = 30

        // chain: 9 rows * (1 + 1 + 1 + 1) modifiers = 36
        // snake: 9 rows * (1 + 1 + 1 + 1) modifiers = 36
        // swirl: 9 rows * (1 + 1) modifiers = 18
        // whirl: 9 rows * (1 + 1) modifiers = 18
        // cross: 7 rows * (1 + 1) modifiers = 14
        // negative: 10 rows * (1 + 9) modifiers = 100
        // branch: 11 rows * (1 + 2 + 3) modifiers = 66

        // `parallel` is the one family whose modifiers do not expand to a
        // fixed number of values, so it is the one row here that is neither a
        // multiplication nor a single literal. It has no unmodified entry —
        // `plied` names that drawing — and `aligned` sweeps 1..rows while
        // `plied` sweeps 2..rows, which is the `2 * rows - 1` term: at one
        // strand there is nothing to ply, so only `aligned` still draws it.

        // `serpentine` sweeps every
        // *distinct* rotation and flip of each of those plies, and distinct
        // is the operative word: rotating a partition whose strips are all the
        // same depth changes nothing, `alternating` and `one` name the same
        // ribbon below three strands, and flipping a strip with no depth is a
        // no-op. Its one-strand ply is dropped for the same reason `plied`'s
        // is, which is why every per-row count here is two lower than it
        // used to be. So its per-row counts are written out rather than
        // derived — they are what `ParallelSerpentineService.variants`
        // deduplicates down to, and a change in that deduplication should
        // fail here rather than quietly committing the same drawing twice.
        const serpentinePerRow: Record<number, number> = {
          2: 3,
          3: 7,
          4: 17,
          5: 17,
          6: 42,
          7: 43,
          8: 63,
          9: 64,
          10: 124,
          11: 83,
          12: 180,
        };
        const expectedParallelCount = [
          2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
        ].reduce(
          (total, rows) => total + 2 * rows - 1 + (serpentinePerRow[rows] ?? 0),
          0,
        );
        const expectedNamedTypeCount =
          30 + 36 + 36 + 18 + 18 + 14 + 100 + 60 + expectedParallelCount;

        const writtenFileNames = vi
          .mocked(mockWriteFile)
          .mock.calls.map(([filePath]) => filePath);
        const namedTypeFiles = writtenFileNames.filter(
          (filePath) =>
            filePath.endsWith(".svg") && !COLUMN_SPAN_PATTERN.test(filePath),
        );

        expect(namedTypeFiles).toHaveLength(expectedNamedTypeCount);
        expect(new Set(writtenFileNames).size).toBe(writtenFileNames.length);
      },
      FULL_SWEEP_TIMEOUT_MILLISECONDS,
    );

    it("nests each permutation half under the row count and column span that produced it", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

      const writtenFileNames = vi
        .mocked(mockWriteFile)
        .mock.calls.map(([filePath]) => filePath);
      // 🎯 An enumerated tile is one filed under a column span, whichever
      // family wrote it. Only `negative` still nests its enumerated half
      // under a `permutations/` level; `mosaic` files its directly beside
      // the named drawings, since every tile it draws is a member of one
      // space.
      const permutations = writtenFileNames.filter((filePath) =>
        COLUMN_SPAN_PATTERN.test(filePath),
      );

      expect(mockMkdir).toHaveBeenCalledWith("output/mosaic/4-rows/1-columns", {
        recursive: true,
      });
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
      expect(permutations).toHaveLength(8551 + 208);
      expect(permutations).toContain(
        "output/mosaic/6-rows/1-columns/00000-dots.svg",
      );
      expect(permutations).toContain(
        "output/negative/6-rows/permutations/1-columns/030303-ruled.svg",
      );
    });

    it("writes one index page at the root of the output directory, listing every drawing", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

      const index = vi
        .mocked(mockWriteFile)
        .mock.calls.find(([filePath]) => filePath === "output/index.html");

      expect(index).toBeDefined();
      expect(index?.[1]).toContain("<title>Meanderaw</title>");
      expect(index?.[1]).toContain("9857 drawings");

      expect(index?.[1]).toContain(
        'src="mosaic/6-rows/1-columns/00000-dots.svg"',
      );
      expect(index?.[1]).toContain(
        `src="boxes/3-rows/spin-8-repeats${MOCKED_SHAPE_SUFFIX}.svg"`,
      );
    });

    it("generates every combination through the shared generation service", async () => {
      await command.run([], { outputDirectory: "output", repeatCount: 6 });

      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([{ repeatCount: 6, rows: 3, type: "boxes" }]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        { modifier: { name: "spin" }, repeatCount: 8, rows: 3, type: "boxes" },
      ]);
      expect(
        vi.mocked(meanderGenerationService.generate).mock.calls,
      ).toContainEqual([
        {
          modifier: { branches: 4, name: "stagger" },
          repeatCount: 6,
          rows: 3,
          type: "branch",
        },
      ]);

      // 🎯 The tile-drawn family reaches disk through
      // `DrawPermutationsService` rather than this service, so the sweep
      // asks it for no `mosaic` at all.
      expect(
        vi
          .mocked(meanderGenerationService.generate)
          .mock.calls.filter(([parameters]) => parameters.type === "mosaic"),
      ).toStrictEqual([]);
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
        `custom-batch-output/boxes/3-rows/plain-6-repeats${MOCKED_SHAPE_SUFFIX}.svg`,
      );
      expect(writtenFilePaths).toContainEqual(
        `custom-batch-output/boxes/3-rows/spin-8-repeats${MOCKED_SHAPE_SUFFIX}.svg`,
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
          {
            provide: LatticeIdentificationService,
            useValue: createMock<LatticeIdentificationService>(),
          },
          {
            provide: MotifPitchService,
            useValue: createMock<MotifPitchService>(),
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
        `output/boxes/5-rows/plain-8-repeats${MOCKED_SHAPE_SUFFIX}.svg`,
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
        `output/boxes/5-rows/spin-4-repeats${MOCKED_SHAPE_SUFFIX}.svg`,
        "<svg>fixture</svg>\n",
      );
    });

    it("forwards the sub-family to the generation service and names the file after it", async () => {
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
        `output/parallel/6-rows/plied-strands-3-6-repeats${MOCKED_SHAPE_SUFFIX}.svg`,
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
      {
        flag: "--strands",
        modifier: "plied" as const,
        type: "parallel" as const,
      },
      {
        flag: "--branches",
        modifier: "stagger" as const,
        type: "branch" as const,
      },
    ])(
      "refuses $modifier without $flag rather than guessing one",
      async ({ flag, modifier, type }) => {
        await expect(
          command.run([], {
            modifier,
            outputDirectory: "output",
            repeatCount: 6,
            rows: 6,
            type,
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

    it("rejects a name that is no sub-family, including the singular the dots one sounds like", () => {
      expect(() => command.parseSubFamily("dot")).toThrow(
        /unsupported sub-family/i,
      );
    });

    it.each([
      { method: "parseBranches" as const, value: "2" },
      { method: "parseRepeatCount" as const, value: "2" },
      { method: "parseRows" as const, value: "2" },
      { method: "parseStrands" as const, value: "2" },
    ])("parses $method's numeric string as an integer", ({ method, value }) => {
      expect(command[method](value)).toBe(2);
    });

    // 🎯 The one boolean flag the command takes. Bare is the ordinary way
    // to pass it, and the two spellings that turn it off are there so
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

    it("passes the output directory through unchanged", () => {
      expect(command.parseOutputDirectory("./custom-output")).toBe(
        "./custom-output",
      );
    });
  });

  describe("real generation integration", () => {
    it(
      "generates every enumerated combination through the real generation service without throwing",
      async () => {
        const module = await Test.createTestingModule({
          imports: [
            LatticeIdentificationModule,
            MeanderGenerationModule,
            MosaicNamingModule,
          ],
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

        // 🎯 every one of the 1,098 enumerated named-type combinations, every
        // one of the 8,551 mosaic tiles, and every one of the 208 one-column
        // negative sources, reached its real generation
        // service and real validators without throwing — this is the
        // regression guard the mocked tests above can't provide, since they
        // replace the generation services entirely. The extra file is the
        // single index page listing all of them.
        expect(mockWriteFile).toHaveBeenCalledTimes(1098 + 8551 + 208 + 1);
      },
      FULL_SWEEP_TIMEOUT_MILLISECONDS,
    );
  });
});
