import { describe, expect, it } from "vitest";

import { collectGeneratorPassthroughArguments } from "./main.js";

describe(collectGeneratorPassthroughArguments, () => {
  it("forwards repeated generator-specific options after the initial selector options", () => {
    const { passthroughArguments, sanitizedArguments } =
      collectGeneratorPassthroughArguments([
        "generate",
        "--config",
        "configuration/conformetry.config.ts",
        "--name",
        "react-component",
        "--name",
        "demo-component",
        "--project",
        "lexico-components",
      ]);

    expect(sanitizedArguments).toStrictEqual([
      "generate",
      "--config",
      "configuration/conformetry.config.ts",
      "--name",
      "react-component",
    ]);
    expect(passthroughArguments).toStrictEqual([
      "--name",
      "demo-component",
      "--project",
      "lexico-components",
    ]);
  });
});
