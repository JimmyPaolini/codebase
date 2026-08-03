import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { MeasureMarkdownService } from "./measure-markdown.service";

describe(MeasureMarkdownService, () => {
  let service: MeasureMarkdownService;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeasureMarkdownService],
    }).compile();

    service = await module.resolve(MeasureMarkdownService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("measures markdown structural elements from markdown files", () => {
    const temporaryDirectory = mkdtempSync(
      path.join(tmpdir(), "codometer-md-"),
    );
    temporaryDirectories.push(temporaryDirectory);
    const markdownOnePath = path.join(temporaryDirectory, "README.md");
    const markdownTwoPath = path.join(temporaryDirectory, "TESTING.md");

    writeFileSync(
      markdownOnePath,
      "# Header\n\n- Item one\n- Item two\n\nParagraph with [link](https://example.com).\n",
      "utf8",
    );
    writeFileSync(
      markdownTwoPath,
      "```ts\nconst value = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n",
      "utf8",
    );

    const result = service.analyze({
      markdownFiles: ["README.md", "TESTING.md"],
      workingDirectory: temporaryDirectory,
    });

    expect(result.files).toBe(2);
    expect(result.lines).toBe(15);
    expect(result.headers).toBe(1);
    expect(result.lists).toBe(1);
    expect(result.listItems).toBe(2);
    expect(result.paragraphs).toBe(3);
    expect(result.links).toBe(1);
    expect(result.codeBlocks).toBe(1);
    expect(result.tables).toBe(1);
    expect(result.markdownElements).toBeGreaterThanOrEqual(8);
    expect(result.otherMarkdownElements).toBeGreaterThanOrEqual(0);
  });
});
