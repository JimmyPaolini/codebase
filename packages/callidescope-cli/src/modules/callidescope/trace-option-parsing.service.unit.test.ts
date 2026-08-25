import path from "node:path";

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

  it("resolves a relative directory to an absolute path", () => {
    expect(path.isAbsolute(service.parseDirectory("."))).toBe(true);
  });

  it("defaults the directory to the working directory", () => {
    expect(service.parseDirectory(undefined)).toBe(path.resolve(process.cwd()));
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

  it("splits the projects flag on commas", () => {
    expect(service.parseProjects("alpha, beta")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("reads an absent projects flag as every project", () => {
    expect(service.parseProjects(undefined)).toStrictEqual([]);
  });

  it("drops empty entries from the projects flag", () => {
    expect(service.parseProjects("alpha,,beta,")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });
});
