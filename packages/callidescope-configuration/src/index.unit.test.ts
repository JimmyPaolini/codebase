import { describe, expect, it } from "vitest";

import {
  callidescopeConfigurationSchema,
  ConfigurationFileNotFoundError,
  ConfigurationModule,
  ConfigurationService,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_MAXIMUM_DEPTH,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("callidescope-configuration index", () => {
  it("exports the configuration surface", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(ConfigurationFileNotFoundError).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
    expect(callidescopeConfigurationSchema).toBeDefined();
    expect(DEFAULT_EXCLUDE_GLOBS).toBeDefined();
    expect(DEFAULT_ENTRY_POINT_DECORATORS).toBeDefined();
    expect(DEFAULT_MAXIMUM_DEPTH).toBeDefined();
  });
});
