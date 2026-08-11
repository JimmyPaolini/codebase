import { describe, expect, it, vi } from "vitest";

import { TemplateValidationService } from "./configuration-template-validation.service";
import { prepareTemplateValidationPayload } from "./configuration-template-validation.utilities";

describe("configuration template validation utilities", () => {
  it("delegates payload preparation to template validation service", async () => {
    const expectedPayload = {
      checkedPaths: ["apps/demo"],
      documents: [],
      violations: [],
    };
    const preparePayloadSpy = vi
      .spyOn(
        TemplateValidationService.prototype,
        "prepareTemplateValidationPayload",
      )
      .mockResolvedValueOnce(expectedPayload);

    try {
      await expect(
        prepareTemplateValidationPayload({
          configurationPath: "configuration/conformetry.config.ts",
          fileExtensions: [".ts"],
          filePaths: ["apps/demo"],
          workingDirectory: "/workspace",
        }),
      ).resolves.toStrictEqual(expectedPayload);
    } finally {
      preparePayloadSpy.mockRestore();
    }
  });
});
