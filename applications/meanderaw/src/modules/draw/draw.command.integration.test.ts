import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ConnectivityService } from "../characteristics/connectivity.service";
import { ClassificationService } from "../classification/classification.service";
import { SubFamilyService } from "../classification/sub-family.service";
import { CodeModule } from "../code/code.module";
import { CorpusService } from "../corpus/corpus.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingModule } from "../drawing/drawing.module";
import { LatticeService } from "../drawing/lattice.service";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { SvgService } from "../svg/svg.service";
import { TileService } from "../tile/tile.service";

import { DrawCheckService } from "./draw-check.service";
import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawCommand } from "./draw.command";

/**
 * Drives `DrawCommand`'s `--code` mode against a real TypeORM connection to
 * an in-memory `better-sqlite3` database, per spec #813's Testing
 * Decisions: this is the highest seam for the CLI's new single-drawing
 * path, and it asserts on persisted rows rather than on a mocked service
 * graph.
 *
 * The connection is assembled inline rather than through
 * `DatabaseModule`, which always opens the one committed database
 * file — this suite needs a fresh, isolated connection per test instead.
 */
describe("drawCommand --code mode", () => {
  let command: DrawCommand;
  let dataSource: DataSource;
  let repository: Repository<Meander>;

  beforeEach(async () => {
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
        CodeModule,
        DrawingModule,
      ],
      providers: [
        DrawCommand,
        DrawCodeService,
        DrawRecordService,
        {
          provide: DrawCheckService,
          useValue: createMock<DrawCheckService>(),
        },
        GeometryService,
        CharacteristicsService,
        ClassificationService,
        ConnectivityService,
        DatabaseService,
        LatticeService,
        GraphService,
        SubFamilyService,
        TileService,
        SvgService,
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CorpusService,
          useValue: createMock<CorpusService>({
            ingest: vi.fn<() => Promise<Meander[]>>().mockResolvedValue([]),
          }),
        },
      ],
    }).compile();

    command = await module.resolve(DrawCommand);
    dataSource = module.get(DataSource);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it("writes exactly one row, decoded and rendered by the generic pipeline", async () => {
    await command.run([], {
      code: "3c9a",
      columns: 2,
      rows: 3,
    });

    const rows = await repository.find();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: "3c9a",
      columns: 2,
      hasBranching: false,
      hasCrossing: false,
      inkTJunctions: 0,
      inkXJunctions: 0,
      negativeTJunctions: 0,
      negativeXJunctions: 0,
      pitch: 2,
      provenance: "hardcoded",
      rows: 3,
    });
    expect(rows[0]?.svg).toContain("<svg");
  });

  it("populates a row's Characteristics from its Code, for a code with a three-armed ink junction", async () => {
    await command.run([], {
      code: "e",
      columns: 1,
      rows: 2,
    });

    const rows = await repository.find();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: "e",
      hasBranching: true,
      hasCrossing: false,
      inkTJunctions: 1,
      inkXJunctions: 0,
      negativeTJunctions: 0,
      negativeXJunctions: 0,
    });
  });

  it("refuses a --code drawing missing --columns", async () => {
    await expect(
      command.run([], {
        code: "0",
        rows: 2,
      }),
    ).rejects.toThrow(/needs both --rows and --columns/);

    await expect(repository.find()).resolves.toHaveLength(0);
  });

  it("refuses a --code drawing missing --rows", async () => {
    await expect(
      command.run([], {
        code: "0",
        columns: 1,
      }),
    ).rejects.toThrow(/needs both --rows and --columns/);

    await expect(repository.find()).resolves.toHaveLength(0);
  });

  it("passes --code through parseCode unchanged", () => {
    expect(command.parseCode("3c9a")).toBe("3c9a");
  });

  it("parses --columns as an integer", () => {
    expect(command.parseColumns("2")).toBe(2);
  });
});
