import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { environmentSchema } from "../../constants";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ConnectivityService } from "../characteristics/connectivity.service";
import { ClassificationService } from "../classification/classification.service";
import { SubFamilyService } from "../classification/sub-family.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingService } from "../drawing/drawing.service";
import { EnumerationService } from "../enumeration/enumeration.service";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";

import type { Environment } from "../enumeration/enumeration.types";

// 🔧 Configuration

/**
 * How long the whole sweep may take. It walks `2 ** edges` assignments at
 * each of fourteen shapes, renders an SVG for every meander it keeps, and
 * writes 30,279 rows — about ten seconds locally, and several times that on
 * a shared CI runner. Bounded rather than removed, so a budget raised past
 * what anybody meant fails here rather than running forever.
 */
const SWEEP_TIMEOUT_MILLISECONDS = 180_000;

// 🧪 Tests

/**
 * Drives the sweep's lattice-first half against a real TypeORM connection to
 * an in-memory `better-sqlite3` database, per spec #813's Testing Decisions:
 * this is the highest seam, and it asserts on persisted rows rather than on
 * a mocked service graph.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always opens the one committed database
 * file — this suite needs a fresh, isolated connection instead.
 */
describe(DrawEnumerationService, () => {
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DrawEnumerationService;

  beforeAll(async () => {
    const environment = environmentSchema.parse({});
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
      providers: [
        DrawEnumerationService,
        DrawRecordService,
        GeometryService,
        CodeService,
        CharacteristicsService,
        ClassificationService,
        ConnectivityService,
        DatabaseService,
        CodeService,
        EnumerationService,
        DrawingService,
        GraphService,
        SubFamilyService,
        SymmetryService,
        TileService,
        TileEnumerationService,
        SvgService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: keyof Environment) => environment[key],
          },
        },
      ],
    }).compile();

    service = await module.resolve(DrawEnumerationService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));

    await service.sweep();
  }, SWEEP_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("sweep", () => {
    // 🎯 The acceptance criterion, as one number: every structurally
    // distinct meander the edge budget admits, at every shape it admits one
    // at, persisted. 8,551 of them are the `mosaic` half of the committed
    // corpus, reproduced exactly; the other 21,728 are what the budget
    // admits past that family's own six-row ceiling and nothing swept
    // before.
    it("persists every meander the budget admits, across every shape it admits", async () => {
      await expect(repository.count()).resolves.toBe(30_279);
    });

    // 🎯 A meander's identity is its lattice address — its Code together
    // with the shape that Code is read at — and this is the measurement that
    // says so. 33 Codes are spelled by meanders of two different shapes, 38
    // rows in all: `identify` names a tile by its points and deliberately
    // not by its shape, so the four characters `0000` are two inked dots
    // over two columns of a three-row band and also four down one column of
    // a five-row band. Uniqueness is asserted over the address rather than
    // over the Code for exactly that reason, and the Code count is asserted
    // beside it so that the gap between them cannot close silently.
    it("writes no two rows sharing a lattice address, though 33 Codes are shared across shapes", async () => {
      const rows = await repository.find({
        select: { code: true, columns: true, rows: true },
      });
      const addresses = rows.map(
        ({ code, columns, rows: bandRows }) =>
          `${bandRows}r${columns}c-${code}`,
      );

      expect(new Set(addresses).size).toBe(rows.length);
      expect(new Set(rows.map(({ code }) => code)).size).toBe(30_241);
    });

    it("records every row as enumerated rather than hardcoded", async () => {
      await expect(
        repository.countBy({ provenance: "hardcoded" }),
      ).resolves.toBe(0);
    });

    // 🎯 Family is decided by structure, not by which generator drew
    // something — the whole point of this ticket. The histogram is pinned
    // rather than described: 3,656 meanders belong to no family, which spec
    // #813 asks for outright rather than filtering them from the sweep.
    // `negative` claims 23,735 because its combination — ink that forks and
    // closes a loop — is the least constrained of the ten. `chain`, `swirl`,
    // and `whirl` claim nothing: `chain` shares its whole combination with
    // `boxes`, tried first (the 14 meanders earning both are counted below);
    // `swirl` and `whirl` need 25 and 20 edges at four rows, over the
    // budget of 16, so no shape the sweep walks admits one.
    it("classifies each meander into a family by its own structure, leaving 3,656 of them in none", async () => {
      const counted = await repository
        .createQueryBuilder("meander")
        .select("meander.family", "family")
        .addSelect("COUNT(*)", "count")
        .groupBy("meander.family")
        .getRawMany<{ count: number; family: null | string }>();

      expect(
        Object.fromEntries(
          counted.map(({ count, family }) => [family ?? "unclaimed", count]),
        ),
      ).toStrictEqual({
        boxes: 17,
        branch: 1456,
        cross: 1195,
        mosaic: 131,
        negative: 23_735,
        parallel: 88,
        snake: 1,
        unclaimed: 3656,
      });
    });

    // 🎯 A sub-family is earned beside a family rather than in place of one —
    // ADR 0007's own finding, here over the enumerated space rather than over
    // the swept corpus. 152 meanders sit in one of the eight named regions,
    // and only 131 of them are recorded `mosaic`: the other 21 are claimed by
    // a family whose rule is tried first and keep the region's name anyway.
    it("names the region of the unit space a meander sits in, whatever family claims it", async () => {
      await expect(
        repository
          .createQueryBuilder("meander")
          .where("meander.subFamily IS NOT NULL")
          .getCount(),
      ).resolves.toBe(152);
      await expect(
        repository
          .createQueryBuilder("meander")
          .where("meander.subFamily IS NOT NULL")
          .andWhere("meander.family != :mosaic", { mosaic: "mosaic" })
          .getCount(),
      ).resolves.toBe(21);
    });

    it("records a meander's Characteristics beside its family, so a structural question is answerable without re-deriving one", async () => {
      const row = await repository.findOneByOrFail({ code: "4488" });

      expect(row).toMatchObject({
        columns: 2,
        components: 2,
        cycles: 0,
        family: "parallel",
        freeEnds: 4,
        hasBranching: false,
        hasCrossing: false,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch: 2,
        provenance: "enumerated",
        rows: 3,
        subFamily: "bars",
      });
      expect(row.svg).toContain("<svg");
    });
  });
});
