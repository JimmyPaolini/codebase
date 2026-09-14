import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { HARDCODED_MEANDERS_BY_FAMILY } from "../hardcoded-meanders/hardcoded-meanders.constants";
import { HardcodedMeandersService } from "../hardcoded-meanders/hardcoded-meanders.service";
import { Meander } from "../meander-database/entities/Meander.entity";

import { DrawCheckService } from "./draw-check.service";
import { DrawCodeService } from "./draw-code.service";
import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawCommand } from "./draw.command";

const SWEEP_TIMEOUT_MILLISECONDS = 60_000;

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
 * `draw-sweep.command.integration.test.ts` gives its own, larger timeout.
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
          provide: HardcodedMeandersService,
          useValue: createMock<HardcodedMeandersService>(),
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
        family: null,
        freeEnds: 0,
        hasBranching: false,
        hasCrossing: false,
        inkTJunctions: 0,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 999,
        provenance: "hardcoded",
        rows: 999,
        subFamily: null,
        svg: "<svg>fixture</svg>\n",
      });

      await expect(command.run([], { check: true })).rejects.toThrow(
        /not-a-real-lattice-address/,
      );
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );

  it(
    "throws naming the changed column when a committed row disagrees with the same address's real hardcoded entry",
    async () => {
      const [, entries] =
        Object.entries(HARDCODED_MEANDERS_BY_FAMILY).find(
          ([, familyEntries]) => familyEntries.length > 0,
        ) ?? [];
      const entry = entries?.[0];

      if (entry === undefined) {
        throw new Error(
          "no hardcoded entry is committed to reclassify for this fixture",
        );
      }

      await repository.save({
        code: entry.code,
        columns: entry.columns,
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
        pitch: entry.columns,
        provenance: "hardcoded",
        rows: entry.rows,
        subFamily: null,
        svg: "<svg>deliberately wrong</svg>\n",
      });

      await expect(command.run([], { check: true })).rejects.toThrow(
        new RegExp(`${entry.code}.*svg`),
      );
    },
    SWEEP_TIMEOUT_MILLISECONDS,
  );
});
