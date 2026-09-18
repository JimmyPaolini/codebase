import { describe, expect, it } from "vitest";

import * as core from "./index";

describe("@callidescope/core", () => {
  it("exports nothing that survives compilation", () => {
    // The layer invariant, asserted rather than assumed: this package is the
    // contracts leaf, so every export is a type and every one of them is
    // erased before anything runs. A service or a NestJS module added here
    // would show up as a runtime binding and fail this.
    expect(Object.keys(core)).toStrictEqual([]);
  });
});
