import { describe, expect, it } from "vitest";

import { LexicoApiModule } from "./lexico-api.module";

describe("lexico api module suite", () => {
  it("instantiates LexicoApiModule", () => {
    expect.hasAssertions();

    const module = new LexicoApiModule();

    expect(module).toBeDefined();
  });
});
