import { describe, expect, it } from "vitest";

import { InvalidModifierError } from "./invalid-modifier.errors";

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
