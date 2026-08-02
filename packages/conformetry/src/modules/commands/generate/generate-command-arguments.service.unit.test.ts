import { describe, expect, it } from "vitest";

import { GenerateCommandArgumentsService } from "./generate-command-arguments.service.js";

describe(GenerateCommandArgumentsService, () => {
  it("collects schema-defined generator inputs from CLI arguments", () => {
    const service = new GenerateCommandArgumentsService();

    const inputs = service.collectGeneratorInputsFromArguments(
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
    const service = new GenerateCommandArgumentsService();

    const inputs = service.collectGeneratorInputsFromArguments(
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
    const service = new GenerateCommandArgumentsService();

    const inputs = service.collectGeneratorInputsFromArguments(
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
    const service = new GenerateCommandArgumentsService();

    const inputs = service.collectGeneratorInputsFromArguments(
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
    const service = new GenerateCommandArgumentsService();

    const inputs = service.collectGeneratorInputsFromArguments(
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
    const service = new GenerateCommandArgumentsService();

    const inputs = service.collectGeneratorInputsFromArguments(
      ["generate", "--project", "lexico-components"],
      {},
    );

    expect(inputs).toStrictEqual({});
  });
});
