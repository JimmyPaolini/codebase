import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { TemplateValidationService } from "./configuration-template-validation.service";
import { ConfigurationModule } from "./configuration.module";
import { ConfigurationService } from "./configuration.service";

describe("configuration module", () => {
  it("registers configuration and template validation services", async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [ConfigurationModule],
    }).compile();

    expect(moduleReference.get(ConfigurationService)).toBeInstanceOf(
      ConfigurationService,
    );
    expect(moduleReference.get(TemplateValidationService)).toBeInstanceOf(
      TemplateValidationService,
    );
  });
});
