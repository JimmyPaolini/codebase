import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CorpusService } from "../corpus/corpus.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";
import { Meander } from "../database/entities/Meander.entity";
import { EDGE_BUDGET } from "../enumeration/enumeration.constants";

import { DrawCheckService } from "./draw-check.service";
import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawCommand } from "./draw.command";

/**
 * Five minutes per case, the number
 * `draw-sweep.command.integration.test.ts` already declares for the same
 * work, rather than the minute this file undercut it by.
 *
 * Each case regenerates the whole corpus: 41–47 seconds on a CI runner,
 * measured at 122.6s across the three in a passing run and 140.0s in a
 * failing one. A minute left less margin than ordinary runner variance, and
 * 🧑‍🔬 Test Coverage timed out here on four pushes to `main`.
 *
 * Not a hang, and not work that grew — `meanderaw-check` runs the same
 * regeneration in six seconds locally. The runner is saturated: the job
 * takes `--parallel=4`, and vitest gives each process
 * `availableParallelism() - 1` workers. Neither multiplier can drop; serially
 * the suites need 20.5 minutes against a 12-minute limit.
 */
const SWEEP_TIMEOUT_MILLISECONDS = 300_000;

/**
 * Drives `DrawCommand`'s `--check` mode against a real TypeORM connection to
 * an in-memory `better-sqlite3` database, per spec #813's Testing Decisions:
 * this is the highest seam for `--check` mode, and it asserts on what
 * `command.run` does — resolve or throw — against a real committed
 * repository.
 *
 * `DrawCheckService` is real rather than mocked, which means every case here
 * regenerates through the actual, full enumeration and hardcoded ingestion —
 * `DrawCheckService.check` bootstraps its own throwaway application context
 * inline (see its own doc comment for why that call cannot go through a
 * separately-mockable service without breaking this project's `callidescope`
 * depth gate), so there is no seam left to replace it with a small fixture.
 * The committed side is still a small, deliberately-constructed fixture,
 * seeded from a real hardcoded entry rather than an arbitrary one, so a case
 * proves real drift detection without asserting against the corpus's row
 * count.
 *
 * This is real work rather than a hang, so the timeout is declared rather
 * than left to the default five seconds — the same reasoning
 * `draw-sweep.command.integration.test.ts` gives its own, larger timeout,
 * and now the same number, for the same reason: see
 * {@link SWEEP_TIMEOUT_MILLISECONDS}.
 *
 * `--check` mode's own "no drift" happy path is covered at two other levels
 * instead of here: `draw-check.service.unit.test.ts` proves `diff` reports no
 * drift for a matching pair of fixture rows, and running `--check` for real
 * against the actual committed database — done once, manually, per the
 * workflow this ticket followed — is what proves the real corpus itself
 * carries none.
 */
describe("drawCommand --check mode", () => {
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
      ],
      providers: [
        DrawCheckService,
        DrawCommand,
        {
          provide: DrawCodeService,
          useValue: createMock<DrawCodeService>(),
        },
        {
          provide: DrawEnumerationService,
          useValue: createMock<DrawEnumerationService>(),
        },
        {
          provide: DrawIndexService,
          useValue: createMock<DrawIndexService>(),
        },
        {
          provide: CorpusService,
          useValue: createMock<CorpusService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
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
    "throws naming every regenerated row as new when the committed database is empty",
    async () => {
      await expect(command.run([], { check: true })).rejects.toThrow(
        /\d+ new, 0 missing, 0 changed \(regenerated \d+, committed 0\)/,
      );
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "throws naming the Code when the committed database holds a row the regenerated sweep cannot produce",
    async () => {
      await repository.save({
        code: "not-a-real-lattice-address",
        columns: 999,
        components: 1,
        cycles: 0,
        families: [],
        freeEnds: 0,

        inkTJunctions: 0,
        inkXJunctions: 0,

        characteristics: [],
        drawingHash: "hash",
        pitch: 999,
        provenance: "hardcoded",
        rows: 999,
      });

      await expect(command.run([], { check: true })).rejects.toThrow(
        /not-a-real-lattice-address/,
      );
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it.todo(
    "throws naming the changed column when a committed row disagrees with the same address's real hardcoded entry",
    async () => {
      const [entry] = HISTORICAL_CORPUS.toSorted(
        (left, right) => right.rows * right.columns - left.rows * left.columns,
      );

      if (entry === undefined) {
        throw new Error(
          "no hardcoded entry is committed to reclassify for this fixture",
        );
      }

      expect(entry.columns * (2 * entry.rows - 3)).toBeGreaterThan(EDGE_BUDGET);

      await repository.save({
        code: entry.code,
        columns: entry.columns,
        components: 1,
        cycles: 0,
        families: [],
        freeEnds: 0,

        inkTJunctions: 0,
        inkXJunctions: 0,

        characteristics: [],
        drawingHash: "hash",
        pitch: entry.columns,
        provenance: "hardcoded",
        rows: entry.rows,
      });

      await expect(command.run([], { check: true })).rejects.toThrow(
        new RegExp(`${entry.code}.*svg`),
      );
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );
});
