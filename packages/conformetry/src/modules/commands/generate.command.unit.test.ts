import { describe, expect, it } from "vitest";

import { collectGeneratorInputsFromArguments } from "./generate.command.helpers.js";

describe(collectGeneratorInputsFromArguments, () => {
  it("collects schema-defined generator inputs from CLI arguments", () => {
    const inputs = collectGeneratorInputsFromArguments(
      [
        "generate",
        "--config",
        "configuration/conformetry.config.ts",
        "--name",
        "react-component",
        "--project",
        "lexico-components",
      ],
      {
        properties: {
          name: { type: "string" },
          project: { type: "string" },
        },
      },
    );

    expect(inputs).toStrictEqual({ project: "lexico-components" });
  });
});
