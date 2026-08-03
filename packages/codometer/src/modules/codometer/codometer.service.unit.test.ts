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

    expect(result.classes).toBe(12);
    expect(result.constants).toBe(14);
    expect(result.decorators).toBe(16);
    expect(result.externalPackages).toBe(1);
    expect(result.functions).toBe(40);
    expect(result.imports).toBe(23);
    expect(result.linesOfCode).toBe(26);
    expect(result.sourceFiles).toBe(3);
  });
});
