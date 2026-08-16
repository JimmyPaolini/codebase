// `param` is the name of the JSDoc tag these tests count, not an abbreviation.
// cspell:ignore param

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoveryService } from "../discovery/discovery.service";
import { JsonService } from "../json/json.service";
import { JupyterService } from "../jupyter/jupyter.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { TypescriptService } from "../typescript/typescript.service";
import { YamlService } from "../yaml/yaml.service";

import { CodometerService } from "./codometer.service";

import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const configuration: ResolvedCodometerConfiguration = {
  exclude: ["**/node_modules/**"],
  excludeFrom: [],
  output: { json: undefined, markdown: undefined },
  python: { command: "uv run python" },
};

describe(CodometerService, () => {
  let service: CodometerService;
  let discoveryService: DiscoveryService;
  let jsonService: JsonService;
  let jupyterService: JupyterService;
  let markdownService: MarkdownService;
  let pythonService: PythonService;
  let typescriptService: TypescriptService;
  let yamlService: YamlService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerService,
        DiscoveryService,
        JsonService,
        JupyterService,
        MarkdownService,
        PythonService,
        TypescriptService,
        YamlService,
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    discoveryService = new DiscoveryService();
    jsonService = new JsonService();
    markdownService = new MarkdownService();
    pythonService = new PythonService();
    jupyterService = new JupyterService(
      jsonService,
      markdownService,
      pythonService,
    );
    typescriptService = new TypescriptService();
    yamlService = new YamlService();

    vi.spyOn(discoveryService, "discoverFiles").mockReturnValue({
      jsFiles: ["src/app.js"],
      jsonFiles: [],
      markdownFiles: ["docs/guide.md"],
      notebookFiles: ["notebooks/explore.ipynb"],
      pyFiles: ["scripts/check.py"],
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      testFiles: [],
      trackedFiles: ["src/app.ts", "scripts/check.py"],
      tsFiles: ["src/app.ts"],
      yamlFiles: [".github/workflows/ci.yml"],
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
    vi.spyOn(yamlService, "analyze").mockReturnValue({
      aliases: 1,
      anchors: 2,
      comments: 3,
      documents: 4,
      files: 5,
      keys: 6,
      lines: 7,
      mappings: 8,
      maxDepth: 9,
      scalars: 10,
      sequences: 11,
    });
    vi.spyOn(jupyterService, "analyze").mockReturnValue({
      cells: 7,
      classes: 1,
      codeBlocks: 2,
      codeCells: 6,
      codeLines: 40,
      decorators: 3,
      executedCells: 4,
      files: 1,
      functions: 5,
      headings: 6,
      images: 7,
      imports: 8,
      links: 9,
      markdownCells: 1,
      markdownLines: 10,
      maxDepth: 11,
      outputs: 12,
      properties: 13,
      rawCells: 0,
      totalNodes: 14,
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
      jupyterService,
      yamlService,
    );
    const result = codometerService.measure({
      configuration,
      workingDirectory: "/repo",
    });

    expect(discoveryService.discoverFiles).toHaveBeenCalledWith({
      exclude: ["**/node_modules/**"],
      excludeFrom: [],
      workingDirectory: "/repo",
    });
    expect(typescriptService.analyze).toHaveBeenCalledWith({
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      workingDirectory: "/repo",
    });
    expect(pythonService.analyze).toHaveBeenCalledWith({
      command: "uv run python",
      pythonFiles: ["scripts/check.py"],
      workingDirectory: "/repo",
    });

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
    expect(jupyterService.analyze).toHaveBeenCalledWith({
      notebookFiles: ["notebooks/explore.ipynb"],
      pythonCommand: "uv run python",
      workingDirectory: "/repo",
    });
    expect(yamlService.analyze).toHaveBeenCalledWith({
      workingDirectory: "/repo",
      yamlFiles: [".github/workflows/ci.yml"],
    });
    expect(result.yaml.documents).toBe(4);
    expect(result.yaml.keys).toBe(6);
    expect(result.jupyter.cells).toBe(7);
    expect(result.jupyter.codeCells).toBe(6);
    expect(result.jupyter.markdownLines).toBe(10);
    // Notebook code counts toward the repository total exactly once.
    expect(result.linesOfCode).toBe(70);
    expect(result.sourceFiles).toBe(3);
  });
});
