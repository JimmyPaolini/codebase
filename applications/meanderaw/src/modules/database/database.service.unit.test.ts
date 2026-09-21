import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

import type { MeanderRecord } from "./database.types";
import type { EntityManager, Repository } from "typeorm";

// 🧪 Tests

describe(DatabaseService, () => {
  let service: DatabaseService;
  let meanderRepository: Repository<Meander>;

  const record: MeanderRecord = {
    code: "3c9a",
    columns: 2,
    componentCount: 0,
    components: 1,
    cornerCount: 0,
    cycleCount: 0,
    cycles: 0,
    density: 0,
    dotCount: 0,
    edgeCount: 0,
    embeddedOCount: 0,
    embeddedUCount: 0,
    family: "unclassified",
    freeEnds: 0,
    horizontalDashCount: 0,
    horizontalPointCount: 0,
    inkPointCount: 0,
    lattice: "3c9a",
    lCount: 0,
    longestHorizontalRun: 0,
    longestVerticalRun: 0,
    oCount: 0,
    plusCount: 0,
    repeats: 1,
    seamComponents: 0,
    seamCycles: 0,
    seamTJunctions: 0,
    seamXJunctions: 0,
    shapeICount: 0,
    tCount: 0,
    uCount: 0,
    verticalDashCount: 0,
    verticalPointCount: 0,
    xCount: 0,

    inkTJunctions: 0,
    inkXJunctions: 0,

    characteristics: [],
    drawingHash: "hash",
    pitch: 2,
    provenance: "hardcoded",
    rows: 3,
  };
  const savedMeander = createMock<Meander>({ id: 1, ...record });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: getRepositoryToken(Meander),
          useValue: createMock<Repository<Meander>>(),
        },
      ],
    }).compile();

    service = await module.resolve(DatabaseService);
    meanderRepository = module.get(getRepositoryToken(Meander));

    vi.mocked(meanderRepository.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("delegates to the repository's own find", async () => {
      vi.mocked(meanderRepository.find).mockResolvedValue([savedMeander]);

      await expect(service.findAll()).resolves.toStrictEqual([savedMeander]);
      expect(meanderRepository.find).toHaveBeenCalledWith();
    });
  });

  describe("save", () => {
    it("delegates to the repository's own save", async () => {
      await service.save(record);

      expect(meanderRepository.save).toHaveBeenCalledWith(record);
    });

    it("resolves with the row the repository saved", async () => {
      await expect(service.save(record)).resolves.toBe(savedMeander);
    });
  });

  describe("findOneByLattice", () => {
    it("delegates findOneBy with columns, lattice, and rows", async () => {
      vi.mocked(meanderRepository.findOneBy).mockResolvedValue(savedMeander);

      await expect(
        service.findOneByLattice("3c9a", 3, 2),
      ).resolves.toStrictEqual(savedMeander);
      expect(meanderRepository.findOneBy).toHaveBeenCalledWith({
        columns: 2,
        lattice: "3c9a",
        rows: 3,
      });
    });
  });

  describe("saveAll", () => {
    it("saves all records in chunks using a transaction", async () => {
      vi.mocked(meanderRepository.manager.transaction).mockImplementation(
        async (
          callbackOrLevel: unknown,
          maybeCallback?: (manager: EntityManager) => Promise<unknown>,
        ) => {
          const callback =
            typeof callbackOrLevel === "function"
              ? (callbackOrLevel as (
                  manager: EntityManager,
                ) => Promise<unknown>)
              : maybeCallback;
          if (callback) {
            await callback(meanderRepository.manager);
          }
        },
      );
      vi.mocked(meanderRepository.manager.insert).mockResolvedValue(
        undefined as never,
      );

      const records = [record, { ...record, lattice: "3c9b" }];
      const count = await service.saveAll(records);

      expect(count).toBe(2);
      expect(meanderRepository.manager.insert).toHaveBeenCalledWith(
        Meander,
        records,
      );
    });
  });
});
