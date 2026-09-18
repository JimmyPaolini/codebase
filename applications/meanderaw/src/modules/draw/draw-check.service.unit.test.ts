import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import { Meander } from "../database/entities/Meander.entity";

import { DrawCheckService } from "./draw-check.service";

import type { Repository } from "typeorm";

/**
 * Covers `DrawCheckService.diff`: the pure comparison `check` builds on,
 * which takes two plain row arrays and needs neither a real regeneration nor
 * a real database to prove correct. Every case here is a small,
 * deliberately-constructed fixture rather than a real sweep — per spec #813's
 * Testing Decisions, exercising `check` itself, throwaway database and all,
 * belongs to `draw-check.command.integration.test.ts`, and confirming the
 * real committed corpus reports zero drift belongs to a manual `--check` run
 * rather than an automated test asserting against a row count that will
 * change over time.
 */
describe(DrawCheckService, () => {
  let service: DrawCheckService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCheckService,
        {
          provide: getRepositoryToken(Meander),
          useValue: createMock<Repository<Meander>>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawCheckService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  /** Every field a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const meander = (
    overrides: Partial<Meander> & Pick<Meander, "id">,
  ): Meander =>
    createMock<Meander>({
      code: "code",
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
      svg: "<svg>fixture</svg>\n",
      ...overrides,
    });

  describe("diff", () => {
    it("reports no drift when a regenerated row exactly matches its committed counterpart", () => {
      const regeneratedRow = meander({ code: "a", id: 1 });
      const committedRow = meander({ code: "a", id: 2 });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.new).toStrictEqual([]);
      expect(report.missing).toStrictEqual([]);
      expect(report.changed).toStrictEqual([]);
      expect(report.regeneratedCount).toBe(1);
      expect(report.committedCount).toBe(1);
    });

    it("reports a row the regenerated sweep found that the committed database lacks as new", () => {
      const sharedRow = meander({ code: "a", id: 1 });
      const newRow = meander({ code: "b", id: 2 });

      const report = service.diff([sharedRow, newRow], [sharedRow]);

      expect(report.new).toStrictEqual([{ code: "b", columns: 1, rows: 2 }]);
      expect(report.missing).toStrictEqual([]);
      expect(report.changed).toStrictEqual([]);
    });

    it("reports a row the committed database holds that the regenerated sweep no longer finds as missing", () => {
      const sharedRow = meander({ code: "a", id: 1 });
      const missingRow = meander({ code: "b", id: 2 });

      const report = service.diff([sharedRow], [sharedRow, missingRow]);

      expect(report.missing).toStrictEqual([
        { code: "b", columns: 1, rows: 2 },
      ]);
      expect(report.new).toStrictEqual([]);
      expect(report.changed).toStrictEqual([]);
    });

    it("reports a row present in both sides as changed, naming every column that disagrees", () => {
      const regeneratedRow = meander({
        code: "a",
        family: "snake",
        hasCrossing: true,
        id: 1,
      });
      const committedRow = meander({
        code: "a",
        family: "boxes",
        hasCrossing: false,
        id: 2,
      });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.changed).toStrictEqual([
        {
          code: "a",
          columns: 1,
          differences: ["family", "hasCrossing"],
          rows: 2,
        },
      ]);
      expect(report.new).toStrictEqual([]);
      expect(report.missing).toStrictEqual([]);
    });

    it("keys a row by code, rows, and columns together, not by code alone", () => {
      const threeRowBand = meander({ code: "0000", id: 1, rows: 3 });
      const fiveRowBand = meander({ code: "0000", id: 2, rows: 5 });

      const report = service.diff([threeRowBand], [fiveRowBand]);

      expect(report.new).toStrictEqual([{ code: "0000", columns: 1, rows: 3 }]);
      expect(report.missing).toStrictEqual([
        { code: "0000", columns: 1, rows: 5 },
      ]);
    });
  });
});
