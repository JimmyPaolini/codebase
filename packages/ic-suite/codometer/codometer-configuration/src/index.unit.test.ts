import { describe, expect, it } from "vitest";

import {
  codometerConfigurationSchema,
  ConfigurationFileNotFoundError,
  ConfigurationModule,
  ConfigurationService,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_PYTHON_COMMAND,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("codometer-configuration index", () => {
  it("exports the configuration surface", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(ConfigurationFileNotFoundError).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
    expect(codometerConfigurationSchema).toBeDefined();
    expect(DEFAULT_EXCLUDE_GLOBS).toBeDefined();
    expect(DEFAULT_PYTHON_COMMAND).toBeDefined();
  });
});
