import { describe, expect, it } from "vitest";

import {
  InvalidModifierError,
  InvalidPeriodError,
  InvalidStrandCountError,
  InvalidSubFamilyError,
} from "./meander-generation.constants";

describe("meander generation errors", () => {
  describe(InvalidModifierError, () => {
    it("names the offending modifier, the type, and the compatible alternatives", () => {
      const error = new InvalidModifierError("edge", "boxes", [
        "spin",
        "spin-flip",
      ]);

      expect(error.name).toBe("InvalidModifierError");
      expect(error.message).toBe(
        'modifier "edge" is not compatible with type "boxes"; compatible modifiers: spin, spin-flip',
      );
    });

    it("reports 'none' when the type accepts no modifiers", () => {
      const error = new InvalidModifierError("spin", "chain", []);

      expect(error.message).toBe(
        'modifier "spin" is not compatible with type "chain"; compatible modifiers: none',
      );
    });
  });

  describe(InvalidPeriodError, () => {
    it("names the bounds and the offending period", () => {
      const error = new InvalidPeriodError(0, 1, 12);

      expect(error.name).toBe("InvalidPeriodError");
      expect(error.message).toBe("period must be between 1 and 12, received 0");
    });
  });

  describe(InvalidStrandCountError, () => {
    // 🎯 The maximum is named as the row count rather than as a bound the
    // reader has to look up, because it is the row count: a bundle of N
    // strands needs N rows.
    it("names the minimum, the row count that bounds it, and the offending ply", () => {
      const error = new InvalidStrandCountError(6, 2, 5);

      expect(error.name).toBe("InvalidStrandCountError");
      expect(error.message).toBe(
        "strands must be between 2 and the row count 5, received 6",
      );
    });
  });

  describe(InvalidSubFamilyError, () => {
    it("names the offending sub-family, the type, and the alternatives", () => {
      const error = new InvalidSubFamilyError("dots", "mosaic", [
        "dashes",
        "dots",
      ]);

      expect(error.name).toBe("InvalidSubFamilyError");
      expect(error.message).toBe(
        'sub-family "dots" is not a sub-family of type "mosaic"; sub-families: dashes, dots',
      );
    });

    it("reports 'none' for a family whose unit space is latent", () => {
      const error = new InvalidSubFamilyError("dots", "boxes", []);

      expect(error.message).toBe(
        'sub-family "dots" is not a sub-family of type "boxes"; sub-families: none',
      );
    });
  });
});
