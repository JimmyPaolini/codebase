import { readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "./boxes-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { InvalidRepeatCountError } from "./invalid-repeat-count.errors";
import { InvalidRowsError } from "./invalid-rows.errors";
import { MeanderGenerationService } from "./meander-generation.service";
import { SvgRenderingService } from "./svg-rendering.service";

describe(MeanderGenerationService, () => {
  let service: MeanderGenerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderGenerationService,
        GridGeometryService,
        BoxesMotifService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(MeanderGenerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("matches the committed golden fixture for 5 rows boxes with 6 repeats", async () => {
      const svg = service.generate({
        repeatCount: 6,
        rows: 5,
        type: "boxes",
      });
      const golden = await readFile(
        path.join(
          import.meta.dirname,
          "../../../testing/fixtures/boxes-5-rows-6-repeats.svg",
        ),
        "utf8",
      );

      expect(svg).toBe(golden);
    });

    it("throws below the structural minimum rows for boxes", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 2, type: "boxes" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws above the maximum rows", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: 13, type: "boxes" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws below the minimum repeat count", () => {
      expect(() =>
        service.generate({ repeatCount: 0, rows: 5, type: "boxes" }),
      ).toThrow(InvalidRepeatCountError);
    });

    it("throws above the maximum repeat count", () => {
      expect(() =>
        service.generate({ repeatCount: 13, rows: 5, type: "boxes" }),
      ).toThrow(InvalidRepeatCountError);
    });

    it("throws on a non-integer rows value rather than producing NaN coordinates", () => {
      expect(() =>
        service.generate({ repeatCount: 1, rows: Number.NaN, type: "boxes" }),
      ).toThrow(InvalidRowsError);
    });

    it("throws on a non-integer repeat count rather than producing NaN coordinates", () => {
      expect(() =>
        service.generate({ repeatCount: Number.NaN, rows: 5, type: "boxes" }),
      ).toThrow(InvalidRepeatCountError);
    });
  });
});
