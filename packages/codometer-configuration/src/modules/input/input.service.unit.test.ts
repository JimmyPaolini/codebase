import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { InputService } from "./input.service";

describe(InputService, () => {
  let service: InputService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputService],
    }).compile();

    service = await module.resolve(InputService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🔤 Optional option

  it("reads a written value as itself", () => {
    expect(service.parseOptionalOption("reports")).toBe("reports");
  });

  it("reads an omitted option as absent", () => {
    expect(service.parseOptionalOption(undefined)).toBeUndefined();
  });

  it("reads an empty value as absent", () => {
    expect(service.parseOptionalOption("")).toBeUndefined();
  });

  it("reads a valueless flag's boolean as absent", () => {
    expect(service.parseOptionalOption(true)).toBeUndefined();
  });

  // 🗂️ Defaulted option

  it("falls back to the given default when the option is absent", () => {
    expect(service.parseDefaultedOption(undefined, "table")).toBe("table");
  });

  it("keeps a written value over the given default", () => {
    expect(service.parseDefaultedOption("json", "table")).toBe("json");
  });

  it("falls back to the given default for a valueless flag's boolean", () => {
    expect(service.parseDefaultedOption(true, "table")).toBe("table");
  });

  // 📁 Directory option

  it("reads a written directory as itself", () => {
    expect(service.parseDirectoryOption("packages/codometer-cli")).toBe(
      "packages/codometer-cli",
    );
  });

  it("falls back to the working directory when no directory was given", () => {
    expect(service.parseDirectoryOption(undefined)).toBe(process.cwd());
  });

  it("falls back to the working directory when the directory is a boolean", () => {
    expect(service.parseDirectoryOption(true)).toBe(process.cwd());
  });

  it("falls back to the working directory for an empty directory", () => {
    expect(service.parseDirectoryOption("")).toBe(process.cwd());
  });
});
