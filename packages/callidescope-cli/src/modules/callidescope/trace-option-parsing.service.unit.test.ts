import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TraceOptionParsingService } from "./trace-option-parsing.service";

describe(TraceOptionParsingService, () => {
  let service: TraceOptionParsingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TraceOptionParsingService],
    }).compile();

    service = await module.resolve(TraceOptionParsingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("passes a config path through unchanged", () => {
    expect(service.parseConfig("callidescope.config.ts")).toBe(
      "callidescope.config.ts",
    );
  });

  it.each([
    ["json", "json"],
    ["markdown", "markdown"],
    ["mermaid", "mermaid"],
    [undefined, "markdown"],
    ["nonsense", "markdown"],
  ] as const)("parses the format flag %s as %s", (value, expected) => {
    expect(service.parseFormat(value)).toBe(expected);
  });

  it("splits the directories flag on commas", () => {
    expect(service.parseDirectories("packages/a, packages/b")).toStrictEqual([
      "packages/a",
      "packages/b",
    ]);
  });

  it("reads an absent directories flag as every project", () => {
    expect(service.parseDirectories(undefined)).toStrictEqual([]);
  });

  it("drops empty entries from the directories flag", () => {
    expect(service.parseDirectories("packages/a,,packages/b,")).toStrictEqual([
      "packages/a",
      "packages/b",
    ]);
  });
});
