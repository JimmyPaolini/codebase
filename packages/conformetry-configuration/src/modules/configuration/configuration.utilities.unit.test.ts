import { describe, expect, it } from "vitest";

import {
  collectGeneratorInputsFromCommandArguments,
  normalizeRuntimeOptions,
  resolveConfigurationPath,
  resolveTargetDirectoryPath,
} from "./configuration.utilities.js";

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
  });
});
