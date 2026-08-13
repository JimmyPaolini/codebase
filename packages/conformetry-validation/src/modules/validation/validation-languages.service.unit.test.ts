import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationLanguagesService } from "./validation-languages.service";
import { ValidationModule } from "./validation.module";

describe(ValidationLanguagesService, () => {
  let service: ValidationLanguagesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ValidationModule],
      providers: [ValidationLanguagesService],
    }).compile();

    service = await module.resolve(ValidationLanguagesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readValidators", () => {
    it("registers every language conformetry can validate", () => {
      expect(
        service.readValidators().map((validator) => validator.descriptor.name),
      ).toStrictEqual([
        "typescript",
        "python",
        "jupyter",
        "markdown",
        "json",
        "text",
      ]);
    });

    it("gives every validator at least one file extension to claim", () => {
      for (const validator of service.readValidators()) {
        expect(validator.descriptor.fileExtensions.length).toBeGreaterThan(0);
      }
    });
  });
});
