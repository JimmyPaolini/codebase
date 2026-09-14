import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderEnumerationService } from "../meander-enumeration/meander-enumeration.service";

import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawRecordService } from "./draw-record.service";

import type { MeanderRecord } from "../meander-database/meander-database.types";

// 🧪 Tests

/**
 * What this service does with the enumeration rather than what the
 * enumeration finds: which shapes it walks, what provenance it stamps, and
 * that a shape's rows reach the database a shape at a time. What the rows
 * actually hold is asserted against a real connection in
 * `draw-enumeration.service.integration.test.ts`.
 */
describe(DrawEnumerationService, () => {
  let drawRecordService: DrawRecordService;
  let meanderDatabaseService: MeanderDatabaseService;
  let meanderEnumerationService: MeanderEnumerationService;
  let service: DrawEnumerationService;

  const record = createMock<MeanderRecord>({ code: "00" });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawEnumerationService,
        {
          provide: DrawRecordService,
          useValue: createMock<DrawRecordService>(),
        },
        {
          provide: MeanderDatabaseService,
          useValue: createMock<MeanderDatabaseService>(),
        },
        {
          provide: MeanderEnumerationService,
          useValue: createMock<MeanderEnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawEnumerationService);
    drawRecordService = await module.resolve(DrawRecordService);
    meanderDatabaseService = await module.resolve(MeanderDatabaseService);
    meanderEnumerationService = await module.resolve(MeanderEnumerationService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meanderEnumerationService.shapes).mockReturnValue([
      { columns: 1, rows: 3 },
      { columns: 2, rows: 3 },
    ]);
    vi.mocked(meanderEnumerationService.enumerate).mockReturnValue([
      { code: "00", columns: 1, rows: 3 },
    ]);
    vi.mocked(drawRecordService.record).mockReturnValue(record);
    vi.mocked(meanderDatabaseService.saveAll).mockResolvedValue(1);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("records", () => {
    it("records a meander a search found as enumerated rather than hardcoded", () => {
      service.records({ columns: 1, rows: 3 });

      expect(drawRecordService.record).toHaveBeenCalledWith(
        "00",
        { columns: 1, rows: 3 },
        "enumerated",
      );
    });

    it("builds one row per meander the shape holds", () => {
      expect(service.records({ columns: 1, rows: 3 })).toStrictEqual([record]);
    });
  });

  describe("persist", () => {
    it("writes one shape's rows at a time rather than the whole sweep at once", async () => {
      await service.persist([
        { columns: 1, rows: 3 },
        { columns: 2, rows: 3 },
      ]);

      expect(meanderDatabaseService.saveAll).toHaveBeenCalledTimes(2);
    });

    it("answers with how many rows were written", async () => {
      await expect(service.persist([{ columns: 1, rows: 3 }])).resolves.toBe(1);
    });
  });

  describe("sweep", () => {
    it("walks every shape the budget admits, rather than a range of its own", async () => {
      await service.sweep();

      expect(
        vi.mocked(meanderEnumerationService.enumerate).mock.calls,
      ).toStrictEqual([[{ columns: 1, rows: 3 }], [{ columns: 2, rows: 3 }]]);
    });
  });
});
