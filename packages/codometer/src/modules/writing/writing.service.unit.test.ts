import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { WritingService } from "./writing.service";

import type { CodeStatisticsResult } from "../codometer/codometer.types";

describe(WritingService, () => {
  let service: WritingService;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [WritingService],
    }).compile();

    service = await module.resolve(WritingService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  const sampleStatistics: CodeStatisticsResult = {
    folders: 13,
    javascript: {
      asyncFunctions: 1,
      classes: 2,
      commentLines: 3,
      comments: 4,
      constants: 5,
      exported: 11,
      externalPackages: 12,
      files: 18,
      functions: 14,
      imports: 16,
      methods: 32,
      syncFunctions: 42,
      testFiles: 43,
      todos: 44,
    },
    json: {
      arrays: 19,
      booleans: 20,
      files: 21,
      items: 22,
      lines: 23,
      maxDepth: 24,
      nulls: 25,
      numbers: 26,
      objects: 27,
      properties: 28,
      strings: 29,
      totalNodes: 30,
    },
    linesOfCode: 31,
    markdown: {
      blockQuotes: 50,
      codeBlocks: 51,
      files: 52,
      headingLevel1: 53,
      headingLevel2: 54,
      headingLevel3: 55,
      headingLevel4: 56,
      headingLevel5: 57,
      headingLevel6: 58,
      images: 59,
      inlineCode: 60,
      lines: 61,
      links: 62,
      listItems: 63,
      lists: 64,
      paragraphs: 65,
      tableRows: 66,
      tables: 67,
      taskListItems: 68,
      thematicBreaks: 69,
    },
    python: {
      classes: 33,
      commentLines: 3,
      comments: 4,
      constants: 34,
      decorators: 35,
      docstringLines: 8,
      docstrings: 9,
      files: 36,
      functions: 37,
      imports: 38,
      lines: 39,
      protocols: 40,
    },
    repoSizeMiB: 2,
    sourceFiles: 41,
    typescript: {
      decorators: 6,
      docComments: 7,
      enums: 10,
      files: 45,
      genericDeclarations: 15,
      interfaces: 17,
    },
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("groups the badges by the language each was measured from", () => {
    const block = service.buildBadgeBlock(sampleStatistics);

    expect(block).toContain("**Repository**");
    expect(block).toContain("**TypeScript & JavaScript**");
    expect(block).toContain("**Python**");
    expect(block).toContain("**JSON**");
  });

  it("renders one badge for every measured statistic", () => {
    const block = service.buildBadgeBlock(sampleStatistics);
    const badgeCount = (block.match(/^!\[/gmu) ?? []).length;
    const measuredCount =
      Object.keys(sampleStatistics).length -
      // The five grouped buckets are replaced by the counters they hold.
      5 +
      Object.keys(sampleStatistics.javascript).length +
      Object.keys(sampleStatistics.json).length +
      Object.keys(sampleStatistics.markdown).length +
      Object.keys(sampleStatistics.python).length +
      Object.keys(sampleStatistics.typescript).length;

    expect(badgeCount).toBe(measuredCount);
  });

  it("reports each language's counters separately rather than summed", () => {
    const block = service.buildBadgeBlock(sampleStatistics);

    // Classes are 2 in TypeScript and 33 in Python; neither is the sum, 35.
    expect(block).toContain(
      "![Classes](https://img.shields.io/badge/Classes-2-",
    );
    expect(block).toContain(
      "![Python Classes](https://img.shields.io/badge/Python_Classes-33-",
    );
    expect(block).not.toContain("/badge/Classes-35-");
  });

  it("renders the JSON statistics the badge block previously dropped", () => {
    const block = service.buildBadgeBlock(sampleStatistics);

    expect(block).toContain(
      "![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-24-",
    );
    expect(block).toContain(
      "![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-30-",
    );
  });

  it("replaces the badge block in an existing README", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(
      readmePath,
      "# Project\n\n<!-- CODE_STATISTICS_START -->\nold\n<!-- CODE_STATISTICS_END -->\n",
      "utf8",
    );

    service.syncReadme(readmePath, sampleStatistics);

    const written = readFileSync(readmePath, "utf8");

    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
    expect(written).toContain("<!-- CODE_STATISTICS_END -->");
    expect(written).toContain("![Lines of Code]");
    expect(written).not.toContain("\nold\n");
  });

  it("appends the badge block when no markers exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(readmePath, "# Project\n", "utf8");

    service.syncReadme(readmePath, sampleStatistics);

    const written = readFileSync(readmePath, "utf8");

    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
    expect(written).toContain("![Source Files]");
    expect(written.trimEnd()).toContain("<!-- CODE_STATISTICS_END -->");
    expect(written.indexOf("# Project")).toBeLessThan(
      written.indexOf("<!-- CODE_STATISTICS_START -->"),
    );
  });

  it("returns false in check mode when no markers exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(readmePath, "# Project\n", "utf8");

    expect(service.syncReadme(readmePath, sampleStatistics, true)).toBe(false);
  });

  it("returns true when block is already current in check mode", () => {
    const block = service.buildBadgeBlock(sampleStatistics);
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(readmePath, `# Project\n\n${block}\n`, "utf8");

    expect(service.syncReadme(readmePath, sampleStatistics, true)).toBe(true);
  });

  it("returns false when block is out of date in check mode", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(
      readmePath,
      "# Project\n\n<!-- CODE_STATISTICS_START -->\nstale\n<!-- CODE_STATISTICS_END -->\n",
      "utf8",
    );

    expect(service.syncReadme(readmePath, sampleStatistics, true)).toBe(false);
  });

  it("creates a new README when the file does not exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    expect(service.syncReadme(readmePath, sampleStatistics)).toBe(true);

    const written = readFileSync(readmePath, "utf8");

    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
  });
});
