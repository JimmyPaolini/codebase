import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { GeometryService } from "../geometry/geometry.service";

import { DrawIndexService } from "./draw-index.service";

import type { MeanderRecord } from "../database/database.types";

/**
 * Drives `DrawIndexService.build` against a real TypeORM connection to an
 * in-memory `better-sqlite3` database seeded with a small, deliberately
 * constructed set of rows, per spec #813's Testing Decisions for this seam.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always opens the one committed database
 * file — this suite needs a fresh, isolated connection instead, the same way
 * `database.service.integration.test.ts` does.
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
      providers: [DrawIndexService, GeometryService, DatabaseService],
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
    families: [],
    freeEnds: 0,
    horizontalDashCount: 0,
    horizontalPointCount: 0,
    inkPointCount: 0,
    lCount: 0,
    longestHorizontalRun: 0,
    longestVerticalRun: 0,
    oCount: 0,
    plusCount: 0,
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

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("builds a page from the committed rows, grouped by family with a section for the unclassified ones", async () => {
    await repository.save(record({ code: "snake-row", families: ["snake"] }));
    await repository.save(
      record({
        characteristics: ["dots"],
        code: "sample-row",
        families: ["mosaic"],
      }),
    );
    await repository.save(record({ code: "unclassified-row", families: [] }));

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
