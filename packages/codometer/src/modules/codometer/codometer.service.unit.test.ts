import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoveryService } from "../discovery/discovery.service";
import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { TypescriptService } from "../typescript/typescript.service";

import { CodometerService } from "./codometer.service";

describe(CodometerService, () => {
  let service: CodometerService;
  let discoveryService: DiscoveryService;
  let jsonService: JsonService;
  let markdownService: MarkdownService;
  let pythonService: PythonService;
  let typescriptService: TypescriptService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerService,
        DiscoveryService,
        JsonService,
        MarkdownService,
        PythonService,
        TypescriptService,
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    discoveryService = new DiscoveryService();
    jsonService = new JsonService();
    markdownService = new MarkdownService();
    pythonService = new PythonService();
    typescriptService = new TypescriptService();

    vi.spyOn(discoveryService, "discoverFiles").mockReturnValue({
      jsFiles: ["src/app.js"],
      jsonFiles: [],
      markdownFiles: ["docs/guide.md"],
      pyFiles: ["scripts/check.py"],
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      testFiles: [],
      trackedFiles: ["src/app.ts", "scripts/check.py"],
      tsFiles: ["src/app.ts"],
    });
    vi.spyOn(jsonService, "analyze").mockReturnValue({
      arrays: 1,
      booleans: 2,
      files: 3,
      items: 4,
      lines: 5,
      maxDepth: 6,
      nulls: 7,
      numbers: 8,
      objects: 9,
      properties: 10,
      strings: 11,
      totalNodes: 12,
    });
    vi.spyOn(pythonService, "analyze").mockReturnValue({
      classes: 2,
      commentLines: 4,
      comments: 3,
      constants: 5,
      decorators: 6,
      docstringLines: 8,
      docstrings: 7,
      files: 1,
      functions: 9,
      imports: 10,
      lines: 11,
      protocols: 12,
    });
    vi.spyOn(markdownService, "analyze").mockReturnValue({
      blockQuotes: 1,
      codeBlocks: 2,
      files: 3,
      headingLevel1: 4,
      headingLevel2: 5,
      headingLevel3: 6,
      headingLevel4: 7,
      headingLevel5: 8,
      headingLevel6: 9,
      images: 10,
      inlineCode: 11,
      lines: 12,
      links: 13,
      listItems: 14,
      lists: 15,
      paragraphs: 16,
      tableRows: 17,
      tables: 18,
      taskListItems: 19,
      thematicBreaks: 20,
    });
    vi.spyOn(typescriptService, "analyze").mockReturnValue({
      asyncFunctions: 9,
      blockComments: 1,
      classes: 10,
      commentLines: 2,
      comments: 3,
      constants: 11,
      decorators: 12,
      docComments: 4,
      docTags: { param: 1 },
      enums: 13,
      exported: 14,
      externalPackages: new Set(["react"]),
      functions: 15,
      genericDeclarations: 16,
      imports: 17,
      interfaces: 18,
      jsFiles: 1,
      lineComments: 5,
      lines: 19,
      methods: 20,
      syncFunctions: 21,
      testFiles: 0,
      todos: 22,
      tsFiles: 1,
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("aggregates repository statistics into a report", () => {
    const codometerService = new CodometerService(
      discoveryService,
      typescriptService,
      pythonService,
      jsonService,
      markdownService,
    );
    const result = codometerService.measure("/repo");

    expect(discoveryService.discoverFiles).toHaveBeenCalledWith("/repo");
    expect(typescriptService.analyze).toHaveBeenCalledWith({
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      workingDirectory: "/repo",
    });
    expect(pythonService.analyze).toHaveBeenCalledWith(
      ["scripts/check.py"],
      "/repo",
    );

    expect(markdownService.analyze).toHaveBeenCalledWith({
      markdownFiles: ["docs/guide.md"],
      workingDirectory: "/repo",
    });
    expect(result.markdown.headingLevel1).toBe(4);
    expect(result.markdown.tables).toBe(18);
    expect(result.markdown.taskListItems).toBe(19);

    expect(result.javascript.classes + result.python.classes).toBe(12);
    expect(result.javascript.comments + result.python.comments).toBe(6);
    expect(result.javascript.commentLines + result.python.commentLines).toBe(6);
    expect(result.javascript.constants + result.python.constants).toBe(16);
    expect(result.typescript.decorators + result.python.decorators).toBe(18);
    expect(result.typescript.docComments).toBe(4);
    expect(result.python.docstrings).toBe(7);
    expect(result.python.docstringLines).toBe(8);
    expect(result.javascript.externalPackages).toBe(1);
    expect(
      result.javascript.functions +
        result.javascript.methods +
        result.python.functions,
    ).toBe(44);
    expect(result.javascript.imports + result.python.imports).toBe(27);
    expect(result.linesOfCode).toBe(30);
    expect(result.sourceFiles).toBe(3);
  });
});
