import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { SubFamilyService } from "../classification/sub-family.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { EnumerationService } from "../enumeration/enumeration.service";

import { DuplicateCorpusCodeError } from "./corpus.constants";
import { CorpusService } from "./corpus.service";

import type { Characteristics } from "../characteristics/characteristics.types";
import type { ParsedCode } from "../code/code.types";
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
  let subFamilyService: SubFamilyService;

  const parsed: ParsedCode = {
    columns: 1,
    digits: "2",
    levels: 1,
    rows: 2,
  };
  const tile = createMock<Tile>({ columns: 1, rows: 2 });
  const characteristics = createMock<Characteristics>({
    components: 1,
    cycles: 0,
    freeEnds: 2,
    hasBranching: true,
    hasCrossing: false,
    inkTJunctions: 1,
    inkXJunctions: 0,
    negativeTJunctions: 0,
    negativeXJunctions: 0,
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
        {
          provide: SubFamilyService,
          useValue: createMock<SubFamilyService>(),
        },
      ],
    }).compile();

    service = await module.resolve(CorpusService);
    characteristicsService = await module.resolve(CharacteristicsService);
    databaseService = await module.resolve(DatabaseService);
    codeService = await module.resolve(CodeService);
    drawingService = await module.resolve(DrawingService);
    enumerationService = await module.resolve(EnumerationService);
    subFamilyService = await module.resolve(SubFamilyService);
  });

  beforeEach(() => {
    vi.mocked(codeService.parse).mockReturnValue(parsed);
    vi.mocked(codeService.tile).mockReturnValue(tile);
    vi.mocked(drawingService.render).mockReturnValue("<svg>fixture</svg>\n");
    vi.mocked(characteristicsService.compute).mockReturnValue(characteristics);
    vi.mocked(subFamilyService.name).mockReturnValue(undefined);
    vi.mocked(enumerationService.isAdmitted).mockReturnValue(false);
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

      expect(drawingService.render).toHaveBeenCalledWith(parsed);
    });

    it("computes the Characteristics of the Code it read", async () => {
      await service.ingest([entry]);

      expect(characteristicsService.compute).toHaveBeenCalledWith(parsed);
    });

    it("persists each entry with pitch equal to columns, hardcoded provenance, and the first family it was filed under", async () => {
      await service.ingest([
        { code: "3", columns: 3, filedUnder: ["branch", "parallel"], rows: 4 },
      ]);

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

    it("names a sub-family from the tile the Code draws rather than carrying one in the entry", async () => {
      vi.mocked(subFamilyService.name).mockReturnValue("zigzag");

      await service.ingest([entry]);

      expect(subFamilyService.name).toHaveBeenCalledWith(tile);
      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({ subFamily: "zigzag" }),
      );
    });

    it("leaves subFamily unset for a tile that earns no name", async () => {
      await service.ingest([entry]);

      expect(databaseService.save).toHaveBeenCalledWith(
        expect.objectContaining({ subFamily: null }),
      );
    });

    it("skips an entry at a shape the enumeration already reaches", async () => {
      vi.mocked(enumerationService.isAdmitted).mockReturnValue(true);

      await expect(service.ingest([entry])).resolves.toStrictEqual([]);
      expect(databaseService.save).not.toHaveBeenCalled();
    });

    it("keeps an entry shallower than the sweep's own floor, which the budget alone would admit", async () => {
      vi.mocked(enumerationService.isAdmitted).mockReturnValue(true);

      await expect(
        service.ingest([{ ...entry, rows: 2 }]),
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
        vi.mocked(databaseService.save).mock.calls.map(([row]) => row.code),
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
