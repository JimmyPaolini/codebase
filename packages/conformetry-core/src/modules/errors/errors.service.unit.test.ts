import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ErrorsService } from "./errors.service";

describe(ErrorsService, () => {
  let service: ErrorsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ErrorsService],
    }).compile();

    service = await module.resolve(ErrorsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildMissingFileError", () => {
    it("reports the instance path and points the fix at the template", () => {
      const error = service.buildMissingFileError({
        instanceFilePath: "packages/example/src/index.ts",
        templateFilePath: "templates/example/src/index.ts",
      });

      expect(error.errorType).toBe("file");
      expect(error.message).toContain("packages/example/src/index.ts");
      expect(error.fix).toContain("templates/example/src/index.ts");
    });

    it("omits language, because a missing file has no format", () => {
      const error = service.buildMissingFileError({
        instanceFilePath: "a",
        templateFilePath: "b",
      });

      expect(error.language).toBeUndefined();
    });
  });

  describe("buildMissingDirectoryError", () => {
    it("reports the directory category", () => {
      const error = service.buildMissingDirectoryError({
        instanceDirectoryPath: "packages/example/src/modules",
        templateDirectoryPath: "templates/example/src/modules",
      });

      expect(error.errorType).toBe("directory");
      expect(error.message).toContain("packages/example/src/modules");
    });
  });

  describe("resolveErrorLanguage", () => {
    it("passes through a recognized language", () => {
      expect(service.resolveErrorLanguage("python")).toBe("python");
    });

    it("returns undefined for an unrecognized value", () => {
      expect(service.resolveErrorLanguage("cobol")).toBeUndefined();
      expect(service.resolveErrorLanguage(42)).toBeUndefined();
      expect(service.resolveErrorLanguage(undefined)).toBeUndefined();
    });
  });

  describe("resolveErrorType", () => {
    it("passes through a recognized category", () => {
      expect(service.resolveErrorType("comment")).toBe("comment");
    });

    it("falls back to code so one bad payload cannot fail the run", () => {
      expect(service.resolveErrorType("nonsense")).toBe("code");
      expect(service.resolveErrorType(null)).toBe("code");
    });
  });
});
