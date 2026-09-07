import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TypescriptCommentsService } from "./typescript-comments.service";

describe(TypescriptCommentsService, () => {
  let service: TypescriptCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptCommentsService],
    }).compile();

    service = await module.resolve(TypescriptCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a `//` comment's line, prose, and source", () => {
    expect(service.read("const value = 1;\n// a note\n")).toStrictEqual([
      {
        line: 2,
        ownLine: true,
        prose: " a note",
        source: "// a note",
      },
    ]);
  });

  it("reads a plain block comment spanning several lines as one token", () => {
    expect(service.read("/* line one\nline two */\n")).toStrictEqual([
      {
        line: 1,
        ownLine: true,
        prose: " line one\nline two ",
        source: "/* line one\nline two */",
      },
    ]);
  });

  it("marks a comment following code as not starting its own line", () => {
    const [token] = service.read("const value = 1; // trailing\n");

    expect(token?.ownLine).toBe(false);
  });

  it("marks an indented comment as starting its own line", () => {
    const [token] = service.read("  // indented\n");

    expect(token?.ownLine).toBe(true);
  });

  it("never reads a `//` inside a string as a comment", () => {
    expect(service.read('const url = "https://example.com";\n')).toStrictEqual(
      [],
    );
  });

  it("never reads a `//` inside a template literal as a comment", () => {
    expect(service.read("const url = `https://${host}`;\n")).toStrictEqual([]);
  });

  it("skips a JSDoc block, which is measured elsewhere", () => {
    expect(
      service.read("/**\n * Documents a function.\n */\nfunction run() {}\n"),
    ).toStrictEqual([]);
  });

  it("finds nothing in a file with no comments", () => {
    expect(service.read("const value = 1;\n")).toStrictEqual([]);
  });
});
