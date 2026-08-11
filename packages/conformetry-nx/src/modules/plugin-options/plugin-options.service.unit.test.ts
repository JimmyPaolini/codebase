import { describe, expect, it } from "vitest";

import {
  CONFORMETRY_NX_PLUGIN_NAME,
  DEFAULT_CONFORMETRY_CONFIGURATION_PATH,
  DEFAULT_VALIDATION_TARGET_NAME,
} from "./plugin-options.constants.js";
import { PluginOptionsService } from "./plugin-options.service.js";

describe(PluginOptionsService, () => {
  it("uses default configuration path when no overrides are provided", async () => {
    const service = new PluginOptionsService();

    await expect(
      service.resolveConformetryConfigurationPath({
        options: {},
      }),
    ).resolves.toBe(DEFAULT_CONFORMETRY_CONFIGURATION_PATH);
  });

  it("prefers explicit configFilePath over plugin options", async () => {
    const service = new PluginOptionsService();

    await expect(
      service.resolveConformetryConfigurationPath({
        options: {
          configFilePath: "configuration/direct.config.ts",
        },
        pluginOptions: {
          configFilePath: "configuration/plugin.config.ts",
          validationTargetName: "validate",
        },
      }),
    ).resolves.toBe("configuration/direct.config.ts");
  });

  it("uses plugin configFilePath when direct option is missing", async () => {
    const service = new PluginOptionsService();

    await expect(
      service.resolveConformetryConfigurationPath({
        options: {},
        pluginOptions: {
          configFilePath: "configuration/plugin.config.ts",
          validationTargetName: "validate",
        },
      }),
    ).resolves.toBe("configuration/plugin.config.ts");
  });

  it("normalizes plugin options and filters invalid rule mappings", () => {
    const service = new PluginOptionsService();

    expect(
      service.resolveConformetryNxPluginOptions({
        configFilePath: "configuration/custom.config.ts",
        templateRuleNamesByProjectTag: {
          "framework:empty": [],
          "framework:invalid": "react-component",
          "framework:nest": ["nestjs-service-module"],
          "framework:react": ["react-component", 123],
        },
        validationTargetName: "validate-custom",
      }),
    ).toStrictEqual({
      configFilePath: "configuration/custom.config.ts",
      templateRuleNamesByProjectTag: {
        "framework:nest": ["nestjs-service-module"],
        "framework:react": ["react-component"],
      },
      validationTargetName: "validate-custom",
    });
  });

  it("falls back to defaults when plugin options are invalid", () => {
    const service = new PluginOptionsService();

    expect(service.resolveConformetryNxPluginOptions("invalid")).toStrictEqual({
      validationTargetName: DEFAULT_VALIDATION_TARGET_NAME,
    });
  });

  it("resolves plugin options from nx.json plugin definitions", () => {
    const service = new PluginOptionsService();

    expect(
      service.resolveConformetryNxPluginOptionsFromNxJson({
        nxJsonConfiguration: {
          plugins: [
            "invalid-entry",
            {
              options: {
                validationTargetName: "ignored",
              },
              plugin: "other-plugin",
            },
            {
              options: {
                configFilePath: "configuration/from-nx-json.config.ts",
                templateRuleNamesByProjectTag: {
                  "framework:react": ["react-component"],
                },
                validationTargetName: "validate-from-nx-json",
              },
              plugin: CONFORMETRY_NX_PLUGIN_NAME,
            },
          ],
        },
      }),
    ).toStrictEqual({
      configFilePath: "configuration/from-nx-json.config.ts",
      templateRuleNamesByProjectTag: {
        "framework:react": ["react-component"],
      },
      validationTargetName: "validate-from-nx-json",
    });
  });

  it("returns defaults when nx.json plugins are missing or not an array", () => {
    const service = new PluginOptionsService();

    expect(
      service.resolveConformetryNxPluginOptionsFromNxJson({
        nxJsonConfiguration: {},
      }),
    ).toStrictEqual({
      validationTargetName: DEFAULT_VALIDATION_TARGET_NAME,
    });

    expect(
      service.resolveConformetryNxPluginOptionsFromNxJson({
        nxJsonConfiguration: {
          plugins: "invalid",
        },
      }),
    ).toStrictEqual({
      validationTargetName: DEFAULT_VALIDATION_TARGET_NAME,
    });
  });

  it("returns defaults when nx.json has plugins but no conformetry-nx entry", () => {
    const service = new PluginOptionsService();

    expect(
      service.resolveConformetryNxPluginOptionsFromNxJson({
        nxJsonConfiguration: {
          plugins: [
            {
              options: {
                validationTargetName: "validate-other",
              },
              plugin: "other-plugin",
            },
          ],
        },
      }),
    ).toStrictEqual({
      validationTargetName: DEFAULT_VALIDATION_TARGET_NAME,
    });
  });
});
