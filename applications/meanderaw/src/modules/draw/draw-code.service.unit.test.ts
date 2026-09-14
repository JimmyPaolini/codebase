import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MeanderDatabaseService } from "../meander-database/meander-database.service";

import { DrawCodeService } from "./draw-code.service";
import { DrawRecordService } from "./draw-record.service";

import type { Meander } from "../meander-database/entities/Meander.entity";
import type { MeanderRecord } from "../meander-database/meander-database.types";

// 🧪 Tests

/**
 * What is left of this service once `DrawRecordService` owns building a row:
 * that a `--code` drawing is recorded as authored by a person rather than
 * found by a search, and that what the builder produced is what reaches the
 * database. What a row actually holds is asserted in
 * `draw-record.service.unit.test.ts`, against the real pipeline rather than
 * against mocks of it.
 */
describe(DrawCodeService, () => {
  let drawRecordService: DrawRecordService;
  let meanderDatabaseService: MeanderDatabaseService;
  let service: DrawCodeService;

  const record = createMock<MeanderRecord>({ code: "2" });
  const savedMeander = createMock<Meander>({ id: 1 });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCodeService,
        {
          provide: DrawRecordService,
          useValue: createMock<DrawRecordService>(),
        },
        {
          provide: MeanderDatabaseService,
          useValue: createMock<MeanderDatabaseService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawCodeService);
    drawRecordService = await module.resolve(DrawRecordService);
    meanderDatabaseService = await module.resolve(MeanderDatabaseService);

    vi.mocked(drawRecordService.record).mockReturnValue(record);
    vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("draw", () => {
    it("records a code named at the command line as hardcoded, since a person authored it rather than a search finding it", async () => {
      await service.draw({ code: "2", columns: 3, rows: 4 });

      expect(drawRecordService.record).toHaveBeenCalledWith(
        "2",
        { columns: 3, rows: 4 },
        "hardcoded",
      );
    });

    it("persists exactly the row the builder produced", async () => {
      await service.draw({ code: "2", columns: 1, rows: 2 });

      expect(meanderDatabaseService.save).toHaveBeenCalledWith(record);
    });

    it("resolves with the saved meander row", async () => {
      await expect(
        service.draw({ code: "2", columns: 1, rows: 2 }),
      ).resolves.toBe(savedMeander);
    });
  });
});
