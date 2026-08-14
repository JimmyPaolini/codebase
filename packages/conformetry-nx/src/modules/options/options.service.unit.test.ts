import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_CONFIGURATION_PATH,
  DEFAULT_VALIDATE_TARGET_NAME,
} from "./options.constants";
import { OptionsService } from "./options.service";

describe(OptionsService, () => {
  let service: OptionsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OptionsService],
    }).compile();

    service = await module.resolve(OptionsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolvePluginOptions", () => {
    it("falls back to defaults when Nx passes nothing", () => {
      expect(service.resolvePluginOptions(undefined)).toStrictEqual({
        configurationPath: DEFAULT_CONFIGURATION_PATH,
        validateTargetName: DEFAULT_VALIDATE_TARGET_NAME,
      });
    });

    it("reads the configured values", () => {
      expect(
        service.resolvePluginOptions({
          configurationPath: "conformetry.config.ts",
          validateTargetName: "conform",
        }),
      ).toStrictEqual({
        configurationPath: "conformetry.config.ts",
        validateTargetName: "conform",
      });
    });

    it("ignores values of the wrong type", () => {
      expect(
        service.resolvePluginOptions({ validateTargetName: 42 })
          .validateTargetName,
      ).toBe(DEFAULT_VALIDATE_TARGET_NAME);
    });
  });

  describe("resolveGeneratorInputs", () => {
    it("keeps the generator's own string options", () => {
      expect(
        service.resolveGeneratorInputs({ name: "my-widget", project: "app" }),
      ).toStrictEqual({ name: "my-widget", project: "app" });
    });

    it("drops the options that configure the plugin", () => {
      expect(
        service.resolveGeneratorInputs({
          configurationPath: "conformetry.config.ts",
          name: "my-widget",
        }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("drops values that are not text", () => {
      expect(
        service.resolveGeneratorInputs({ dryRun: true, name: "my-widget" }),
      ).toStrictEqual({ name: "my-widget" });
    });

    it("returns nothing for a non-object", () => {
      expect(service.resolveGeneratorInputs("nope")).toStrictEqual({});
    });
  });

  describe("resolveConfigurationPath", () => {
    it("reads the path out of this plugin's registration", () => {
      expect(
        service.resolveConfigurationPath({
          plugins: [
            { options: { targetName: "eslint" }, plugin: "@nx/eslint/plugin" },
            {
              options: { configurationPath: "configuration/conformetry.ts" },
              plugin: "@jimmypaolini/conformetry-nx",
            },
          ],
        }),
      ).toBe("configuration/conformetry.ts");
    });

    it("falls back when the plugin is registered without options", () => {
      expect(
        service.resolveConfigurationPath({
          plugins: [{ plugin: "@jimmypaolini/conformetry-nx" }],
        }),
      ).toBe(DEFAULT_CONFIGURATION_PATH);
    });

    it.each([
      ["no configuration at all", undefined],
      ["a configuration that is not an object", "nx.json"],
      ["a configuration with no plugins", {}],
      ["plugins that are not a list", { plugins: "@nx/eslint/plugin" }],
      ["a list holding no entry for this plugin", { plugins: ["@nx/vite"] }],
    ])("falls back given %s", (_description, nxConfiguration) => {
      expect(service.resolveConfigurationPath(nxConfiguration)).toBe(
        DEFAULT_CONFIGURATION_PATH,
      );
    });
  });
});
