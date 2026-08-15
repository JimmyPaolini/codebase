import { describe, expect, it } from "vitest";

import {
  ConfigurationModule,
  ConfigurationService,
  DiscoveryModule,
  DiscoveryService,
  InputModule,
  InputOptionsService,
  InputService,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("conformetry-configuration index", () => {
  it("exports the configuration, discovery, and input surfaces", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(DiscoveryModule).toBeDefined();
    expect(DiscoveryService).toBeDefined();
    expect(InputModule).toBeDefined();
    expect(InputOptionsService).toBeDefined();
    expect(InputService).toBeDefined();
    expect(UnknownConfigurationFileTypeError).toBeDefined();
  });
});
