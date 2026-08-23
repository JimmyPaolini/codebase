import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MissingMarkdownPathError } from "./output-markdown.errors";
import { OutputMarkdownService } from "./output-markdown.service";

import type {
  CodeStatisticsResult,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** Builds a markdown destination pointing at the given path. */
function buildDestination(
  markdownPath: string | undefined,
  overrides: Partial<ResolvedCodometerMarkdownOutputConfiguration> = {},
): ResolvedCodometerMarkdownOutputConfiguration {
  return {
    description: undefined,
    endMarker: "<!-- CODE_STATISTICS_END -->",
    path: markdownPath,
    render: undefined,
    startMarker: "<!-- CODE_STATISTICS_START -->",
    write: undefined,
    ...overrides,
  };
}

describe(OutputMarkdownService, () => {
  let service: OutputMarkdownService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutputMarkdownService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(OutputMarkdownService);
    loggerService = await module.resolve(LoggerService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  const sampleStatistics: CodeStatisticsResult = {
    css: {
      atRules: 201,
      comments: 202,
      customProperties: 203,
      declarations: 204,
      files: 205,
      lines: 206,
      mediaQueries: 207,
      rules: 208,
      selectors: 209,
    },
    custom: [
      {
        color: "7c3aed",
        count: 120,
        group: "conventions",
        label: "Service Files",
      },
      {
        color: "0284c7",
        count: 121,
        group: "conventions",
        label: "Unit Tests",
      },
      {
        color: "166534",
        count: 122,
        group: "typescript",
        label: "Static Methods",
      },
    ],
    folders: 13,
    hcl: {
      attributes: 210,
      blocks: 211,
      comments: 212,
      files: 213,
      interpolations: 214,
      lines: 215,
      outputs: 216,
      resources: 217,
      variables: 218,
    },
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
    jupyter: {
      cells: 71,
      classes: 72,
      codeBlocks: 73,
      codeCells: 74,
      codeLines: 75,
      decorators: 76,
      executedCells: 77,
      files: 78,
      functions: 79,
      headings: 80,
      images: 81,
      imports: 82,
      links: 83,
      markdownCells: 84,
      markdownLines: 85,
      maxDepth: 86,
      outputs: 87,
      properties: 88,
      rawCells: 89,
      totalNodes: 90,
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
    repositoryBytes: 2_048_000,
    shell: {
      commentLines: 219,
      comments: 220,
      conditionals: 221,
      exports: 222,
      files: 223,
      functions: 224,
      lines: 225,
      loops: 226,
      pipelines: 227,
      shebangs: 228,
      variables: 229,
    },
    sourceFiles: 41,
    sql: {
      comments: 230,
      commonTableExpressions: 231,
      creates: 232,
      deletes: 233,
      files: 234,
      inserts: 235,
      joins: 236,
      lines: 237,
      selects: 238,
      statements: 239,
      updates: 240,
    },
    toml: {
      arrays: 242,
      arrayTables: 241,
      comments: 243,
      files: 244,
      keys: 245,
      lines: 246,
      tables: 247,
    },
    typescript: {
      decorators: 6,
      docComments: 7,
      enums: 10,
      files: 45,
      genericDeclarations: 15,
      interfaces: 17,
    },
    yaml: {
      aliases: 91,
      anchors: 92,
      comments: 93,
      documents: 94,
      files: 95,
      keys: 96,
      lines: 97,
      mappings: 98,
      maxDepth: 99,
      scalars: 100,
      sequences: 101,
    },
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("heads each language group with a third-level heading", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block).toContain("### Repository\n\n");
    expect(block).toContain("### TypeScript & JavaScript\n\n");
    expect(block).toContain("### Python\n\n");
    expect(block).toContain("### JSON\n\n");
    expect(block).toContain("### Markdown\n\n");
    expect(block).not.toContain("**Repository**");
  });

  // A package README carries figures about that package. Heading them
  // `Repository` names the whole workspace for numbers that never covered it.
  it("heads the whole-tree group `Project` when a project was measured", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "project",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block).toContain("### Project\n\n");
    expect(block).not.toContain("### Repository\n\n");
    expect(block).toContain("![Lines of Code]");
  });

  // The heading is inside the markers, so every run rewrites it along with the
  // figures beneath it and no project README has to carry one by hand.
  it("heads a project's block with a section heading of its own", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "project",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block.startsWith("## ⏲️ Codometer\n\n### Project\n\n")).toBe(true);
  });

  // The heading lives inside the markers for a whole-repository run too, so
  // the README carries no hand-maintained heading of its own above them.
  it("heads a repository's block with the same section heading", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block.startsWith("## ⏲️ Codometer\n\n### Repository\n\n")).toBe(
      true,
    );
  });

  // A description belongs under the heading naming the section, not above it.
  it("puts a project's description between its heading and its badges", () => {
    const document = service.renderDocument({
      description: "Project statistics.",
      scope: "project",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(
      document.startsWith(
        "## ⏲️ Codometer\n\nProject statistics.\n\n### Project\n\n",
      ),
    ).toBe(true);
  });

  // A counter naming a language group belongs beside the built-in counters
  // it extends, not in a separate list at the bottom of the report.
  it("renders a counter into the group it names", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });
    const typescriptGroup = block.split("### ")[2] ?? "";

    expect(typescriptGroup).toContain("TypeScript & JavaScript");
    expect(typescriptGroup).toContain(
      "![Static Methods](https://img.shields.io/badge/Static_Methods-122-166534",
    );
    expect(typescriptGroup).not.toContain("Service Files");
  });

  it("omits the Conventions group when no counter belongs to it", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: {
        ...sampleStatistics,
        custom: sampleStatistics.custom.filter(
          (statistic) => statistic.group === "typescript",
        ),
      },
      targets: [],
    });

    expect(block).not.toContain("### Conventions");
    expect(block).toContain("![Static Methods]");
  });

  it("leads with the configured description when there is one", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md", {
        description: "Measured every push.",
      }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(
      block.startsWith(
        "## ⏲️ Codometer\n\nMeasured every push.\n\n### Repository",
      ),
    ).toBe(true);
  });

  it("omits the description paragraph when none is configured", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block.startsWith("## ⏲️ Codometer\n\n### Repository")).toBe(true);
  });

  it("renders one badge for every measured statistic", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });
    const badgeCount = (block.match(/^!\[/gmu) ?? []).length;
    const measuredCount =
      Object.keys(sampleStatistics).length -
      // The thirteen grouped buckets are replaced by the counters they hold.
      13 +
      Object.keys(sampleStatistics.javascript).length +
      Object.keys(sampleStatistics.json).length +
      Object.keys(sampleStatistics.jupyter).length +
      Object.keys(sampleStatistics.markdown).length +
      Object.keys(sampleStatistics.python).length +
      Object.keys(sampleStatistics.typescript).length +
      Object.keys(sampleStatistics.yaml).length +
      Object.keys(sampleStatistics.css).length +
      Object.keys(sampleStatistics.hcl).length +
      Object.keys(sampleStatistics.shell).length +
      Object.keys(sampleStatistics.sql).length +
      Object.keys(sampleStatistics.toml).length +
      // Each configured counter renders one badge, and the array itself is
      // one of the buckets the total subtracts.
      sampleStatistics.custom.length;

    expect(badgeCount).toBe(measuredCount);
  });

  it("reports each language's counters separately rather than summed", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

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
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

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

    service.sync({
      check: false,
      destination: buildDestination(readmePath),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    const written = readFileSync(readmePath, "utf8");

    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
    expect(written).toContain("<!-- CODE_STATISTICS_END -->");
    expect(written).toContain("![Lines of Code]");
    expect(written).not.toContain("\nold\n");
    expect(loggerService.info).toHaveBeenCalledWith(
      "📝 Wrote the markdown badges",
      undefined,
      { path: readmePath },
    );
  });

  // The section heading sits inside the markers, so a second run has to
  // replace it rather than append another one above the block.
  it("leaves a project README byte-identical on a second write", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(readmePath, "# Project\n", "utf8");

    const write = (): string => {
      service.sync({
        check: false,
        destination: buildDestination(readmePath),
        scope: "project",
        statistics: sampleStatistics,
        targets: [],
      });

      return readFileSync(readmePath, "utf8");
    };
    const first = write();
    const second = write();

    expect(second).toBe(first);
    expect(second.split("## ⏲️ Codometer")).toHaveLength(2);
    expect(
      service.sync({
        check: true,
        destination: buildDestination(readmePath),
        scope: "project",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toBe(true);
  });

  it("appends the badge block when no markers exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(readmePath, "# Project\n", "utf8");

    service.sync({
      check: false,
      destination: buildDestination(readmePath),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    const written = readFileSync(readmePath, "utf8");

    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
    expect(written).toContain("![Source Files]");
    expect(written.trimEnd()).toContain("<!-- CODE_STATISTICS_END -->");
    expect(written.indexOf("# Project")).toBeLessThan(
      written.indexOf("<!-- CODE_STATISTICS_START -->"),
    );
    expect(loggerService.info).toHaveBeenCalledWith(
      "📝 Wrote the markdown badges",
      undefined,
      { path: readmePath },
    );
  });

  it("separates an appended block from the document with one blank line", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    // Trailing newlines are the ordinary case — every markdown file this
    // repository lints ends with one — and appending to them naively leaves a
    // second blank line, which `MD012/no-multiple-blanks` fails.
    writeFileSync(readmePath, "# Project\n\n\n", "utf8");

    service.sync({
      check: false,
      destination: buildDestination(readmePath),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(readFileSync(readmePath, "utf8")).toContain(
      "# Project\n\n<!-- CODE_STATISTICS_START -->",
    );
  });

  it("writes only the block when the file did not exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    service.sync({
      check: false,
      destination: buildDestination(readmePath),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(readFileSync(readmePath, "utf8").startsWith("<!-- CODE_")).toBe(
      true,
    );
  });

  it("renders a size badge for every target the run measured", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [
        { bytes: 5324, compression: "gzip", name: "Compiled JavaScript" },
        { bytes: 1_500_000, compression: "none", name: "Raw assets" },
      ],
    });

    expect(block).toContain("### Measured Targets");
    expect(block).toContain(
      "![Compiled JavaScript Size](https://img.shields.io/badge/Compiled_JavaScript_Size-5.32_kB_gzip-",
    );
    // Decimal megabytes, and no compression named where there was none.
    expect(block).toContain(
      "![Raw assets Size](https://img.shields.io/badge/Raw_assets_Size-1.50_MB-",
    );
  });

  it("omits the Measured Targets group when the run measured no target", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    // What the whole-repository run renders: one `Repository Size`, and no
    // second size figure beside it.
    expect(block).not.toContain("### Measured Targets");
    expect(block).toContain("![Repository Size]");
  });

  it("renders the same block twice for the same measurement", () => {
    const render = (): string =>
      service.renderBadges({
        destination: buildDestination("README.md"),
        scope: "repository",
        statistics: sampleStatistics,
        targets: [
          { bytes: 5324, compression: "gzip", name: "Compiled JavaScript" },
        ],
      });

    expect(render()).toBe(render());
  });

  it("returns false in check mode when no markers exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(readmePath, "# Project\n", "utf8");

    expect(
      service.sync({
        check: true,
        destination: buildDestination(readmePath),
        scope: "repository",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toBe(false);
  });

  it("returns true when block is already current in check mode", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    writeFileSync(
      readmePath,
      `# Project\n\n<!-- CODE_STATISTICS_START -->\n\n${block}\n<!-- CODE_STATISTICS_END -->\n`,
      "utf8",
    );

    expect(
      service.sync({
        check: true,
        destination: buildDestination(readmePath),
        scope: "repository",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toBe(true);
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

    expect(
      service.sync({
        check: true,
        destination: buildDestination(readmePath),
        scope: "repository",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toBe(false);
  });

  it("creates a new README when the file does not exist", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const readmePath = path.join(temporaryDirectory, "README.md");

    expect(
      service.sync({
        check: false,
        destination: buildDestination(readmePath),
        scope: "repository",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toBe(true);

    const written = readFileSync(readmePath, "utf8");

    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
  });

  it("splices the block between configured custom markers", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const markdownPath = path.join(temporaryDirectory, "METRICS.md");
    const destination = buildDestination(markdownPath, {
      endMarker: "<!-- stats:end -->",
      startMarker: "<!-- stats:start -->",
    });

    writeFileSync(
      markdownPath,
      "# Metrics\n\n<!-- stats:start -->\nold\n<!-- stats:end -->\n",
      "utf8",
    );

    service.sync({
      check: false,
      destination,
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    const written = readFileSync(markdownPath, "utf8");

    expect(written).toContain("<!-- stats:start -->");
    expect(written).not.toContain("\nold\n");
    expect(written).not.toContain("CODE_STATISTICS_START");
    expect(
      service.sync({
        check: true,
        destination,
        scope: "repository",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toBe(true);
  });

  it("renders through a configured render function", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const markdownPath = path.join(temporaryDirectory, "METRICS.md");

    service.sync({
      check: false,
      destination: buildDestination(markdownPath, {
        description: "Counted by hand.",
        render: (renderArguments) =>
          `${renderArguments.description ?? ""}\n\nLines: ${renderArguments.statistics.linesOfCode}`,
      }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    const written = readFileSync(markdownPath, "utf8");

    expect(written).toContain("Counted by hand.\n\nLines: 31");
    expect(written).toContain("<!-- CODE_STATISTICS_START -->");
    expect(written).not.toContain("img.shields.io");
  });

  it("hands a render function the built-in rendering to build on", () => {
    const block = service.renderBadges({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const markdownPath = path.join(temporaryDirectory, "METRICS.md");

    service.sync({
      check: false,
      destination: buildDestination(markdownPath, {
        render: (renderArguments) =>
          `## Metrics\n\n${renderArguments.renderBadges()}`,
      }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(readFileSync(markdownPath, "utf8")).toContain(
      `## Metrics\n\n${block}`,
    );
  });

  it("writes through a configured write function", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const chosenPath = path.join(temporaryDirectory, "chosen/report.md");

    const isCurrent = service.sync({
      check: false,
      destination: buildDestination(undefined, {
        write: (writeArguments) => {
          mkdirSync(path.dirname(chosenPath), { recursive: true });
          writeFileSync(
            chosenPath,
            writeArguments.anchors.wrapInAnchors(),
            "utf8",
          );
          return true;
        },
      }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(isCurrent).toBe(true);
    expect(readFileSync(chosenPath, "utf8")).toContain(
      "<!-- CODE_STATISTICS_START -->",
    );
  });

  it("lets a write function splice into a file it picks itself", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const chosenPath = path.join(temporaryDirectory, "DOCS.md");

    writeFileSync(chosenPath, "# Docs\n", "utf8");

    service.sync({
      check: false,
      destination: buildDestination(undefined, {
        write: (writeArguments) =>
          writeArguments.anchors.syncAnchoredBlock({ path: chosenPath }),
      }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    const written = readFileSync(chosenPath, "utf8");

    expect(written).toContain("# Docs");
    expect(written).toContain("![Lines of Code]");
  });

  it("reports a write function's false return as stale", () => {
    const isCurrent = service.sync({
      check: true,
      destination: buildDestination(undefined, { write: () => false }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(isCurrent).toBe(false);
  });

  it("throws when the anchor helper has no file to write", () => {
    expect(() =>
      service.sync({
        check: false,
        destination: buildDestination(undefined, {
          write: (writeArguments) => writeArguments.anchors.syncAnchoredBlock(),
        }),
        scope: "repository",
        statistics: sampleStatistics,
        targets: [],
      }),
    ).toThrow(MissingMarkdownPathError);
  });

  it("renders a document of badges with no anchor markers around it", () => {
    const document = service.renderDocument({
      description: "Repository statistics.",
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(
      document.startsWith("## ⏲️ Codometer\n\nRepository statistics.\n\n"),
    ).toBe(true);
    expect(document).toContain("![Lines of Code]");
    expect(document).not.toContain("<!-- CODE_STATISTICS_START -->");
  });

  it("renders a document with no description when none was configured", () => {
    const document = service.renderDocument({
      description: undefined,
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(document.startsWith("## ⏲️ Codometer\n\n### Repository")).toBe(true);
  });

  // What a splice would place, without placing it — the form a run that writes
  // nothing shows on the console.
  it("renders the anchored block without touching a file", () => {
    const block = service.renderBlock({
      destination: buildDestination("README.md"),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block.startsWith("<!-- CODE_STATISTICS_START -->")).toBe(true);
    expect(block.endsWith("<!-- CODE_STATISTICS_END -->")).toBe(true);
    expect(block).toContain("![Lines of Code]");
  });

  it("renders the anchored block through a configured render function", () => {
    const block = service.renderBlock({
      destination: buildDestination("README.md", {
        render: () => "## Metrics",
      }),
      scope: "repository",
      statistics: sampleStatistics,
      targets: [],
    });

    expect(block).toContain("## Metrics");
    expect(block).not.toContain("![Lines of Code]");
  });

  it("writes a whole document, creating missing parent directories", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const documentPath = path.join(temporaryDirectory, "docs/metrics.md");

    expect(
      service.syncDocument({
        check: false,
        content: "# Metrics",
        path: documentPath,
      }),
    ).toBe(true);
    expect(readFileSync(documentPath, "utf8")).toBe("# Metrics\n");
    expect(loggerService.info).toHaveBeenCalledWith(
      "📝 Wrote the markdown badges",
      undefined,
      { path: documentPath },
    );
  });

  it.each([
    ["# Metrics\n", true],
    ["# Stale\n", false],
  ])("checks a document holding %j as current=%s", (existing, isCurrent) => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);
    const documentPath = path.join(temporaryDirectory, "metrics.md");

    writeFileSync(documentPath, existing, "utf8");

    expect(
      service.syncDocument({
        check: true,
        content: "# Metrics",
        path: documentPath,
      }),
    ).toBe(isCurrent);
  });

  it("reports a document that does not exist as stale", () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);

    expect(
      service.syncDocument({
        check: true,
        content: "# Metrics",
        path: path.join(temporaryDirectory, "absent.md"),
      }),
    ).toBe(false);
  });
});
