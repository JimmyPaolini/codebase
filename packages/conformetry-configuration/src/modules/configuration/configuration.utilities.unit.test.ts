import { describe, expect, it } from "vitest";

import {
  collectGeneratorInputsFromCommandArguments,
  normalizeRuntimeOptions,
  parseCommaDelimitedOption,
  resolveConfigurationPath,
  resolveTargetDirectoryPath,
} from "./configuration.utilities";

describe("configuration utilities", () => {
  describe(resolveConfigurationPath, () => {
    it("prefers explicit config option over plugin and default values", () => {
      const path = resolveConfigurationPath({
        defaultConfigurationPath: "configuration/conformetry.config.ts",
        options: {
          config: "configuration/custom.config.ts",
        },
        pluginOptions: {
          configFilePath: "configuration/plugin.config.ts",
        },
      });

      expect(path).toBe("configuration/custom.config.ts");
    });

    it("falls back to plugin configFilePath when option is missing", () => {
      const path = resolveConfigurationPath({
        defaultConfigurationPath: "configuration/conformetry.config.ts",
        options: {},
        pluginOptions: {
          configFilePath: "configuration/plugin.config.ts",
        },
      });

      expect(path).toBe("configuration/plugin.config.ts");
    });

    it("uses repository default when no overrides are present", () => {
      const path = resolveConfigurationPath({
        options: {},
      });

      expect(path).toBe("configuration/conformetry.config.ts");
    });
  });

  describe(normalizeRuntimeOptions, () => {
    it("normalizes primitive and object values", () => {
      const normalized = normalizeRuntimeOptions({
        enabled: true,
        metadata: {
          level: "strict",
        },
        name: "demo",
        retries: 2,
        skipped: undefined,
      });

      expect(normalized).toStrictEqual({
        enabled: "true",
        metadata: '{"level":"strict"}',
        name: "demo",
        retries: "2",
        skipped: undefined,
      });
    });
  });

  describe(resolveTargetDirectoryPath, () => {
    it("prefers explicit output path flags", async () => {
      const targetDirectoryPath = await resolveTargetDirectoryPath({
        generatorName: "react-component",
        options: {
          outputPath: "packages/lexico-components",
        },
        resolveProjectRootPath: () => {
          return undefined;
        },
      });

      expect(targetDirectoryPath).toBe("packages/lexico-components");
    });

    it("uses project root fallback when no explicit path is provided", async () => {
      const targetDirectoryPath = await resolveTargetDirectoryPath({
        generatorName: "react-component",
        options: {
          project: "lexico-components",
        },
        resolveProjectRootPath: ({ projectName }) => {
          return projectName === "lexico-components"
            ? "packages/lexico-components"
            : undefined;
        },
      });

      expect(targetDirectoryPath).toBe("packages/lexico-components");
    });

    it("falls back to generated directory when project root cannot be resolved", async () => {
      const targetDirectoryPath = await resolveTargetDirectoryPath({
        generatorName: "react-component",
        options: {
          project: "unknown-project",
        },
        resolveProjectRootPath: () => {
          return undefined;
        },
      });

      expect(targetDirectoryPath).toBe("generated/react-component");
    });
  });

  describe(collectGeneratorInputsFromCommandArguments, () => {
    it("extracts schema-backed arguments and excludes reserved options", () => {
      const inputs = collectGeneratorInputsFromCommandArguments({
        rawArguments: [
          "generate",
          "--name",
          "should-be-ignored",
          "--project",
          "lexico",
          "--component-type=card",
          "--config",
          "configuration/custom.config.ts",
        ],
        schema: {
          properties: {
            componentType: {
              type: "string",
            },
            name: {
              type: "string",
            },
            project: {
              type: "string",
            },
          },
        },
      });

      expect(inputs).toStrictEqual({
        componentType: "card",
        project: "lexico",
      });
    });

    it("ignores options that do not have a value or use reserved property names", () => {
      const inputs = collectGeneratorInputsFromCommandArguments({
        rawArguments: [
          "generate",
          "--name=component-name",
          "--name",
          "--project",
          "--component-type",
        ],
        schema: {
          properties: {
            componentType: {
              type: "string",
            },
            name: {
              type: "string",
            },
            project: {
              type: "string",
            },
          },
        },
      });

      expect(inputs).toStrictEqual({});
    });

    it("handles raw arguments without generate prefix and schemas without properties", () => {
      const inputs = collectGeneratorInputsFromCommandArguments({
        rawArguments: ["--component-type=card"],
        schema: {},
      });

      expect(inputs).toStrictEqual({});
    });
  });

  describe(parseCommaDelimitedOption, () => {
    it("returns undefined for missing values", () => {
      expect(parseCommaDelimitedOption(undefined)).toBeUndefined();
    });

    it("returns trimmed non-empty values", () => {
      expect(
        parseCommaDelimitedOption(" first-project, second-project ,, third "),
      ).toStrictEqual(["first-project", "second-project", "third"]);
    });
  });
});
