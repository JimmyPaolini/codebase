import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Meander } from "./entities/Meander.entity";
import { MeanderDatabaseService } from "./meander-database.service";

import type { MeanderRecord } from "./meander-database.types";
import type { Repository } from "typeorm";

// 🧪 Tests

describe(MeanderDatabaseService, () => {
  let service: MeanderDatabaseService;
  let meanderRepository: Repository<Meander>;

  const record: MeanderRecord = {
    code: "3c9a",
    columns: 2,
    components: 1,
    cycles: 0,
    family: null,
    freeEnds: 0,
    hasBranching: false,
    hasCrossing: false,
    inkTJunctions: 0,
    inkXJunctions: 0,
    negativeTJunctions: 0,
    negativeXJunctions: 0,
    pitch: 2,
    provenance: "hardcoded",
    rows: 3,
    subFamily: null,
    svg: "<svg>fixture</svg>\n",
  };
  const savedMeander = createMock<Meander>({ id: 1, ...record });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderDatabaseService,
        {
          provide: getRepositoryToken(Meander),
          useValue: createMock<Repository<Meander>>(),
        },
      ],
    }).compile();

    service = await module.resolve(MeanderDatabaseService);
    meanderRepository = module.get(getRepositoryToken(Meander));

    vi.mocked(meanderRepository.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
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
});
