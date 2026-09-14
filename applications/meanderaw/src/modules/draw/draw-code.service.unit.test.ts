import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MeanderDatabaseService } from "../meander-database/meander-database.service";
import { MeanderDecodingService } from "../meander-decoding/meander-decoding.service";
import { MeanderRenderingService } from "../meander-rendering/meander-rendering.service";

import { DrawCodeService } from "./draw-code.service";

import type { Meander } from "../meander-database/entities/Meander.entity";
import type { MeanderPointGrid } from "../meander-decoding/meander-decoding.types";

// 🧪 Tests

describe(DrawCodeService, () => {
  let service: DrawCodeService;
  let meanderDatabaseService: MeanderDatabaseService;
  let meanderDecodingService: MeanderDecodingService;
  let meanderRenderingService: MeanderRenderingService;

  const grid: MeanderPointGrid = [
    [{ east: true, north: false, south: false, west: false }],
  ];
  const savedMeander = createMock<Meander>({ id: 1 });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawCodeService,
        {
          provide: MeanderDatabaseService,
          useValue: createMock<MeanderDatabaseService>(),
        },
        {
          provide: MeanderDecodingService,
          useValue: createMock<MeanderDecodingService>(),
        },
        {
          provide: MeanderRenderingService,
          useValue: createMock<MeanderRenderingService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawCodeService);
    meanderDatabaseService = await module.resolve(MeanderDatabaseService);
    meanderDecodingService = await module.resolve(MeanderDecodingService);
    meanderRenderingService = await module.resolve(MeanderRenderingService);

    vi.mocked(meanderDecodingService.decode).mockReturnValue(grid);
    vi.mocked(meanderRenderingService.render).mockReturnValue(
      "<svg>fixture</svg>\n",
    );
    vi.mocked(meanderDatabaseService.save).mockResolvedValue(savedMeander);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("draw", () => {
    it("decodes the code at the given rows and columns", async () => {
      await service.draw({ code: "2", columns: 1, rows: 2 });

      expect(meanderDecodingService.decode).toHaveBeenCalledWith("2", 2, 1);
    });

    it("renders the decoded grid at the given rows and columns", async () => {
      await service.draw({ code: "2", columns: 1, rows: 2 });

      expect(meanderRenderingService.render).toHaveBeenCalledWith(grid, 2, 1);
    });

    it("persists the rendered svg with pitch equal to columns and hardcoded provenance", async () => {
      await service.draw({ code: "2", columns: 3, rows: 4 });

      expect(meanderDatabaseService.save).toHaveBeenCalledWith({
        code: "2",
        columns: 3,
        pitch: 3,
        provenance: "hardcoded",
        rows: 4,
        svg: "<svg>fixture</svg>\n",
      });
    });

    it("resolves with the saved meander row", async () => {
      await expect(
        service.draw({ code: "2", columns: 1, rows: 2 }),
      ).resolves.toBe(savedMeander);
    });
  });
});
