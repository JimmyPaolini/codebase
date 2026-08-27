import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { OutputFilenameService } from "./output-filename.service";

describe(OutputFilenameService, () => {
  let service: OutputFilenameService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OutputFilenameService],
    }).compile();

    service = await module.resolve(OutputFilenameService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("build", () => {
    it("encodes type, rows, and repeat count with no modifier", () => {
      expect(service.build({ repeatCount: 8, rows: 5, type: "boxes" })).toBe(
        "boxes-5-rows-8-repeats.svg",
      );
    });

    it("appends a modifier's name when it has no extra parameters", () => {
      expect(
        service.build({
          modifier: { name: "spin" },
          repeatCount: 4,
          rows: 5,
          type: "boxes",
        }),
      ).toBe("boxes-5-rows-4-repeats-spin.svg");
    });

    it("appends edge-flip's name unchanged", () => {
      expect(
        service.build({
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 4,
          type: "chain",
        }),
      ).toBe("chain-4-rows-6-repeats-edge-flip.svg");
    });

    it("appends alternated's name and period", () => {
      expect(
        service.build({
          modifier: { name: "alternated", period: 2 },
          repeatCount: 6,
          rows: 5,
          type: "mosaic",
        }),
      ).toBe("mosaic-5-rows-6-repeats-alternated-period-2.svg");
    });

    it("appends dot's name and shape", () => {
      expect(
        service.build({
          modifier: { name: "dot", shape: "bounce" },
          repeatCount: 6,
          rows: 6,
          type: "mosaic",
        }),
      ).toBe("mosaic-6-rows-6-repeats-dot-bounce.svg");
    });
  });
});
