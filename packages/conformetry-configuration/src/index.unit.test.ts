import { describe, expect, it } from "vitest";

import { TemplateValidationService } from "./modules/configuration/configuration-template-validation.service";
import { prepareTemplateValidationPayload } from "./modules/configuration/configuration-template-validation.utilities";
import { ConfigurationModule } from "./modules/configuration/configuration.module";
import { ConfigurationService } from "./modules/configuration/configuration.service";

import * as packageExports from "./index";

describe("package exports", () => {
  it("exports the public runtime API", () => {
    expect(packageExports.ConfigurationModule).toBe(ConfigurationModule);
    expect(packageExports.ConfigurationService).toBe(ConfigurationService);
    expect(packageExports.TemplateValidationService).toBe(
      TemplateValidationService,
    );
    expect(packageExports.prepareTemplateValidationPayload).toBe(
      prepareTemplateValidationPayload,
    );
    expect(packageExports.buildNameSubstitutions).toBeTypeOf("function");
    expect(
      packageExports.collectGeneratorInputsFromCommandArguments,
    ).toBeTypeOf("function");
    expect(packageExports.normalizeRuntimeOptions).toBeTypeOf("function");
    expect(packageExports.parseCommaDelimitedOption).toBeTypeOf("function");
    expect(packageExports.resolveConfigurationPath).toBeTypeOf("function");
    expect(packageExports.resolveTargetDirectoryPath).toBeTypeOf("function");
  });
});
