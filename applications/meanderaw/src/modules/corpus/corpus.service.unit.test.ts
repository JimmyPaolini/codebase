import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";

import { DuplicateCorpusCodeError } from "./corpus.constants";
import { CorpusService } from "./corpus.service";

import type { Characteristics } from "../characteristics/characteristics.types";
import type { ParsedCode } from "../code/code.types";
import type { Meander } from "../database/entities/Meander.entity";
import type { CorpusEntry } from "./corpus.types";

// 🧪 Tests

describe(CorpusService, () => {
  let service: CorpusService;
  let characteristicsService: CharacteristicsService;
  let databaseService: DatabaseService;
  let codeService: CodeService;
  let drawingService: DrawingService;

  const parsed: ParsedCode = {
    columns: 1,
    digits: "2",
    levels: 1,
    rows: 2,
  };
  const characteristics: Characteristics = {
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
        CorpusService,
        {
          provide: CharacteristicsService,
          useValue: createMock<CharacteristicsService>(),
        },
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: CodeService,
          useValue: createMock<CodeService>(),
        },
        {
          provide: DrawingService,
          useValue: createMock<DrawingService>(),
        },
      ],
    }).compile();

    service = await module.resolve(CorpusService);
    characteristicsService = await module.resolve(CharacteristicsService);
    databaseService = await module.resolve(DatabaseService);
    codeService = await module.resolve(CodeService);
    drawingService = await module.resolve(DrawingService);

    vi.mocked(codeService.parse).mockReturnValue(parsed);
    vi.mocked(drawingService.render).mockReturnValue("<svg>fixture</svg>\n");
    vi.mocked(characteristicsService.compute).mockReturnValue(characteristics);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("ingest", () => {
    const entry: CorpusEntry = { code: "2", columns: 1, rows: 2 };

    it("reads each entry's code at its own rows and columns", async () => {
      vi.mocked(databaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(codeService.parse).toHaveBeenCalledWith("2", 2, 1);
    });

    it("renders the Code it read, which already carries the entry's rows and columns", async () => {
      vi.mocked(databaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(drawingService.render).toHaveBeenCalledWith(parsed);
    });

    it("computes the Characteristics of the Code it read", async () => {
      vi.mocked(databaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(characteristicsService.compute).toHaveBeenCalledWith(parsed);
    });

    it("persists each entry with pitch equal to columns, hardcoded provenance, and its family trusted", async () => {
      vi.mocked(databaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({
        branch: [{ code: "3", columns: 3, rows: 4 }],
      });

      expect(databaseService.save).toHaveBeenCalledWith({
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
      vi.mocked(databaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({
        boxes: [{ ...entry, subFamily: "zigzag" }],
      });

      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({ subFamily: "zigzag" }),
      );
    });

    it("leaves subFamily unset for an entry that names none", async () => {
      vi.mocked(databaseService.save).mockResolvedValue(savedMeander);

      await service.ingest({ boxes: [entry] });

      expect(databaseService.save).toHaveBeenCalledWith({
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

      vi.mocked(databaseService.save)
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
      vi.mocked(databaseService.save).mockRejectedValue(
        new Error("UNIQUE constraint failed: meanders.code"),
      );

      await expect(service.ingest({ boxes: [entry] })).rejects.toThrow(
        DuplicateCorpusCodeError,
      );
    });
  });
});
