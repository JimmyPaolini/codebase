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
});
