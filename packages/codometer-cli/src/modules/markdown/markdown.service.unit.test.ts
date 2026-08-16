import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { MarkdownService } from "./markdown.service";

describe(MarkdownService, () => {
  let service: MarkdownService;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MarkdownService],
    }).compile();

    service = await module.resolve(MarkdownService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  /** Writes the given documents into a throwaway directory. */
  function writeDocuments(documents: Record<string, string>): string {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);

    for (const [name, content] of Object.entries(documents)) {
      writeFileSync(path.join(temporaryDirectory, name), content, "utf8");
    }

    return temporaryDirectory;
  }

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts each heading against its own level", () => {
    const workingDirectory = writeDocuments({
      "a.md":
        "# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six\n\n## Two again\n",
    });

    const result = service.analyze({
      markdownFiles: ["a.md"],
      workingDirectory,
    });

    expect(result.headingLevel1).toBe(1);
    expect(result.headingLevel2).toBe(2);
    expect(result.headingLevel3).toBe(1);
    expect(result.headingLevel4).toBe(1);
    expect(result.headingLevel5).toBe(1);
    expect(result.headingLevel6).toBe(1);
  });

  it("counts tables, lists, links, and images", () => {
    const workingDirectory = writeDocuments({
      "a.md": [
        "| A | B |",
        "| - | - |",
        "| 1 | 2 |",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "",
        "[link](https://example.com) and ![image](a.png)",
        "",
        "> quoted",
        "",
        "---",
        "",
        "`inline` code",
        "",
        "```ts",
        "const x = 1;",
        "```",
        "",
      ].join("\n"),
    });

    const result = service.analyze({
      markdownFiles: ["a.md"],
      workingDirectory,
    });

    expect(result.tables).toBe(1);
    // Header row plus the single body row.
    expect(result.tableRows).toBe(2);
    expect(result.lists).toBe(2);
    expect(result.listItems).toBe(3);
    expect(result.links).toBe(1);
    expect(result.images).toBe(1);
    expect(result.blockQuotes).toBe(1);
    expect(result.thematicBreaks).toBe(1);
    expect(result.inlineCode).toBe(1);
    expect(result.codeBlocks).toBe(1);
  });

  it("counts GFM task list items as list items too", () => {
    const workingDirectory = writeDocuments({
      "a.md": "- [x] done\n- [ ] todo\n- plain\n",
    });

    const result = service.analyze({
      markdownFiles: ["a.md"],
      workingDirectory,
    });

    expect(result.listItems).toBe(3);
    expect(result.taskListItems).toBe(2);
  });

  it("treats frontmatter as frontmatter rather than a heading", () => {
    const workingDirectory = writeDocuments({
      "a.md": "---\nname: example\n---\n\n# Title\n",
    });

    const result = service.analyze({
      markdownFiles: ["a.md"],
      workingDirectory,
    });

    // Without the frontmatter plugin the closing `---` makes `name: example`
    // a setext heading, which would report a phantom level-two heading.
    expect(result.headingLevel1).toBe(1);
    expect(result.headingLevel2).toBe(0);
  });

  it("aggregates files and lines across documents", () => {
    const workingDirectory = writeDocuments({
      "a.md": "# A\n",
      "b.md": "# B\n\nparagraph\n",
    });

    const result = service.analyze({
      markdownFiles: ["a.md", "b.md"],
      workingDirectory,
    });

    expect(result.files).toBe(2);
    expect(result.lines).toBe(6);
    expect(result.headingLevel1).toBe(2);
    expect(result.paragraphs).toBe(1);
  });

  it("skips unreadable files without failing the run", () => {
    const workingDirectory = writeDocuments({ "a.md": "# A\n" });

    const result = service.analyze({
      markdownFiles: ["a.md", "missing.md"],
      workingDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.headingLevel1).toBe(1);
  });

  it("returns empty metrics when there are no markdown files", () => {
    const result = service.analyze({
      markdownFiles: [],
      workingDirectory: "/repo",
    });

    expect(result.files).toBe(0);
    expect(result.lines).toBe(0);
  });

  it("analyzes markdown source text that came from no file", () => {
    const result = service.analyzeContents([
      "# Title\n\nA [link](https://example.com).\n",
      "## Second\n",
    ]);

    expect(result.files).toBe(2);
    expect(result.headingLevel1).toBe(1);
    expect(result.headingLevel2).toBe(1);
    expect(result.links).toBe(1);
  });
});
