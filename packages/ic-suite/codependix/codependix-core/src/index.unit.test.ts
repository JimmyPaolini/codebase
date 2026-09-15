import { describe, expect, it } from "vitest";

import * as core from "./index.js";

describe("codependix-core index", () => {
  // The defining invariant of the spine's leaf, and the only thing about this
  // package worth asserting: every export is a type, so the module compiles to
  // nothing at runtime. A service, a NestJS module, an error class, or a
  // constant added here fails this — which is the moment the layer contract
  // would otherwise break silently.
  it("ships no runtime export", () => {
    expect(Object.keys(core)).toStrictEqual([]);
  });
});
