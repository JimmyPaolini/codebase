import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoverFilesService } from "../discover-files/discover-files.service";
import { MeasureMarkdownService } from "../measure-markdown/measure-markdown.service";
import { MeasurePythonService } from "../measure-python/measure-python.service";
import { MeasureTypescriptService } from "../measure-typescript/measure-typescript.service";

import { CodometerService } from "./codometer.service";

describe(CodometerService, () => {
  let service: CodometerService;
  let discoverFilesService: DiscoverFilesService;
  let measureMarkdownService: MeasureMarkdownService;
  let measurePythonService: MeasurePythonService;
  let measureTypescriptService: MeasureTypescriptService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerService,
        DiscoverFilesService,
        MeasureMarkdownService,
        MeasurePythonService,
        MeasureTypescriptService,
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    const discoveryService = new DiscoverFilesService();
    const markdownService = new MeasureMarkdownService();
    const pythonService = new MeasurePythonService();
    const typescriptService = new MeasureTypescriptService();

    vi.spyOn(discoveryService, "discoverFiles").mockReturnValue({
      jsFiles: ["src/app.js"],
      markdownFiles: ["README.md"],
      pyFiles: ["scripts/check.py"],
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      testFiles: [],
      trackedFiles: ["src/app.ts", "scripts/check.py"],
      tsFiles: ["src/app.ts"],
    });
    vi.spyOn(markdownService, "analyze").mockReturnValue({
      blockquotes: 1,
      codeBlocks: 2,
      files: 3,
      headers: 4,
      images: 5,
      inlineCode: 6,
      lines: 7,
      links: 8,
      listItems: 9,
      lists: 10,
      markdownElements: 11,
      otherMarkdownElements: 12,
      paragraphs: 13,
      tables: 14,
      thematicBreaks: 15,
    });
    vi.spyOn(pythonService, "analyze").mockReturnValue({
      classes: 2,
      constants: 3,
      decorators: 4,
      files: 1,
      functions: 5,
      imports: 6,
      lines: 7,
      protocols: 8,
    });
    vi.spyOn(typescriptService, "analyze").mockReturnValue({
      asyncFunctions: 9,
      classes: 10,
      constants: 11,
      decorators: 12,
      enums: 13,
      exported: 14,
      externalPackages: new Set(["react"]),
      functions: 15,
      genericDeclarations: 16,
      imports: 17,
      interfaces: 18,
      jsFiles: 1,
      lines: 19,
      methods: 20,
      syncFunctions: 21,
      testFiles: 0,
      todos: 22,
      tsFiles: 1,
    });

    discoverFilesService = discoveryService;
    measureMarkdownService = markdownService;
    measurePythonService = pythonService;
    measureTypescriptService = typescriptService;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("aggregates repository statistics into a report", () => {
    const codometerService = new CodometerService(
      discoverFilesService,
      measureTypescriptService,
      measureMarkdownService,
      measurePythonService,
    );
    const result = codometerService.measure("/repo");

    expect(discoverFilesService.discoverFiles).toHaveBeenCalledWith("/repo");
    expect(measureTypescriptService.analyze).toHaveBeenCalledWith({
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      workingDirectory: "/repo",
    });
    expect(measureMarkdownService.analyze).toHaveBeenCalledWith({
      markdownFiles: ["README.md"],
      workingDirectory: "/repo",
    });
    expect(measurePythonService.analyze).toHaveBeenCalledWith("/repo");

    expect(result.classes).toBe(12);
    expect(result.constants).toBe(14);
    expect(result.decorators).toBe(16);
    expect(result.externalPackages).toBe(1);
    expect(result.functions).toBe(40);
    expect(result.imports).toBe(23);
    expect(result.linesOfCode).toBe(33);
    expect(result.markdownFiles).toBe(3);
    expect(result.markdownHeaders).toBe(4);
    expect(result.markdownLists).toBe(10);
    expect(result.markdownElements).toBe(11);
    expect(result.sourceFiles).toBe(3);
  });
});
