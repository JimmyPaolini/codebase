import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { OutputPathService } from "./output-path.service";

describe(OutputPathService, () => {
  let service: OutputPathService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OutputPathService],
    }).compile();

    service = await module.resolve(OutputPathService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("build", () => {
    it("files an unmodified drawing under its family and row count, named for the repeat count it was drawn at", () => {
      expect(service.build({ repeatCount: 8, rows: 5, type: "boxes" })).toBe(
        "boxes/5-rows/plain-8-repeats.svg",
      );
    });

    it("names the file after a modifier that has no extra parameters", () => {
      expect(
        service.build({
          modifier: { name: "spin" },
          repeatCount: 4,
          rows: 5,
          type: "boxes",
        }),
      ).toBe("boxes/5-rows/spin-4-repeats.svg");
    });

    it("uses edge-flip's name unchanged", () => {
      expect(
        service.build({
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 4,
          type: "chain",
        }),
      ).toBe("chain/4-rows/edge-flip-6-repeats.svg");
    });

    it("carries alternated's period into the filename", () => {
      expect(
        service.build({
          modifier: { name: "alternated", period: 2 },
          repeatCount: 6,
          rows: 5,
          type: "mosaic",
        }),
      ).toBe("mosaic/5-rows/alternated-period-2-6-repeats.svg");
    });

    it("names the file after the sub-family, so a named region of the unit space is legible in it", () => {
      expect(
        service.build({
          repeatCount: 6,
          rows: 6,
          subFamily: "dots",
          type: "mosaic",
        }),
      ).toBe("mosaic/6-rows/dots-6-repeats.svg");
    });

    it("names diamond and split apart even though they draw the same shape, so neither overwrites the other", () => {
      expect(
        service.build({
          repeatCount: 12,
          rows: 5,
          subFamily: "diamond",
          type: "mosaic",
        }),
      ).toBe("mosaic/5-rows/diamond-12-repeats.svg");
      expect(
        service.build({
          modifier: { name: "split" },
          repeatCount: 12,
          rows: 5,
          type: "mosaic",
        }),
      ).toBe("mosaic/5-rows/split-12-repeats.svg");
    });

    it("carries dot's shape into the filename", () => {
      expect(
        service.build({
          modifier: { name: "dot", shape: "bounce" },
          repeatCount: 6,
          rows: 6,
          type: "mosaic",
        }),
      ).toBe("mosaic/6-rows/dot-bounce-6-repeats.svg");
    });
  });

  describe("familyDirectory", () => {
    it("indexes a family's drawings by the row count they were drawn at", () => {
      expect(service.familyDirectory("mosaic", 7)).toBe("mosaic/7-rows");
    });
  });
});
