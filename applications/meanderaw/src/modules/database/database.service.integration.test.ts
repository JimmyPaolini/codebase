import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, Like, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { meanderRecord } from "../../../testing/meanders";
import {
  COLUMN_CHARACTERISTIC_KEYS,
  NUMERIC_CHARACTERISTIC_KEYS,
} from "../characteristics/characteristics.constants";

import { MEANDER_INSERT_CHUNK_SIZE } from "./database.constants";
import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

// 🧪 Tests

/**
 * Drives `DatabaseService` against a real TypeORM connection to an
 * in-memory `better-sqlite3` database, per spec #813's Testing Decisions:
 * this is the highest seam, and it asserts on persisted rows rather than on
 * a mocked repository.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always opens the one committed database
 * file — a test needs a fresh, isolated connection of its own instead.
 */
describe(DatabaseService, () => {
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DatabaseService;

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
      providers: [DatabaseService],
    }).compile();

    service = await module.resolve(DatabaseService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("resolves with an empty array before anything is committed", async () => {
      await expect(service.findAll()).resolves.toStrictEqual([]);
    });

    it("reads every committed row", async () => {
      await service.save(meanderRecord({ code: "findAll-first-row" }));
      await service.save(meanderRecord({ code: "findAll-second-row" }));

      const rows = await service.findAll();

      expect(rows.map((row) => row.code)).toStrictEqual(
        expect.arrayContaining(["findAll-first-row", "findAll-second-row"]),
      );
    });
  });

  describe("save", () => {
    it("persists a meander row with every field it was given", async () => {
      const saved = await service.save(
        meanderRecord({
          bettiNumber0Count: 1,
          characteristics: ["zigzag"],
          code: "3c9a",
          columns: 2,
          density: 0.5,
          family: "snake",
          forkCount: 1,
          lattice: "3c9a",
          rows: 3,
        }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
        ...meanderRecord({
          bettiNumber0Count: 1,
          characteristics: ["zigzag"],
          code: "3c9a",
          columns: 2,
          density: 0.5,
          family: "snake",
          forkCount: 1,
          lattice: "3c9a",
          rows: 3,
        }),
        id: saved.id,
      });
    });

    it("assigns each saved row its own auto-generated id", async () => {
      const first = await service.save(meanderRecord({ code: "0" }));
      const second = await service.save(meanderRecord({ code: "f" }));

      expect(second.id).not.toBe(first.id);
    });

    it("refuses a second row with a code already committed, since code is the meander's whole identity", async () => {
      await service.save(meanderRecord({ code: "duplicate-code" }));

      await expect(
        service.save(meanderRecord({ code: "duplicate-code" })),
      ).rejects.toThrow(/UNIQUE constraint/i);
    });
  });

  describe("characteristic numeric columns", () => {
    it("is queryable by a numeric Characteristic column, per spec #813's acceptance criteria", async () => {
      await service.save(
        meanderRecord({ code: "crossing-row", crossCount: 1 }),
      );
      await service.save(
        meanderRecord({ bettiNumber0Count: 2, code: "plain-row" }),
      );

      const crossingRows = await repository.findBy({ crossCount: 1 });

      expect(crossingRows.map((row) => row.code)).toStrictEqual([
        "crossing-row",
      ]);
    });
  });

  describe("glyphs", () => {
    it("stores every numeric characteristic but a letter under a column of its own, and no letter in one", () => {
      const columns = new Set(
        dataSource
          .getMetadata(Meander)
          .columns.map((column) => column.propertyName),
      );

      expect(
        NUMERIC_CHARACTERISTIC_KEYS.filter((key) => columns.has(key)),
      ).toStrictEqual([...COLUMN_CHARACTERISTIC_KEYS]);
      expect(columns.has("glyphs")).toBe(true);
    });

    it("round-trips a meander's letter counts through save and a lattice lookup", async () => {
      await service.save(
        meanderRecord({
          code: "glyph-round-trip",
          glyphs: { aSoutheastLatinCount: 2, yuSoutheastHangulCount: 1 },
          lattice: "glyph-round-trip",
        }),
      );

      const found = await service.findOneByLattice("glyph-round-trip", 2, 1);

      expect(found?.glyphs).toStrictEqual({
        aSoutheastLatinCount: 2,
        yuSoutheastHangulCount: 1,
      });
    });

    it("round-trips an empty glyph map as empty", async () => {
      await service.save(
        meanderRecord({ code: "glyph-empty", lattice: "glyph-empty" }),
      );

      const found = await service.findOneByLattice("glyph-empty", 2, 1);

      expect(found?.glyphs).toStrictEqual({});
    });

    it("round-trips letter counts written in chunks, every row keeping its own", async () => {
      const records = Array.from(
        { length: MEANDER_INSERT_CHUNK_SIZE + 1 },
        (_row, index) =>
          meanderRecord({
            code: `glyph-chunk-${index}`,
            glyphs: { oSoutheastLatinCount: index + 1 },
            lattice: `glyph-chunk-${index}`,
          }),
      );

      await service.saveAll(records);
      const rows = await repository.findBy({ code: Like("glyph-chunk-%") });

      expect(
        rows.every(
          (row) =>
            row.glyphs.oSoutheastLatinCount ===
            Number(row.lattice.split("-")[2]) + 1,
        ),
      ).toBe(true);
      expect(rows).toHaveLength(records.length);
    });

    it("is queryable by one letter's count, which a missing letter never matches", async () => {
      await service.save(
        meanderRecord({
          code: "glyph-query-hit",
          glyphs: { tSoutheastLatinCount: 3 },
          lattice: "glyph-query-hit",
        }),
      );
      await service.save(
        meanderRecord({
          code: "glyph-query-miss",
          glyphs: { uSoutheastLatinCount: 1 },
          lattice: "glyph-query-miss",
        }),
      );

      const hits = await repository
        .createQueryBuilder("meander")
        .where("json_extract(meander.glyphs, :path) > 0", {
          path: "$.tSoutheastLatinCount",
        })
        .getMany();

      expect(hits.map((row) => row.code)).toStrictEqual(["glyph-query-hit"]);
    });
  });

  describe("saveAll", () => {
    it("writes more rows than one chunk holds, every column bound, without exceeding the driver's variable limit", async () => {
      const records = Array.from(
        { length: MEANDER_INSERT_CHUNK_SIZE * 2 + 1 },
        (_row, index) =>
          meanderRecord({ code: `save-all-${index}`, lattice: `${index}` }),
      );

      await expect(service.saveAll(records)).resolves.toBe(records.length);
      await expect(
        repository.countBy({ code: Like("save-all-%") }),
      ).resolves.toBe(records.length);
    });
  });

  describe("family and subFamily columns", () => {
    it("persists a trusted family and subFamily alongside a row", async () => {
      const saved = await service.save(
        meanderRecord({
          characteristics: ["dots"],
          code: "trusted-row",
          family: "boxes",
        }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
        characteristics: ["dots"],
        family: "boxes",
      });
    });

    it("leaves family and subFamily null when a row names neither", async () => {
      const saved = await service.save(
        meanderRecord({ code: "untrusted-row" }),
      );

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row.family).toBe("unclassified");
      expect(row.characteristics).toStrictEqual([]);
    });
  });
});
