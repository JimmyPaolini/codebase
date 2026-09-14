import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Meander } from "./entities/Meander.entity";
import { MeanderDatabaseService } from "./meander-database.service";

import type { MeanderRecord } from "./meander-database.types";

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

  /** Every field besides `code` a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const record = (
    overrides: Partial<MeanderRecord> & Pick<MeanderRecord, "code">,
  ): MeanderRecord => ({
    columns: 1,
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
    pitch: 1,
    provenance: "hardcoded",
    rows: 2,
    subFamily: null,
    svg: "<svg>fixture</svg>\n",
    ...overrides,
  });

  describe("save", () => {
    it("persists a meander row with every field it was given", async () => {
      const saved = await service.save({
        code: "3c9a",
        columns: 2,
        components: 1,
        cycles: 0,
        family: "snake",
        freeEnds: 0,
        hasBranching: true,
        hasCrossing: false,
        inkTJunctions: 1,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 2,
        provenance: "hardcoded",
        rows: 3,
        subFamily: "zigzag",
        svg: "<svg>fixture</svg>\n",
      });

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
        code: "3c9a",
        columns: 2,
        components: 1,
        cycles: 0,
        family: "snake",
        freeEnds: 0,
        hasBranching: true,
        hasCrossing: false,
        inkTJunctions: 1,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 2,
        provenance: "hardcoded",
        rows: 3,
        subFamily: "zigzag",
        svg: "<svg>fixture</svg>\n",
      });
    });

    it("assigns each saved row its own auto-generated id", async () => {
      const first = await service.save(record({ code: "0" }));
      const second = await service.save(record({ code: "f" }));

      expect(second.id).not.toBe(first.id);
    });

    it("refuses a second row with a code already committed, since code is the meander's whole identity", async () => {
      await service.save(record({ code: "duplicate-code" }));

      await expect(
        service.save(record({ code: "duplicate-code" })),
      ).rejects.toThrow(/UNIQUE constraint/i);
    });
  });

  describe("characteristic columns", () => {
    it("is queryable by a boolean Characteristic column, per spec #813's acceptance criteria", async () => {
      await service.save(record({ code: "crossing-row", hasCrossing: true }));
      await service.save(record({ code: "plain-row" }));

      const crossingRows = await repository.findBy({ hasCrossing: true });

      expect(crossingRows.map((row) => row.code)).toStrictEqual([
        "crossing-row",
      ]);
    });
  });

  describe("family and subFamily columns", () => {
    it("persists a trusted family and subFamily alongside a row", async () => {
      const saved = await service.save(
        record({ code: "trusted-row", family: "boxes", subFamily: "dots" }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({ family: "boxes", subFamily: "dots" });
    });

    it("leaves family and subFamily null when a row names neither", async () => {
      const saved = await service.save(record({ code: "untrusted-row" }));

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row.family).toBeNull();
      expect(row.subFamily).toBeNull();
    });
  });
});
