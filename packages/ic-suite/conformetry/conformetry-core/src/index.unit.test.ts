import { describe, expect, it } from "vitest";

import * as conformetryCore from "./index.js";

describe("conformetry-core index", () => {
  /**
   * The one thing worth asserting about a contracts leaf.
   *
   * Every sibling package's index test names the services it exports; this one
   * has none to name, and listing type names would only restate a declaration
   * the compiler already checks. What it asserts instead is the property that
   * makes this package the leaf of the spine: the module contributes nothing
   * at runtime, so importing a result type from here cannot drag a service,
   * a NestJS module, or their dependencies behind it. Exporting one value
   * fails this.
   */
  it("exports contracts only, with nothing at runtime", () => {
    expect(Object.keys(conformetryCore)).toStrictEqual([]);
  });
});
