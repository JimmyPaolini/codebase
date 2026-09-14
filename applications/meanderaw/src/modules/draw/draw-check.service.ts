import { Injectable } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { HARDCODED_MEANDERS_BY_FAMILY } from "../hardcoded-meanders/hardcoded-meanders.constants";
import { HardcodedMeandersService } from "../hardcoded-meanders/hardcoded-meanders.service";
import { Meander } from "../meander-database/entities/Meander.entity";

import { DrawCheckSweepModule } from "./draw-check-sweep.module";
import {
  MEANDER_DRIFT_COMPARISON_COLUMNS,
  MeanderDriftDetectedError,
} from "./draw-check.constants";
import { DrawEnumerationService } from "./draw-enumeration.service";

import type {
  ChangedMeanderDrift,
  MeanderDriftReport,
  MeanderKeySummary,
} from "./draw-check.types";

/**
 * Drives `--check` mode: regenerates the whole corpus into a throwaway
 * database and diffs it against the committed one, throwing when they
 * disagree.
 *
 * The committed side is read through the same `@InjectRepository(Meander)`
 * token `MeanderDatabaseService` itself resolves — `DrawModule` already
 * imports `MeanderDatabaseModule`, so this needs no wiring of its own to
 * reach the one real file.
 *
 * `check` bootstraps its own throwaway application context and calls
 * `DrawEnumerationService.sweep` inline, rather than through a separate
 * regeneration service one layer deeper. This project's own `callidescope`
 * gate already sits at the repository's deepest legitimate stack — the one
 * `DrawEnumerationService.sweep` itself roots — and every layer `--check`
 * first added on top of that root was pure forwarding: a service whose whole
 * job was calling the next one down and describing itself the same way its
 * caller already had. `callidescope-triage`'s own guidance is to collapse
 * exactly that shape rather than raise the limit, so nothing but this method
 * calls `sweep`. What was briefly a separate `DrawCheckRegenerationService`
 * is now this method's first half.
 */
@Injectable()
export class DrawCheckService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Meander)
    private readonly meanderRepository: Repository<Meander>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Every column named by `MEANDER_DRIFT_COMPARISON_COLUMNS` on which two same-addressed rows disagree. */
  private differingColumns(
    regeneratedRow: Meander,
    committedRow: Meander,
  ): string[] {
    return MEANDER_DRIFT_COMPARISON_COLUMNS.filter(
      (column) => regeneratedRow[column] !== committedRow[column],
    );
  }

  /** Every committed row the regenerated sweep no longer finds at its address. */
  private findMissing(
    regeneratedByKey: ReadonlyMap<string, Meander>,
    committedByKey: ReadonlyMap<string, Meander>,
  ): MeanderKeySummary[] {
    const missing: MeanderKeySummary[] = [];

    for (const [key, committedRow] of committedByKey) {
      if (!regeneratedByKey.has(key)) {
        missing.push(this.summarize(committedRow));
      }
    }

    return missing;
  }

  /** Every regenerated row that is new against the committed side, and every shared address whose other columns disagree. */
  private findNewAndChanged(
    regeneratedByKey: ReadonlyMap<string, Meander>,
    committedByKey: ReadonlyMap<string, Meander>,
  ): { changed: ChangedMeanderDrift[]; newRows: MeanderKeySummary[] } {
    const changed: ChangedMeanderDrift[] = [];
    const newRows: MeanderKeySummary[] = [];

    for (const [key, regeneratedRow] of regeneratedByKey) {
      const committedRow = committedByKey.get(key);

      if (committedRow === undefined) {
        newRows.push(this.summarize(regeneratedRow));
        continue;
      }

      const differences = this.differingColumns(regeneratedRow, committedRow);

      if (differences.length > 0) {
        changed.push({ ...this.summarize(regeneratedRow), differences });
      }
    }

    return { changed, newRows };
  }

  /** Whether a report names any drift at all, in any of its three categories. */
  private hasDrift(report: MeanderDriftReport): boolean {
    return (
      report.new.length > 0 ||
      report.missing.length > 0 ||
      report.changed.length > 0
    );
  }

  /** Every row of a set, keyed by its own lattice address. */
  private index(rows: readonly Meander[]): Map<string, Meander> {
    return new Map(rows.map((row) => [this.key(row), row]));
  }

  /** One row's lattice address, the identity `diff` keys every comparison by. */
  private key(row: Pick<Meander, "code" | "columns" | "rows">): string {
    return `${row.rows}|${row.columns}|${row.code}`;
  }

  /** A row reduced to the lattice address a drift report names it by. */
  private summarize(row: Meander): MeanderKeySummary {
    return { code: row.code, columns: row.columns, rows: row.rows };
  }

  // 🌎 Public Methods

  /**
   * Regenerates the whole corpus into a throwaway database, diffs it against
   * the committed one, and throws {@link MeanderDriftDetectedError} when they
   * disagree — resolving with the report either way, so a passing check can
   * still log what it verified.
   *
   * The throwaway half boots `DrawCheckSweepModule` as its own standalone
   * application context rather than reaching for services already injected
   * into this one: those are wired to whichever committed connection
   * `MeanderDatabaseModule` opened for the running application, and
   * `--check` mode's whole point is regenerating into a connection that is
   * never that one. The context is closed in a `finally` so a regeneration
   * that fails midway — a duplicate hardcoded Code colliding with an
   * enumerated row, the same failure a real sweep can hit — still releases
   * the connection it opened.
   */
  async check(): Promise<MeanderDriftReport> {
    const context = await NestFactory.createApplicationContext(
      DrawCheckSweepModule,
      { logger: false },
    );
    let regenerated: readonly Meander[];

    try {
      const drawEnumerationService = context.get(DrawEnumerationService);
      const hardcodedMeandersService = context.get(HardcodedMeandersService);
      const throwawayMeanderRepository = context.get<Repository<Meander>>(
        getRepositoryToken(Meander),
      );

      await drawEnumerationService.sweep();
      await hardcodedMeandersService.ingest(HARDCODED_MEANDERS_BY_FAMILY);

      regenerated = await throwawayMeanderRepository.find();
    } finally {
      await context.close();
    }

    const committed = await this.meanderRepository.find();
    const report = this.diff(regenerated, committed);

    if (this.hasDrift(report)) {
      throw new MeanderDriftDetectedError(report);
    }

    return report;
  }

  /**
   * Compares a regenerated row set against the committed one, keyed by
   * lattice address (`code`, `rows`, `columns` together — see `Meander`'s own
   * doc comment for why the Code alone is not a row's whole identity), and
   * classifies every disagreement as new, missing, or changed.
   *
   * Pure and synchronous: neither side needs to be read from a real
   * database, which is what lets this be tested against small,
   * deliberately-constructed fixtures instead of a real sweep.
   */
  diff(
    regenerated: readonly Meander[],
    committed: readonly Meander[],
  ): MeanderDriftReport {
    const regeneratedByKey = this.index(regenerated);
    const committedByKey = this.index(committed);

    const { changed, newRows } = this.findNewAndChanged(
      regeneratedByKey,
      committedByKey,
    );
    const missing = this.findMissing(regeneratedByKey, committedByKey);

    return {
      changed,
      committedCount: committed.length,
      missing,
      new: newRows,
      regeneratedCount: regenerated.length,
    };
  }
}
