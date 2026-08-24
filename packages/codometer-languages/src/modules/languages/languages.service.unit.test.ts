import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CssService } from "../css/css.service";
import { HclService } from "../hcl/hcl.service";
import { JsonService } from "../json/json.service";
import { JupyterService } from "../jupyter/jupyter.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { ShellService } from "../shell/shell.service";
import { SqlService } from "../sql/sql.service";
import { TomlService } from "../toml/toml.service";
import { TypescriptService } from "../typescript/typescript.service";
import { YamlService } from "../yaml/yaml.service";

import { LanguagesService } from "./languages.service";

import type { DiscoveredLanguageFiles } from "./languages.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const configuration = createMock<ResolvedCodometerConfiguration>({
  python: { command: "uv run python" },
});

const discoveredFiles: DiscoveredLanguageFiles = {
  cssFiles: ["src/styles.css"],
  hclFiles: ["infrastructure/main.tf"],
  jsonFiles: ["package.json"],
  markdownFiles: ["README.md"],
  notebookFiles: ["notebooks/explore.ipynb"],
  pyFiles: ["scripts/check.py"],
  shellFiles: ["scripts/setup.sh"],
  sourceFiles: ["src/app.ts"],
  sqlFiles: ["data/schema.sql"],
  tomlFiles: ["pyproject.toml"],
  yamlFiles: [".github/workflows/ci.yml"],
};

describe(LanguagesService, () => {
  let service: LanguagesService;
  let cssService: CssService;
  let jupyterService: JupyterService;
  let pythonService: PythonService;
  let yamlService: YamlService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LanguagesService,
        { provide: CssService, useValue: createMock<CssService>() },
        { provide: HclService, useValue: createMock<HclService>() },
        { provide: JsonService, useValue: createMock<JsonService>() },
        { provide: JupyterService, useValue: createMock<JupyterService>() },
        { provide: MarkdownService, useValue: createMock<MarkdownService>() },
        { provide: PythonService, useValue: createMock<PythonService>() },
        { provide: ShellService, useValue: createMock<ShellService>() },
        { provide: SqlService, useValue: createMock<SqlService>() },
        { provide: TomlService, useValue: createMock<TomlService>() },
        {
          provide: TypescriptService,
          useValue: createMock<TypescriptService>(),
        },
        { provide: YamlService, useValue: createMock<YamlService>() },
      ],
    }).compile();

    service = await module.resolve(LanguagesService);
    cssService = await module.resolve(CssService);
    jupyterService = await module.resolve(JupyterService);
    pythonService = await module.resolve(PythonService);
    yamlService = await module.resolve(YamlService);
  });

  beforeEach(() => {
    service.analyze({
      configuration,
      discoveredFiles,
      symbolCounters: [],
      workingDirectory: "/repo",
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("gives each analyzer only the files of its own language", () => {
    expect(cssService.analyze).toHaveBeenCalledWith({
      cssFiles: ["src/styles.css"],
      workingDirectory: "/repo",
    });
    expect(yamlService.analyze).toHaveBeenCalledWith({
      workingDirectory: "/repo",
      yamlFiles: [".github/workflows/ci.yml"],
    });
  });

  it("passes the configured interpreter to both Python readers", () => {
    // The notebook analyzer runs the same interpreter over its code cells.
    expect(pythonService.analyze).toHaveBeenCalledWith({
      command: "uv run python",
      pythonFiles: ["scripts/check.py"],
      workingDirectory: "/repo",
    });
    expect(jupyterService.analyze).toHaveBeenCalledWith({
      notebookFiles: ["notebooks/explore.ipynb"],
      pythonCommand: "uv run python",
      workingDirectory: "/repo",
    });
  });

  it("reports one entry per language", () => {
    const results = service.analyze({
      configuration,
      discoveredFiles,
      symbolCounters: [],
      workingDirectory: "/repo",
    });

    expect(Object.keys(results).toSorted()).toStrictEqual([
      "css",
      "hcl",
      "json",
      "jupyter",
      "markdown",
      "python",
      "shell",
      "sql",
      "toml",
      "typescript",
      "yaml",
    ]);
  });
});
