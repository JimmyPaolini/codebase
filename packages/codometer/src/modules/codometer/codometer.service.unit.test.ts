import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoverFilesService } from "../discover-files/discover-files.service";
import { MeasureJsonService } from "../measure-json/measure-json.service";
import { MeasurePythonService } from "../measure-python/measure-python.service";
import { MeasureTypescriptService } from "../measure-typescript/measure-typescript.service";

import { CodometerService } from "./codometer.service";

describe(CodometerService, () => {
  let service: CodometerService;
  let discoverFilesService: DiscoverFilesService;
  let measureJsonService: MeasureJsonService;
  let measurePythonService: MeasurePythonService;
  let measureTypescriptService: MeasureTypescriptService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerService,
        DiscoverFilesService,
        MeasureJsonService,
        MeasurePythonService,
        MeasureTypescriptService,
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    const discoveryService = new DiscoverFilesService();
    const jsonService = new MeasureJsonService();
    const pythonService = new MeasurePythonService();
    const typescriptService = new MeasureTypescriptService();

    vi.spyOn(discoveryService, "discoverFiles").mockReturnValue({
      jsFiles: ["src/app.js"],
      jsonFiles: [],
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

    discoverFilesService = discoveryService;
    measureJsonService = jsonService;
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
      measurePythonService,
      measureJsonService,
    );
    const result = codometerService.measure("/repo");

    expect(discoverFilesService.discoverFiles).toHaveBeenCalledWith("/repo");
    expect(measureTypescriptService.analyze).toHaveBeenCalledWith({
      sourceFiles: ["src/app.ts", "scripts/check.py"],
      workingDirectory: "/repo",
    });
    expect(measurePythonService.analyze).toHaveBeenCalledWith("/repo");

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
