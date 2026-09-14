import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { DrawCodeService } from "../draw/draw-code.service";
import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { DrawEnumerationService } from "../draw/draw-enumeration.service";
import { DrawIndexService } from "../draw/draw-index.service";
import { DrawNegativePermutationsService } from "../draw/draw-negative-permutations.service";
import { DrawParametersService } from "../draw/draw-parameters.service";
import { DrawPermutationsService } from "../draw/draw-permutations.service";
import { DrawRenderingService } from "../draw/draw-rendering.service";
import { DrawCommand } from "../draw/draw.command";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderCharacteristicsModule } from "../meander-characteristics/meander-characteristics.module";
import { Meander } from "../meander-database/entities/Meander.entity";
import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderDecodingModule } from "../meander-decoding/meander-decoding.module";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { HARDCODED_MEANDERS_BY_FAMILY } from "./hardcoded-meanders.constants";
import { HardcodedMeandersService } from "./hardcoded-meanders.service";

/**
 * Drives `DrawCommand`'s sweep mode's hardcoded-ingestion step against a
 * real TypeORM connection, with the rest of the sweep stood in for so the
 * assertions below are about `HardcodedMeandersService` reaching the
 * database, not about the file tree `writeDocuments` still writes — that
 * half stays covered by `draw.command.unit.test.ts`'s own full-sweep
 * assertions, which mock `node:fs/promises` instead of the database. It
 * lives beside `HardcodedMeandersService` rather than beside `DrawCommand`
 * because that is what it drives real, and `draw.command.integration.test.ts`
 * already carries one top-level `describe` for the `--code` path —
 * `vitest/require-top-level-describe` caps a file at one.
 *
 * `HARDCODED_MEANDERS_BY_FAMILY` is the real, committed corpus rather than a
 * fixture: `DrawCommand.run` reads it directly rather than through an
 * overridable dependency, so proving the sweep really ingests it needs the
 * real constants. Ingesting every entry through the real decoder, renderer,
 * and Characteristic computation is real work, not a hang — declared rather
 * than left to the default five seconds.
 */
describe("drawCommand sweep mode, hardcoded ingestion", () => {
  const SWEEP_INGESTION_TIMEOUT_MILLISECONDS = 30_000;

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
        MeanderCharacteristicsModule,
        MeanderDecodingModule,
        MeanderRenderingModule,
      ],
      providers: [
        DrawCommand,
        GridGeometryService,
        HardcodedMeandersService,
        MeanderDatabaseService,
        SvgRenderingService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>(),
        },
        {
          provide: DrawCombinationsService,
          useValue: createMock<DrawCombinationsService>({
            enumerate: () => [],
          }),
        },
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>({
            sweep: vi.fn<() => Promise<number>>().mockResolvedValue(0),
          }),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>({ render: () => "" }),
        },
        {
          provide: DrawParametersService,
          useValue: createMock<DrawParametersService>(),
        },
        {
          provide: DrawNegativePermutationsService,
          useValue: createMock<DrawNegativePermutationsService>({
            rowsSweep: () => [],
          }),
        },
        {
          provide: DrawPermutationsService,
          useValue: createMock<DrawPermutationsService>({
            rowsSweep: () => [],
          }),
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

  it(
    "ingests the whole historical corpus's hardcoded constants, with hardcoded provenance and a trusted family",
    async () => {
      const outputDirectory = await mkdtemp(
        path.join(tmpdir(), "meanderaw-hardcoded-sweep-"),
      );
      const expectedCount = Object.values(HARDCODED_MEANDERS_BY_FAMILY).reduce(
        (total, entries) => total + entries.length,
        0,
      );

      await command.run([], { outputDirectory, repeatCount: 6 });

      const rows = await repository.find();

      expect(rows).toHaveLength(expectedCount);
      expect(rows.every((row) => row.provenance === "hardcoded")).toBe(true);
      expect(
        rows.every((row) =>
          Object.keys(HARDCODED_MEANDERS_BY_FAMILY).includes(row.family ?? ""),
        ),
      ).toBe(true);
    },
    SWEEP_INGESTION_TIMEOUT_MILLISECONDS,
  );

  it(
    "fails the sweep loudly when a hardcoded entry's Code collides with one already committed",
    async () => {
      const outputDirectory = await mkdtemp(
        path.join(tmpdir(), "meanderaw-hardcoded-sweep-"),
      );
      const [firstFamily, entries] =
        Object.entries(HARDCODED_MEANDERS_BY_FAMILY).find(
          ([, familyEntries]) => familyEntries.length > 0,
        ) ?? [];

      if (firstFamily === undefined || entries === undefined) {
        throw new Error(
          "no hardcoded entry is committed to collide a duplicate against",
        );
      }

      const duplicated = entries[0];

      await expect(
        (async (): Promise<void> => {
          await repository.save({
            code: duplicated?.code ?? "",
            columns: duplicated?.columns ?? 1,
            components: 1,
            cycles: 0,
            freeEnds: 2,
            hasBranching: false,
            hasCrossing: false,
            inkTJunctions: 0,
            inkXJunctions: 0,
            negativeTJunctions: 0,
            negativeXJunctions: 0,
            pitch: duplicated?.columns ?? 1,
            provenance: "enumerated",
            rows: duplicated?.rows ?? 2,
            svg: "<svg>fixture</svg>\n",
          });

          await command.run([], { outputDirectory, repeatCount: 6 });
        })(),
      ).rejects.toThrow(/collided with a Code already committed/);
    },
    SWEEP_INGESTION_TIMEOUT_MILLISECONDS,
  );
});
