import { describe, expect, it } from "vitest";

import { UnknownConfigurationFileTypeError } from "./configuration.errors.js";
import { ConfigurationService } from "./configuration.service.js";

describe("configurationService.loadConformetryConfiguration", () => {
  it("loads the repository conformetry config from the root configuration file", async () => {
    const configurationService = new ConfigurationService();
    const configuration =
      await configurationService.loadConformetryConfiguration(
        "configuration/conformetry.config.ts",
      );

    expect(configuration.generators["react-component"]).toBeDefined();
  });

  it("throws a typed error for unsupported configuration extensions", async () => {
    const configurationService = new ConfigurationService();

    await expect(
      configurationService.loadConformetryConfiguration(
        "configuration/does-not-exist.yaml",
      ),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });
});
