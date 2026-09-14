import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Meander } from "../meander-database/entities/Meander.entity";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderRecord } from "../meander-database/meander-database.types";

/**
 * Drives `DrawIndexService.build` against a real TypeORM connection to an
 * in-memory `better-sqlite3` database seeded with a small, deliberately
 * constructed set of rows, per spec #813's Testing Decisions for this seam.
 *
 * The connection is assembled inline rather than through
 * `MeanderDatabaseModule`, which always opens the one committed database
 * file — this suite needs a fresh, isolated connection instead, the same way
 * `meander-database.service.integration.test.ts` does.
 */
describe(DrawIndexService, () => {
  let dataSource: DataSource;
  let repository: Repository<Meander>;
  let service: DrawIndexService;

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
      providers: [DrawIndexService, MeanderDatabaseService],
    }).compile();

    service = await module.resolve(DrawIndexService);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterAll(async () => {
    await dataSource.destroy();
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
    svg: '<svg width="1" height="1"><path d="M0 0"/></svg>',
    ...overrides,
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("builds a page from the committed rows, grouped by family with a section for the unclassified ones", async () => {
    await repository.save(record({ code: "snake-row", family: "snake" }));
    await repository.save(
      record({
        code: "mosaic-row",
        family: "mosaic",
        subFamily: "dots",
      }),
    );
    await repository.save(record({ code: "unclassified-row", family: null }));

    const page = await service.build();

    expect(page).toContain('<section id="snake">');
    expect(page).toContain('<section id="mosaic">');
    expect(page).toContain('<section id="unclassified">');
    expect(page).toContain("<figcaption>2×1 · snake-row</figcaption>");
    expect(page).toContain("(dots)");
    expect(page.indexOf("<h2>snake</h2>")).toBeLessThan(
      page.indexOf("<h2>mosaic</h2>"),
    );
    expect(page.indexOf("<h2>mosaic</h2>")).toBeLessThan(
      page.indexOf("<h2>unclassified</h2>"),
    );
    expect(page).toContain('<path d="M0 0"/>');
  });
});
