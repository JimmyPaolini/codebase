import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ClassificationService } from "../classification/classification.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { EnumerationService } from "../enumeration/enumeration.service";

import { DuplicateCorpusCodeError } from "./corpus.constants";
import { CorpusService } from "./corpus.service";

import type { Characteristics } from "../characteristics/characteristics.types";
import type { Meander } from "../database/entities/Meander.entity";
import type { Tile } from "../tile/tile.types";
import type { CorpusEntry } from "./corpus.types";

// 🧪 Tests

describe(CorpusService, () => {
  let service: CorpusService;
  let characteristicsService: CharacteristicsService;
  let databaseService: DatabaseService;
  let codeService: CodeService;
  let drawingService: DrawingService;
  let enumerationService: EnumerationService;

  const tile = createMock<Tile>({ columns: 1, rows: 2 });
  const characteristics = createMock<Characteristics>({
    components: 1,
    cycles: 0,
    freeEnds: 2,
    inkTJunctions: 1,
    inkXJunctions: 0,
    isClosedLoop: false,
    isJunctionFree: true,
  });
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
          provide: ClassificationService,
          useValue: createMock<ClassificationService>(),
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
        {
          provide: EnumerationService,
          useValue: createMock<EnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(CorpusService);
    characteristicsService = await module.resolve(CharacteristicsService);
    databaseService = await module.resolve(DatabaseService);
    codeService = await module.resolve(CodeService);
    drawingService = await module.resolve(DrawingService);
    enumerationService = await module.resolve(EnumerationService);
  });

  beforeEach(() => {
    vi.mocked(codeService.parse).mockImplementation((code, rows, columns) => ({
      columns: columns ?? 1,
      digits: code,
      repeats: 1,
      rows: rows ?? 2,
    }));
    vi.mocked(codeService.format).mockImplementation(
      (code) =>
        `${String(code.columns).padStart(2, "0")}x${String(code.rows).padStart(2, "0")}y${code.digits}${code.repeats > 1 ? `r${String(code.repeats).padStart(2, "0")}` : ""}`,
    );
    vi.mocked(codeService.canonicalPhase).mockImplementation(
      (parsed) => parsed,
    );
    vi.mocked(codeService.tile).mockReturnValue(tile);
    vi.mocked(drawingService.render).mockReturnValue("<svg>fixture</svg>\n");
    vi.mocked(characteristicsService.compute).mockReturnValue(characteristics);
    vi.mocked(characteristicsService.classifyFamilies).mockReturnValue([]);
    vi.mocked(enumerationService.isAdmitted).mockReturnValue(false);
    vi.mocked(databaseService.findOneByLattice).mockResolvedValue(null);
    vi.mocked(databaseService.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("ingest", () => {
    const entry: CorpusEntry = {
      code: "2",
      columns: 1,
      filedUnder: ["boxes"],
      rows: 4,
    };

    it("reads each entry's code at its own rows and columns", async () => {
      await service.ingest([entry]);

      expect(codeService.parse).toHaveBeenCalledWith("2", 4, 1);
    });

    it("renders the Code it read, which already carries the entry's rows and columns", async () => {
      await service.ingest([entry]);

      expect(drawingService.render).toHaveBeenCalledWith(
        expect.objectContaining({ columns: 1, digits: "2", rows: 4 }),
      );
    });

    it("computes the Characteristics of the Code it read", async () => {
      await service.ingest([entry]);

      expect(characteristicsService.compute).toHaveBeenCalledWith(
        expect.objectContaining({ columns: 1, digits: "2", rows: 4 }),
      );
    });

    it("persists each entry with pitch equal to columns, hardcoded provenance, and the first family it was filed under", async () => {
      await service.ingest([
        { code: "3", columns: 3, filedUnder: ["boxes", "parallel"], rows: 4 },
      ]);

      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "03x04y3",
          columns: 3,
          components: 1,
          cycles: 0,
          family: "boxes",
          freeEnds: 2,

          inkTJunctions: 1,
          inkXJunctions: 0,

          characteristics: ["isJunctionFree"],
          drawingHash:
            "8fa0825a9fafc5c9cc0fa1377d44f9c63d0113001d1fe09388da64ebb410dd7d",
          lattice: "3",
          pitch: 3,
          provenance: "hardcoded",
          repeats: 1,
          rows: 4,
        }),
      );
    });

    it("skips an entry at a shape the enumeration already reaches", async () => {
      vi.mocked(enumerationService.isAdmitted).mockReturnValue(true);

      await expect(service.ingest([entry])).resolves.toStrictEqual([]);
      expect(databaseService.save).not.toHaveBeenCalled();
    });

    it("returns existing record if already found in database", async () => {
      vi.mocked(databaseService.findOneByLattice).mockResolvedValueOnce(
        savedMeander,
      );

      await expect(service.ingest([entry])).resolves.toStrictEqual([
        savedMeander,
      ]);
      expect(databaseService.save).not.toHaveBeenCalled();
    });

    it("keeps an entry shallower than the sweep's own floor, which the budget alone would admit", async () => {
      vi.mocked(enumerationService.isAdmitted).mockReturnValue(true);

      await expect(
        service.ingest([{ ...entry, rows: 1 }]),
      ).resolves.toStrictEqual([savedMeander]);
    });

    it("ingests family by family in the order the retired file tree gave them up", async () => {
      const second = createMock<Meander>({ id: 2 });

      vi.mocked(databaseService.save)
        .mockResolvedValueOnce(savedMeander)
        .mockResolvedValueOnce(second);

      await service.ingest([
        { code: "5", columns: 1, filedUnder: ["snake"], rows: 4 },
        { code: "6", columns: 1, filedUnder: ["boxes"], rows: 4 },
      ]);

      expect(
        vi.mocked(databaseService.save).mock.calls.map(([row]) => row.lattice),
      ).toStrictEqual(["6", "5"]);
    });

    it("resolves with every saved row", async () => {
      const second = createMock<Meander>({ id: 2 });

      vi.mocked(databaseService.save)
        .mockResolvedValueOnce(savedMeander)
        .mockResolvedValueOnce(second);

      await expect(
        service.ingest([
          entry,
          { code: "3", columns: 3, filedUnder: ["branch"], rows: 4 },
        ]),
      ).resolves.toStrictEqual([savedMeander, second]);
    });

    it("raises a clear ingestion failure when a Code collides with one already committed", async () => {
      vi.mocked(databaseService.save).mockRejectedValue(
        new Error("UNIQUE constraint failed: meanders.code"),
      );

      await expect(service.ingest([entry])).rejects.toThrow(
        DuplicateCorpusCodeError,
      );
    });
  });
});
