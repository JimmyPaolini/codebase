import { describe, expect, it, vi } from "vitest";

import { TemplateValidationService } from "./configuration-template-validation.service.js";
import { prepareTemplateValidationPayload } from "./configuration-template-validation.utilities.js";

describe(prepareTemplateValidationPayload, () => {
  it("delegates payload preparation to the template validation service", async () => {
    const payload = {
      checkedPaths: ["apps/demo"],
      documents: [],
      violations: [],
    };
    const prepareTemplateValidationPayloadSpy = vi
      .spyOn(
        TemplateValidationService.prototype,
        "prepareTemplateValidationPayload",
      )
      .mockResolvedValueOnce(payload);

    try {
      const result = await prepareTemplateValidationPayload({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        filePaths: ["apps/demo"],
        workingDirectory: "/workspace",
      });

      expect(result).toStrictEqual(payload);
      expect(prepareTemplateValidationPayloadSpy).toHaveBeenCalledWith({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        filePaths: ["apps/demo"],
        workingDirectory: "/workspace",
      });
    } finally {
      prepareTemplateValidationPayloadSpy.mockRestore();
    }
  });
});
