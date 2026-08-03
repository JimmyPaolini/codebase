import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { WriteReadmeService } from "./write-readme.service";

import type { CodeStatisticsResult } from "../codometer/codometer.types";

describe(WriteReadmeService, () => {
  let service: WriteReadmeService;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [WriteReadmeService],
    }).compile();

    service = await module.resolve(WriteReadmeService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  const sampleStatistics: CodeStatisticsResult = {
    asyncFunctions: 1,
    classes: 2,
    commentLines: 3,
    comments: 4,
    constants: 5,
    decorators: 6,
    docComments: 7,
    docstringLines: 8,
    docstrings: 9,
    enums: 10,
    exported: 11,
    externalPackages: 12,
    folders: 13,
    functions: 14,
    genericDeclarations: 15,
    imports: 16,
    interfaces: 17,
    jsFiles: 18,
    jsonArrays: 19,
    jsonBooleans: 20,
    jsonFiles: 21,
    jsonItems: 22,
    jsonLines: 23,
    jsonMaxDepth: 24,
    jsonNulls: 25,
    jsonNumbers: 26,
    jsonObjects: 27,
    jsonProperties: 28,
    jsonStrings: 29,
    jsonTotalNodes: 30,
    linesOfCode: 31,
    methods: 32,
    pythonClasses: 33,
    pythonConstants: 34,
    pythonDecorators: 35,
    pythonFiles: 36,
    pythonFunctions: 37,
    pythonImports: 38,
    pythonLines: 39,
    pythonProtocols: 40,
    repoSizeMiB: "1.5",
    sourceFiles: 41,
    syncFunctions: 42,
    testFiles: 43,
    todos: 44,
    tsFiles: 45,
  };

  it("is defined", () => {
    expect(service).toBeDefined();
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
