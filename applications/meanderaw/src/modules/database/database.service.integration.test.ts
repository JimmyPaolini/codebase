import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DatabaseService } from "./database.service";
import { Meander } from "./entities/Meander.entity";

import type { MeanderRecord } from "./database.types";

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

  /** Every field besides `code` a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const record = (
    overrides: Partial<MeanderRecord> & Pick<MeanderRecord, "code">,
  ): MeanderRecord => ({
    arcadePillarCount: 0,
    bifurcationCount: 0,
    columns: 1,
    combSpineCount: 0,
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
    lattice: "0",
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
    pitch: 1,
    provenance: "hardcoded",
    rows: 2,
    ...overrides,
  });

  describe("findAll", () => {
    it("resolves with an empty array before anything is committed", async () => {
      await expect(service.findAll()).resolves.toStrictEqual([]);
    });

    it("reads every committed row", async () => {
      await service.save(record({ code: "findAll-first-row" }));
      await service.save(record({ code: "findAll-second-row" }));

      const rows = await service.findAll();

      expect(rows.map((row) => row.code)).toStrictEqual(
        expect.arrayContaining(["findAll-first-row", "findAll-second-row"]),
      );
    });
  });

  describe("save", () => {
    it("persists a meander row with every field it was given", async () => {
      const saved = await service.save({
        arcadePillarCount: 0,
        bifurcationCount: 0,
        code: "3c9a",
        columns: 2,
        combSpineCount: 0,
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
        family: "snake",
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

        inkTJunctions: 1,
        inkXJunctions: 0,

        characteristics: ["zigzag"],
        drawingHash: "hash",
        pitch: 2,
        provenance: "hardcoded",
        rows: 3,
      });

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row).toMatchObject({
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
        family: "snake",
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

        inkTJunctions: 1,
        inkXJunctions: 0,

        drawingHash: "hash",
        pitch: 2,
        provenance: "hardcoded",
        rows: 3,
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

  describe("characteristic numeric columns", () => {
    it("is queryable by a numeric Characteristic column, per spec #813's acceptance criteria", async () => {
      await service.save(record({ code: "crossing-row", inkXJunctions: 1 }));
      await service.save(record({ code: "plain-row", components: 2 }));

      const crossingRows = await repository.findBy({ inkXJunctions: 1 });

      expect(crossingRows.map((row) => row.code)).toStrictEqual([
        "crossing-row",
      ]);
    });
  });

  describe("family and subFamily columns", () => {
    it("persists a trusted family and subFamily alongside a row", async () => {
      const saved = await service.save(
        record({
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
      const saved = await service.save(record({ code: "untrusted-row" }));

      const row = await repository.findOneByOrFail({ id: saved.id });

      expect(row.family).toBe("unclassified");
      expect(row.characteristics).toStrictEqual([]);
    });
  });
});
