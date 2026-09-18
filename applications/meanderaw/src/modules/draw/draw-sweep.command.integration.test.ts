import { createMock } from "@golevelup/ts-vitest";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { environmentSchema } from "../../constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { CORPUS_BY_FAMILY } from "../corpus/corpus.constants";
import { CorpusService } from "../corpus/corpus.service";
import { DatabaseService } from "../database/database.service";
import { Meander } from "../database/entities/Meander.entity";
import { DrawingModule } from "../drawing/drawing.module";
import { EnumerationModule } from "../enumeration/enumeration.module";
import { EnumerationService } from "../enumeration/enumeration.service";
import { GeometryModule } from "../geometry/geometry.module";

import { DrawCheckService } from "./draw-check.service";
import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawRecordService } from "./draw-record.service";
import { DrawCommand } from "./draw.command";
import { DEFAULT_INDEX_PATH } from "./draw.constants";

const { writeFileMock } = vi.hoisted(() => ({
  writeFileMock: vi.fn<(path: string, data: string) => Promise<void>>(),
}));

vi.mock("node:fs/promises", () => ({
  writeFile: writeFileMock,
}));

/**
 * Drives the whole of `DrawCommand`'s sweep — the generalized enumeration,
 * the historical corpus's hardcoded ingestion, and the index page rebuilt
 * from both — against a real TypeORM connection to an in-memory
 * `better-sqlite3` database, and asserts on the rows it persists. It is spec
 * #813's highest seam for this command, and the direct successor to the
 * file-tree assertions `draw.command.unit.test.ts` made by mocking
 * `node:fs/promises` while the per-family procedural pipeline still wrote
 * one.
 *
 * **This is what proves the two provenances do not collide.** Both halves
 * write through the same unique index over a meander's lattice address, and
 * the enumerated half runs first, so an entry the hardcoded corpus still
 * claims inside the enumerated space fails the second insert rather than
 * quietly overwriting the first. Nothing short of running both halves for
 * real catches that: each half passes its own suite alone.
 *
 * `CORPUS_BY_FAMILY` is the real, committed corpus rather than a
 * fixture — `DrawCommand.run` reads it directly rather than through an
 * overridable dependency — and the enumeration is the real budgeted walk, so
 * this drives tens of thousands of rows through the decoder, renderer, and
 * Characteristic computation, then through `DrawIndexService` itself. That
 * is real work rather than a hang, and the timeout is declared rather than
 * left to the default five seconds. `node:fs/promises` stays mocked even
 * here: this suite's own in-memory database is disposable, but the
 * committed `output/index.html` a real write would land on is not.
 */
describe("drawCommand sweep mode", () => {
  const SWEEP_TIMEOUT_MILLISECONDS = 300_000;

  let command: DrawCommand;
  let dataSource: DataSource;
  let enumeration: EnumerationService;
  let repository: Repository<Meander>;

  beforeEach(async () => {
    writeFileMock.mockClear();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (config: Record<string, unknown>) =>
            environmentSchema.parse(config),
        }),
        TypeOrmModule.forRoot({
          database: ":memory:",
          entities: [Meander],
          logging: false,
          synchronize: true,
          type: "better-sqlite3",
        }),
        TypeOrmModule.forFeature([Meander]),
        GeometryModule,
        CharacteristicsModule,
        ClassificationModule,
        CodeModule,
        EnumerationModule,
        DrawingModule,
      ],
      providers: [
        DrawCommand,
        DrawEnumerationService,
        DrawIndexService,
        DrawRecordService,
        CorpusService,
        DatabaseService,
        {
          provide: DrawCheckService,
          useValue: createMock<DrawCheckService>(),
        },
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(DrawCommand);
    dataSource = module.get(DataSource);
    enumeration = module.get(EnumerationService);
    repository = module.get(getRepositoryToken(Meander));
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it(
    "persists both halves of the corpus, with neither provenance colliding with the other",
    async () => {
      const expectedEnumerated = enumeration
        .shapes()
        .reduce(
          (total, shape) => total + enumeration.enumerate(shape).length,
          0,
        );
      const expectedHardcoded = Object.values(CORPUS_BY_FAMILY).reduce(
        (total, entries) => total + entries.length,
        0,
      );

      await command.run([], {});

      await expect(
        repository.countBy({ provenance: "enumerated" }),
      ).resolves.toBe(expectedEnumerated);
      await expect(
        repository.countBy({ provenance: "hardcoded" }),
      ).resolves.toBe(expectedHardcoded);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "rebuilds output/index.html from the sweep's own rows once both halves have committed",
    async () => {
      await command.run([], {});

      const total = await repository.count();

      expect(writeFileMock).toHaveBeenCalledTimes(1);

      const call = writeFileMock.mock.calls[0];

      if (call === undefined) {
        throw new Error("expected the index page to have been written");
      }

      const [indexPath, page] = call;

      expect(indexPath).toBe(DEFAULT_INDEX_PATH);
      expect(page).toContain(`${total} meanders across`);
      expect(page).toContain("<svg");
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "keeps every hardcoded entry outside the shapes the enumeration already covers",
    () => {
      const swept = new Set(
        enumeration.shapes().map((shape) => `${shape.rows}x${shape.columns}`),
      );
      const covered = Object.entries(CORPUS_BY_FAMILY).flatMap(
        ([family, entries]) =>
          entries
            .map((entry) => `${family} ${entry.rows}x${entry.columns}`)
            .filter((label) => swept.has(label.split(" ")[1] ?? "")),
      );

      expect(covered).toStrictEqual([]);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "carries a trusted family and a hardcoded provenance on every ingested corpus entry",
    async () => {
      await command.run([], {});

      const rows = await repository.findBy({ provenance: "hardcoded" });

      expect(rows.length).toBeGreaterThan(0);
      expect(
        rows.every((row) =>
          Object.keys(CORPUS_BY_FAMILY).includes(row.family ?? ""),
        ),
      ).toBe(true);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "fails the sweep loudly when a hardcoded entry's lattice address is already committed",
    async () => {
      const [duplicated] = Object.values(CORPUS_BY_FAMILY).find(
        (entries) => entries.length > 0,
      ) ?? [undefined];

      if (duplicated === undefined) {
        throw new Error(
          "no hardcoded entry is committed to collide a duplicate against",
        );
      }

      await repository.save({
        code: duplicated.code,
        columns: duplicated.columns,
        components: 1,
        cycles: 0,
        freeEnds: 2,
        hasBranching: false,
        hasCrossing: false,
        inkTJunctions: 0,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: duplicated.columns,
        provenance: "enumerated",
        rows: duplicated.rows,
        svg: "<svg>fixture</svg>\n",
      });

      await expect(command.run([], {})).rejects.toThrow(
        /collided with a Code already committed/,
      );
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );
});
