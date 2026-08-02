import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { WriteReadmeService } from "./write-readme.service";

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

  const sampleStatistics = {
    asyncFunctions: 1,
    classes: 2,
    constants: 3,
    decorators: 4,
    enums: 5,
    exported: 6,
    externalPackages: 7,
    folders: 8,
    functions: 9,
    genericDeclarations: 10,
    imports: 11,
    interfaces: 12,
    jsFiles: 13,
    linesOfCode: 14,
    methods: 15,
    pythonClasses: 16,
    pythonConstants: 17,
    pythonDecorators: 18,
    pythonFiles: 19,
    pythonFunctions: 20,
    pythonImports: 21,
    pythonLines: 22,
    pythonProtocols: 23,
    repoSizeMiB: "1.5",
    sourceFiles: 24,
    syncFunctions: 25,
    testFiles: 26,
    todos: 27,
    tsFiles: 28,
  } as const;

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
});
