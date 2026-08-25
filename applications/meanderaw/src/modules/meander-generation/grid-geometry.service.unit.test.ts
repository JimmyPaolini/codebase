import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "./grid-geometry.service";

describe(GridGeometryService, () => {
  let service: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GridGeometryService],
    }).compile();

    service = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compute", () => {
    it.each([
      { expected: { offset: 3.75, strokeWidth: 7.5, unit: 15 }, rows: 4 },
      { expected: { offset: 3, strokeWidth: 6, unit: 12 }, rows: 5 },
      { expected: { offset: 2.5, strokeWidth: 5, unit: 10 }, rows: 6 },
    ])(
      "derives the grid unit, offset, and stroke width from $rows rows",
      ({ expected, rows }) => {
        const geometry = service.compute(rows);

        expect(geometry.height).toBe(60);
        expect(geometry.unit).toBeCloseTo(expected.unit);
        expect(geometry.offset).toBeCloseTo(expected.offset);
        expect(geometry.strokeWidth).toBeCloseTo(expected.strokeWidth);
      },
    );

    it("keeps offset at one quarter of the unit and stroke width at half", () => {
      const geometry = service.compute(7);

      expect(geometry.offset).toBeCloseTo(geometry.unit / 4);
      expect(geometry.strokeWidth).toBeCloseTo(geometry.unit / 2);
    });
  });

  describe("formatCoordinate", () => {
    it("renders a whole number with no decimal point", () => {
      expect(service.formatCoordinate(15)).toBe("15");
    });

    it("rounds a repeating decimal to five decimal places", () => {
      expect(service.formatCoordinate(60 / 7)).toBe("8.57143");
    });

    it("trims trailing zeros left after rounding", () => {
      expect(service.formatCoordinate(3.75)).toBe("3.75");
    });
  });
});
