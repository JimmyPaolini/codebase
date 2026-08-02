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

  it("supports kebab-case schema fields and inline option values", () => {
    const inputs = collectGeneratorInputsFromArguments(
      [
        "--project-name=lexico-components",
        "--target-directory-path=packages/lexico-components",
      ],
      {
        properties: {
          projectName: { type: "string" },
          targetDirectoryPath: { type: "string" },
        },
      },
    );

    expect(inputs).toStrictEqual({
      projectName: "lexico-components",
    });
  });

  it("ignores reserved options, flags without values, and unknown fields", () => {
    const inputs = collectGeneratorInputsFromArguments(
      [
        "generate",
        "--config",
        "configuration/conformetry.config.ts",
        "--name",
        "react-component",
        "--project",
        "lexico-components",
        "--dry-run",
        "--targetDirectoryPath",
        "packages/conformetry",
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

  it("ignores reserved options matched by option name even when schema property differs", () => {
    const inputs = collectGeneratorInputsFromArguments(
      [
        "--config",
        "configuration/conformetry.config.ts",
        "--project",
        "lexico",
      ],
      {
        properties: {
          configPath: { type: "string" },
          project: { type: "string" },
        },
      },
    );

    expect(inputs).toStrictEqual({ project: "lexico" });
  });

  it("ignores schema-matched options when no option value is provided", () => {
    const inputs = collectGeneratorInputsFromArguments(
      ["--project", "--name", "component"],
      {
        properties: {
          name: { type: "string" },
          project: { type: "string" },
        },
      },
    );

    expect(inputs).toStrictEqual({});
  });

  it("returns no inputs when schema properties are undefined", () => {
    const inputs = collectGeneratorInputsFromArguments(
      ["generate", "--project", "lexico-components"],
      {},
    );

    expect(inputs).toStrictEqual({});
  });
});
