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

    it("falls back to generated output directory when no project root resolves", async () => {
      const targetDirectoryPath = await resolveTargetDirectoryPath({
        defaultGeneratedOutputDirectory: "output",
        generatorName: "react-component",
        options: {},
      });

      expect(targetDirectoryPath).toBe("output/react-component");
    });

    it("uses outputDirectoryPath and projectName aliases", async () => {
      const targetDirectoryPath = await resolveTargetDirectoryPath({
        generatorName: "react-component",
        options: {
          outputDirectoryPath: "packages/lexico-components",
          projectName: "lexico-components",
        },
        resolveProjectRootPath: () => {
          return "should-not-be-used";
        },
      });

      expect(targetDirectoryPath).toBe("packages/lexico-components");
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

    it("supports kebab-case schema options and ignores reserved/missing values", () => {
      const inputs = collectGeneratorInputsFromCommandArguments({
        rawArguments: [
          "--component-type",
          "table",
          "--help",
          "--project",
          "--target-directory-path",
          "ignored",
          "--component-type",
        ],
        schema: {
          properties: {
            componentType: {
              type: "string",
            },
            targetDirectoryPath: {
              type: "string",
            },
          },
        },
      });

      expect(inputs).toStrictEqual({
        componentType: "table",
      });
    });

    it("returns no inputs when schema properties are missing", () => {
      expect(
        collectGeneratorInputsFromCommandArguments({
          rawArguments: ["--component-type", "table"],
          schema: {},
        }),
      ).toStrictEqual({});
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

    it("returns empty arrays for blank values", () => {
      expect(parseCommaDelimitedOption(" , , ")).toStrictEqual([]);
    });
  });

  describe(resolveTargetDirectoryPath, () => {
    it("falls back to default generated directory when project root is unresolved", async () => {
      const targetDirectoryPath = await resolveTargetDirectoryPath({
        generatorName: "demo-generator",
        options: {
          project: "demo",
        },
        resolveProjectRootPath: () => {
          return undefined;
        },
      });

      expect(targetDirectoryPath).toBe("generated/demo-generator");
    });
  });
});
