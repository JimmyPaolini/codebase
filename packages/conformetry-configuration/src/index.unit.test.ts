import { describe, expect, it } from "vitest";

import {
  ConfigurationModule,
  ConfigurationService,
  prepareTemplateValidationPayload,
  TemplateValidationService,
} from "./index.js";

describe("conformetry-configuration index", () => {
  it("exports public runtime APIs", () => {
    expect(ConfigurationModule).toBeDefined();
    expect(ConfigurationService).toBeDefined();
    expect(TemplateValidationService).toBeDefined();
    expect(prepareTemplateValidationPayload).toBeTypeOf("function");
  });
});
