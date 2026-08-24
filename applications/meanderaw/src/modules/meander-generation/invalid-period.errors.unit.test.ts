import { describe, expect, it } from "vitest";

import { InvalidPeriodError } from "./invalid-period.errors";

describe(InvalidPeriodError, () => {
  it("names the bounds and the offending period", () => {
    const error = new InvalidPeriodError(0, 1, 12);

    expect(error.name).toBe("InvalidPeriodError");
    expect(error.message).toBe("period must be between 1 and 12, received 0");
  });
});
