import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderConnectivityService } from "../meander-characteristics/meander-connectivity.service";
import { MeanderClassificationService } from "../meander-classification/meander-classification.service";
import { Meander } from "../meander-database/entities/Meander.entity";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderDecodingModule } from "../meander-decoding/meander-decoding.module";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawCombinationsService } from "./draw-combinations.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawNegativePermutationsService } from "./draw-negative-permutations.service";
import { DrawParametersService } from "./draw-parameters.service";
import { DrawPermutationsService } from "./draw-permutations.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawRenderingService } from "./draw-rendering.service";
import { DrawCommand } from "./draw.command";

/**
 * Drives `DrawCommand`'s `--code` mode against a real TypeORM connection to
 * an in-memory `better-sqlite3` database, per spec #813's Testing
 * Decisions: this is the highest seam for the CLI's new single-drawing
 * path, and it asserts on persisted rows rather than on a mocked service
 * graph.
 *
 * The connection is assembled inline rather than through
 * `MeanderDatabaseModule`, which always opens the one committed database
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
        MeanderDecodingModule,
        MeanderRenderingModule,
      ],
      providers: [
        DrawCommand,
        DrawCodeService,
        DrawRecordService,
        GridGeometryService,
        MeanderCharacteristicsService,
        MeanderClassificationService,
        MeanderConnectivityService,
        MeanderDatabaseService,
        MeanderLatticeService,
        MeanderTopologyService,
        MosaicNamingService,
        MosaicTileService,
        SvgRenderingService,
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: DrawCombinationsService,
          useValue: createMock<DrawCombinationsService>(),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>(),
        },
        {
          provide: DrawParametersService,
          useValue: createMock<DrawParametersService>(),
        },
        {
          provide: DrawNegativePermutationsService,
          useValue: createMock<DrawNegativePermutationsService>(),
        },
        {
          provide: DrawPermutationsService,
          useValue: createMock<DrawPermutationsService>(),
        },
        {
          provide: DrawRenderingService,
          useValue: createMock<DrawRenderingService>(),
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
      outputDirectory: "output",
      repeatCount: 6,
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

  it("populates a row's Characteristics from its decoded grid, for a code with a three-armed ink junction", async () => {
    await command.run([], {
      code: "e",
      columns: 1,
      outputDirectory: "output",
      repeatCount: 6,
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
        outputDirectory: "output",
        repeatCount: 6,
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
        outputDirectory: "output",
        repeatCount: 6,
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
