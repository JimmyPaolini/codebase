import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MeanderDecodingService } from "./meander-decoding.service";

// 🧪 Tests

describe(MeanderDecodingService, () => {
  let service: MeanderDecodingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeanderDecodingService],
    }).compile();

    service = await module.resolve(MeanderDecodingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("decode", () => {
    it("decodes a single bare point at one row and one column", () => {
      expect(service.decode("0", 2, 1)).toStrictEqual([
        [{ east: false, north: false, south: false, west: false }],
      ]);
    });

    it("decodes every bit of a crossing point, worth 8 + 4 + 2 + 1", () => {
      expect(service.decode("f", 2, 1)).toStrictEqual([
        [{ east: true, north: true, south: true, west: true }],
      ]);
    });

    it("decodes a corner turning south and east, worth 4 + 2", () => {
      expect(service.decode("6", 2, 1)).toStrictEqual([
        [{ east: true, north: false, south: true, west: false }],
      ]);
    });

    it("accepts an uppercase hexadecimal digit the same as its lowercase form", () => {
      expect(service.decode("F", 2, 1)).toStrictEqual(
        service.decode("f", 2, 1),
      );
    });

    it("decodes a multi-row, multi-column code in reading order", () => {
      // Two interior levels (3 rows) by two columns: "3c" then "9a", one
      // hexadecimal character per point, left to right then top to bottom.
      expect(service.decode("3c9a", 3, 2)).toStrictEqual([
        [
          { east: true, north: false, south: false, west: true },
          { east: false, north: true, south: true, west: false },
        ],
        [
          { east: false, north: true, south: false, west: true },
          { east: true, north: true, south: false, west: false },
        ],
      ]);
    });

    it("refuses a code shorter than rows and columns need", () => {
      expect(() => service.decode("0", 3, 2)).toThrow(
        /"0" is 1 characters, but 3 rows and 2 columns need 4/,
      );
    });

    it("refuses a code longer than rows and columns need", () => {
      expect(() => service.decode("00000", 3, 2)).toThrow(
        /"00000" is 5 characters, but 3 rows and 2 columns need 4/,
      );
    });

    it("refuses a character outside the hexadecimal alphabet", () => {
      expect(() => service.decode("g", 2, 1)).toThrow(
        /"g", which is not a hexadecimal digit/,
      );
    });
  });
});
