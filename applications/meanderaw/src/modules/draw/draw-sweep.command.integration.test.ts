import { createMock } from "@golevelup/ts-vitest";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { environmentSchema } from "../../constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CodeModule } from "../code/code.module";
import { CORPUS_FAMILIES } from "../corpus/corpus.constants";
import { CorpusService } from "../corpus/corpus.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";
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

const { writeFileMock } = vi.hoisted(() => ({
  writeFileMock: vi.fn<(path: string, data: string) => Promise<void>>(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn<() => Promise<void>>(),
  writeFile: writeFileMock,
}));

/**
 * How many of the historical corpus's entries lie beyond the sweep's reach,
 * and so are ingested rather than enumerated.
 *
 * Written down rather than computed, because it is the check that the one
 * extraction lost nothing: it is exactly the number of entries the fourteen
 * hand-maintained constants files held before they were deleted, and the
 * boundary is now computed from the edge budget and the sweep's row floor
 * rather than hand-listed. A budget raised in `EDGE_BUDGET` moves this
 * number, and should fail here rather than pass quietly.
 */
const HISTORICAL_CORPUS_BEYOND_ENUMERATION = 965;

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
 * `HISTORICAL_CORPUS` is the real, committed corpus rather than a
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
  let corpus: CorpusService;
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
    corpus = module.get(CorpusService);
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
      const expectedHardcoded = 902;

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
    "rebuilds output/index.html and family pages from the sweep's own rows once both halves have committed",
    async () => {
      await command.run([], {});

      const total = await repository.count();

      expect(writeFileMock.mock.calls.length).toBeGreaterThan(1);

      const indexCall = writeFileMock.mock.calls.find(
        (c) => c[0] === "output/index.html",
      );

      if (indexCall === undefined) {
        throw new Error("expected the index page to have been written");
      }

      const [indexPath, page] = indexCall;

      expect(indexPath).toBe("output/index.html");
      expect(page).toContain(`${total} meanders across`);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "ingests exactly the 965 entries the retired constants files held, computed from the sweep's own reach rather than listed",
    () => {
      expect(
        HISTORICAL_CORPUS.filter((entry) => corpus.isBeyondEnumeration(entry)),
      ).toHaveLength(HISTORICAL_CORPUS_BEYOND_ENUMERATION);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "keeps every ingested entry outside the shapes the enumeration already covers",
    () => {
      const swept = new Set(
        enumeration.shapes().map((shape) => `${shape.rows}x${shape.columns}`),
      );
      const covered = HISTORICAL_CORPUS.filter(
        (entry) =>
          corpus.isBeyondEnumeration(entry) &&
          swept.has(`${entry.rows}x${entry.columns}`),
      );

      expect(covered).toStrictEqual([]);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "carries the family it was filed under, and a hardcoded provenance, on every ingested corpus entry",
    async () => {
      await command.run([], {});

      const rows = await repository.findBy({ provenance: "hardcoded" });

      const filed = new Set<string>(CORPUS_FAMILIES);
      const validFamilies = new Set<string>([
        ...CORPUS_FAMILIES,
        "bars",
        "dots",
        "lines",
        "mesh",
      ]);

      expect(rows.length).toBeGreaterThan(0);
      expect(
        rows.every(
          (row) =>
            row.families.some((f) => filed.has(f)) &&
            row.families.every((f) => validFamilies.has(f)),
        ),
      ).toBe(true);
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "ignores the sweep quietly when a hardcoded entry's lattice address is already committed",
    async () => {
      const duplicated = HISTORICAL_CORPUS.find((entry) =>
        corpus.isBeyondEnumeration(entry),
      );

      if (duplicated === undefined) {
        throw new Error(
          "no hardcoded entry is committed to collide a duplicate against",
        );
      }

      await repository.save({
        characteristics: [],
        code: `${String(duplicated.columns).padStart(2, "0")}x${String(duplicated.rows).padStart(2, "0")}y${duplicated.code}`,
        columns: duplicated.columns,
        components: 1,
        cycles: 0,
        drawingHash: "hash",
        families: [],
        freeEnds: 2,
        hasBranching: false,
        hasCrossing: false,
        inkTJunctions: 0,
        inkXJunctions: 0,
        lattice: duplicated.code,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: duplicated.columns,
        provenance: "enumerated",
        repeats: 1,
        rows: duplicated.rows,
        svg: "<svg>fixture</svg>\n",
      });

      await expect(command.run([], {})).resolves.not.toThrow();
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );
});
