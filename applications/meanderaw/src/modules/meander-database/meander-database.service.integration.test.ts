import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Meander } from "./entities/Meander.entity";
import { MeanderDatabaseService } from "./meander-database.service";

// 🧪 Tests

/**
 * Drives `MeanderDatabaseService` against a real TypeORM connection to an
 * in-memory `better-sqlite3` database, per spec #813's Testing Decisions:
 * this is the highest seam, and it asserts on persisted rows rather than on
 * a mocked repository.
 *
 * The connection is assembled inline rather than through
 * `MeanderDatabaseModule`, which always opens the one committed database
 * file — a test needs a fresh, isolated connection of its own instead.
 */
describe(MeanderDatabaseService, () => {
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: MeanderDatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          database: ":memory:",
          entities: [Meander],
          logging: false,
          synchronize: true,
          type: "better-sqlite3",
        }),
        TypeOrmModule.forFeature([Meander]),
      ],
      providers: [MeanderDatabaseService],
    }).compile();

    service = await module.resolve(MeanderDatabaseService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("save", () => {
    it("persists a meander row with every field it was given", async () => {
      const saved = await service.save({
        code: "3c9a",
        columns: 2,
        pitch: 2,
        provenance: "hardcoded",
        rows: 3,
        svg: "<svg>fixture</svg>\n",
      });

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
        code: "3c9a",
        columns: 2,
        pitch: 2,
        provenance: "hardcoded",
        rows: 3,
        svg: "<svg>fixture</svg>\n",
      });
    });

    it("assigns each saved row its own auto-generated id", async () => {
      const first = await service.save({
        code: "0",
        columns: 1,
        pitch: 1,
        provenance: "hardcoded",
        rows: 2,
        svg: "<svg>a</svg>\n",
      });
      const second = await service.save({
        code: "f",
        columns: 1,
        pitch: 1,
        provenance: "hardcoded",
        rows: 2,
        svg: "<svg>b</svg>\n",
      });

      expect(second.id).not.toBe(first.id);
    });

    it("refuses a second row with a code already committed, since code is the meander's whole identity", async () => {
      await service.save({
        code: "duplicate-code",
        columns: 1,
        pitch: 1,
        provenance: "hardcoded",
        rows: 2,
        svg: "<svg>first</svg>\n",
      });

      await expect(
        service.save({
          code: "duplicate-code",
          columns: 1,
          pitch: 1,
          provenance: "hardcoded",
          rows: 2,
          svg: "<svg>second</svg>\n",
        }),
      ).rejects.toThrow(/UNIQUE constraint/i);
    });
  });
});
