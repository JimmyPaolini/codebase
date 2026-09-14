import { describe, expect, it } from "vitest";

import {
  ConfigurationModule,
  ConfigurationService,
  InputModule,
  InputOptionsService,
  InputService,
  TemplateDiscoveryModule,
  TemplateDiscoveryService,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("conformetry-configuration index", () => {
  it("exports the configuration, discovery, and input surfaces", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(TemplateDiscoveryModule).toBeDefined();
    expect(TemplateDiscoveryService).toBeDefined();
    expect(InputModule).toBeDefined();
    expect(InputOptionsService).toBeDefined();
    expect(InputService).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
  });
});
