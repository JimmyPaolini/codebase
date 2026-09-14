import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderDecodingService } from "../meander-decoding/meander-decoding.service";
import { MeanderRenderingService } from "../meander-rendering/meander-rendering.service";

import { DuplicateHardcodedCodeError } from "./hardcoded-meanders.constants";
import { HardcodedMeandersService } from "./hardcoded-meanders.service";

import type { MeanderCharacteristics } from "../meander-characteristics/meander-characteristics.types";
import type { Meander } from "../meander-database/entities/Meander.entity";
import type { MeanderPointGrid } from "../meander-decoding/meander-decoding.types";
import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

// 🧪 Tests

describe(HardcodedMeandersService, () => {
  let service: HardcodedMeandersService;
  let meanderCharacteristicsService: MeanderCharacteristicsService;
  let meanderDatabaseService: MeanderDatabaseService;
  let meanderDecodingService: MeanderDecodingService;
  let meanderRenderingService: MeanderRenderingService;

  const grid: MeanderPointGrid = [
    [{ east: true, north: false, south: false, west: false }],
  ];
  const characteristics: MeanderCharacteristics = {
    components: 1,
    cycles: 0,
    freeEnds: 2,
    hasBranching: true,
    hasCrossing: false,
    inkTJunctions: 1,
    inkXJunctions: 0,
    negativeTJunctions: 0,
    negativeXJunctions: 0,
  };
  const savedMeander = createMock<Meander>({ id: 1 });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HardcodedMeandersService,
        {
          provide: MeanderCharacteristicsService,
          useValue: createMock<MeanderCharacteristicsService>(),
        },
        {
          provide: MeanderDatabaseService,
          useValue: createMock<MeanderDatabaseService>(),
        },
        {
          provide: MeanderDecodingService,
          useValue: createMock<MeanderDecodingService>(),
        },
        {
          provide: MeanderRenderingService,
          useValue: createMock<MeanderRenderingService>(),
        },
      ],
    }).compile();

    service = await module.resolve(HardcodedMeandersService);
    meanderCharacteristicsService = await module.resolve(
      MeanderCharacteristicsService,
    );
    meanderDatabaseService = await module.resolve(MeanderDatabaseService);
    meanderDecodingService = await module.resolve(MeanderDecodingService);
    meanderRenderingService = await module.resolve(MeanderRenderingService);

    vi.mocked(meanderDecodingService.decode).mockReturnValue(grid);
    vi.mocked(meanderRenderingService.render).mockReturnValue(
      "<svg>fixture</svg>\n",
    );
    vi.mocked(meanderCharacteristicsService.compute).mockReturnValue(
      characteristics,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("ingest", () => {
    const entry: HardcodedMeanderEntry = { code: "2", columns: 1, rows: 2 };

    it("decodes each entry's code at its own rows and columns", async () => {
      vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(meanderDecodingService.decode).toHaveBeenCalledWith("2", 2, 1);
    });

    it("renders the decoded grid at the entry's rows and columns", async () => {
      vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(meanderRenderingService.render).toHaveBeenCalledWith(grid, 2, 1);
    });

    it("computes the decoded grid's Characteristics", async () => {
      vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(meanderCharacteristicsService.compute).toHaveBeenCalledWith(grid);
    });

    it("persists each entry with pitch equal to columns, hardcoded provenance, and its family trusted", async () => {
      vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({
        branch: [{ code: "3", columns: 3, rows: 4 }],
      });

      expect(meanderDatabaseService.save).toHaveBeenCalledWith({
        code: "3",
        columns: 3,
        components: 1,
        cycles: 0,
        family: "branch",
        freeEnds: 2,
        hasBranching: true,
        hasCrossing: false,
        inkTJunctions: 1,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 3,
        provenance: "hardcoded",
        rows: 4,
        subFamily: null,
        svg: "<svg>fixture</svg>\n",
      });
    });

    it("carries over an entry's trusted subFamily when it names one", async () => {
      vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({
        boxes: [{ ...entry, subFamily: "zigzag" }],
      });

      expect(meanderDatabaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({ subFamily: "zigzag" }),
      );
    });

    it("leaves subFamily unset for an entry that names none", async () => {
      vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(meanderDatabaseService.save).toHaveBeenCalledWith({
        code: "2",
        columns: 1,
        components: 1,
        cycles: 0,
        family: "boxes",
        freeEnds: 2,
        hasBranching: true,
        hasCrossing: false,
        inkTJunctions: 1,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 1,
        provenance: "hardcoded",
        rows: 2,
        subFamily: null,
        svg: "<svg>fixture</svg>\n",
      });
    });

    it("resolves with every saved row, across every family", async () => {
      const secondMeander = createMock<Meander>({ id: 2 });

      vi.mocked(meanderDatabaseService.save)
        .mockResolvedValueOnce(savedMeander)
        .mockResolvedValueOnce(secondMeander);

      await expect(
        service.ingest({
          boxes: [entry],
          branch: [{ code: "3", columns: 3, rows: 4 }],
        }),
      ).resolves.toStrictEqual([savedMeander, secondMeander]);
    });

    it("raises a clear ingestion failure when a Code collides with one already committed", async () => {
      vi.mocked(meanderDatabaseService.save).mockRejectedValue(
        new Error("UNIQUE constraint failed: meanders.code"),
      );

      await expect(service.ingest({ boxes: [entry] })).rejects.toThrow(
        DuplicateHardcodedCodeError,
      );
    });
  });
});
