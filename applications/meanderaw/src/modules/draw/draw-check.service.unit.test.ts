import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CorpusService } from "../corpus/corpus.service";
import { Meander } from "../database/entities/Meander.entity";

import { MeanderDriftDetectedError } from "./draw-check.constants";
import { DrawCheckService } from "./draw-check.service";
import { DrawEnumerationService } from "./draw-enumeration.service";

import type { INestApplicationContext } from "@nestjs/common";
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
  let repository: Repository<Meander>;
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
    repository = module.get(getRepositoryToken(Meander));
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  /** Every field a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const meander = (
    overrides: Partial<Meander> & Pick<Meander, "id">,
  ): Meander =>
    createMock<Meander>({
      characteristics: [],
      code: "code",
      columns: 1,
      components: 1,
      cycles: 0,
      drawingHash: "hash",
      families: [],
      freeEnds: 0,
      inkTJunctions: 0,
      inkXJunctions: 0,
      lattice: "0",
      pitch: 1,
      provenance: "hardcoded",
      repeats: 1,
      rows: 2,
      ...overrides,
    });

  describe(MeanderDriftDetectedError, () => {
    it("builds a descriptive message with new, missing, and changed entries", () => {
      const error = new MeanderDriftDetectedError({
        changed: [
          { code: "c", columns: 1, differences: ["families"], rows: 2 },
        ],
        committedCount: 2,
        missing: [{ code: "b", columns: 1, rows: 2 }],
        new: [{ code: "a", columns: 1, rows: 2 }],
        regeneratedCount: 2,
      });

      expect(error.message).toContain("1 new, 1 missing, 1 changed");
      expect(error.message).toContain("new a (2x1)");
      expect(error.message).toContain("missing b (2x1)");
      expect(error.message).toContain("changed c (2x1) [families]");
    });
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
        families: ["snake"],

        id: 1,
      });
      const committedRow = meander({
        code: "a",
        families: ["boxes"],

        id: 2,
      });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.changed).toStrictEqual([
        {
          code: "a",
          columns: 1,
          differences: ["families"],
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

    it("identifies array value differences in differingColumns", () => {
      const regeneratedRow = meander({
        characteristics: ["hasBranching"],
        code: "a",
        id: 1,
      });
      const committedRow = meander({
        characteristics: ["hasDots"],
        code: "a",
        id: 2,
      });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.changed).toStrictEqual([
        {
          code: "a",
          columns: 1,
          differences: ["characteristics"],
          rows: 2,
        },
      ]);
    });

    it("identifies error throws when drift is detected", async () => {
      const mockedRegenerated = [meander({ code: "a", id: 1 })];
      const mockedCommitted: Meander[] = [];

      vi.mocked(repository.find).mockResolvedValue(mockedCommitted);

      const mockContext = createMock<INestApplicationContext>({
        close: vi.fn<() => Promise<void>>().mockResolvedValue(),
      });
      mockContext.get.mockImplementation((token: unknown) => {
        if (token === DrawEnumerationService) {
          return {
            sweep: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
          };
        }
        if (token === CorpusService) {
          return {
            ingest: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
          };
        }
        return {
          find: vi
            .fn<() => Promise<Meander[]>>()
            .mockResolvedValue(mockedRegenerated),
        };
      });

      const core = await import("@nestjs/core");
      vi.spyOn(core.NestFactory, "createApplicationContext").mockResolvedValue(
        mockContext,
      );

      await expect(service.check()).rejects.toThrow(MeanderDriftDetectedError);
    });

    it("identifies array length differences in differingColumns", () => {
      const regeneratedRow = meander({
        characteristics: ["hasBranching"],
        code: "a",
        id: 1,
      });
      const committedRow = meander({
        characteristics: ["hasBranching", "hasDots"],
        code: "a",
        id: 2,
      });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.changed).toStrictEqual([
        {
          code: "a",
          columns: 1,
          differences: ["characteristics"],
          rows: 2,
        },
      ]);
    });

    it("identifies object drift with matching arrays (no difference)", () => {
      const regeneratedRow = meander({
        characteristics: ["hasBranching"],
        code: "a",
        id: 1,
      });
      const committedRow = meander({
        characteristics: ["hasBranching"],
        code: "a",
        id: 2,
      });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.changed).toStrictEqual([]);
    });

    it("evaluates a primitive difference", () => {
      const regeneratedRow = meander({
        code: "a",
        components: 2,
        id: 1,
      });
      const committedRow = meander({
        code: "a",
        components: 1,
        id: 2,
      });

      const report = service.diff([regeneratedRow], [committedRow]);

      expect(report.changed).toStrictEqual([
        {
          code: "a",
          columns: 1,
          differences: ["components"],
          rows: 2,
        },
      ]);
    });

    it("returns report when check() detects no drift", async () => {
      const identical = [meander({ code: "a", id: 1 })];

      vi.mocked(repository.find).mockResolvedValue(identical);

      const mockContext = createMock<INestApplicationContext>({
        close: vi.fn<() => Promise<void>>().mockResolvedValue(),
      });
      mockContext.get.mockImplementation((token: unknown) => {
        if (token === DrawEnumerationService) {
          return {
            sweep: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
          };
        }
        if (token === CorpusService) {
          return {
            ingest: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
          };
        }
        return {
          find: vi.fn<() => Promise<Meander[]>>().mockResolvedValue(identical),
        };
      });

      const core = await import("@nestjs/core");
      vi.spyOn(core.NestFactory, "createApplicationContext").mockResolvedValue(
        mockContext,
      );

      const report = await service.check();

      expect(report.new).toStrictEqual([]);
      expect(report.missing).toStrictEqual([]);
      expect(report.changed).toStrictEqual([]);
    });
  });
});
