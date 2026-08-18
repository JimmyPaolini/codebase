import path from "node:path";

import { ConfigurationService } from "@callidescope/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import { buildCallGraphResult } from "../../../testing/mocks";
import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";
import { MarkdownReportService } from "../report/markdown-report.service";
import { ReportService } from "../report/report.service";

import { CallidescopeCommand } from "./callidescope.command";
import { CallidescopeService } from "./callidescope.service";

import type {
  CallGraphResult,
  ProjectReport,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** Builds a resolved configuration with no destinations configured. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    entryPoints: {
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeFrom: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 3,
      maximumDepth: 6,
      maximumImplementationFanOut: 8,
      minimumCallers: 2,
      spreadThreshold: 4,
    },
    output: {
      format: "markdown",
      json: undefined,
      markdown: undefined,
      projectReadmes: undefined,
    },
    projects: [],
    ...overrides,
  };
}

/** Builds an empty report for one named project. */
function buildProjectReport(projectName: string): ProjectReport {
  return {
    misplacedCallables: [],
    moduleSpreads: [],
    projectName,
    stacks: [],
    summary: {
      callableCount: 0,
      cyclicComponentCount: 0,
      edgeCount: 0,
      entryPointCount: 0,
      fileCount: 0,
      maximumDepth: 0,
      projectCount: 1,
      unresolvedCallCount: 0,
    },
    typeDepths: [],
  };
}

describe(CallidescopeCommand, () => {
  let command: CallidescopeCommand;
  let configurationService: ReturnType<typeof createMock<ConfigurationService>>;
  let callidescopeService: ReturnType<typeof createMock<CallidescopeService>>;
  let outputJsonService: ReturnType<typeof createMock<OutputJsonService>>;
  let outputMarkdownService: ReturnType<
    typeof createMock<OutputMarkdownService>
  >;

  /** Points the trace at a prepared result. */
  function stubTrace(result: CallGraphResult = buildCallGraphResult()): void {
    callidescopeService.trace.mockReturnValue({
      projectNames: ["example"],
      projectRoots: new Map([["example", "packages/example"]]),
      result,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CallidescopeCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: CallidescopeService,
          useValue: createMock<CallidescopeService>(),
        },
        {
          provide: OutputJsonService,
          useValue: createMock<OutputJsonService>(),
        },
        {
          provide: OutputMarkdownService,
          useValue: createMock<OutputMarkdownService>(),
        },
        {
          provide: MarkdownReportService,
          useValue: new MarkdownReportService(new ReportService()),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(CallidescopeCommand);

    // Every write goes through the report service, and a real terminal would
    // otherwise fill with output while these run.
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  beforeEach(async () => {
    configurationService = createMock<ConfigurationService>();
    callidescopeService = createMock<CallidescopeService>();
    outputJsonService = createMock<OutputJsonService>();
    outputMarkdownService = createMock<OutputMarkdownService>();

    const module = await Test.createTestingModule({
      providers: [
        CallidescopeCommand,
        { provide: ConfigurationService, useValue: configurationService },
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: OutputJsonService, useValue: outputJsonService },
        { provide: OutputMarkdownService, useValue: outputMarkdownService },
        {
          provide: MarkdownReportService,
          useValue: new MarkdownReportService(new ReportService()),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(CallidescopeCommand);
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration(),
    );
    stubTrace();
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CallidescopeCommand,
        { provide: ConfigurationService, useValue: configurationService },
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: OutputJsonService, useValue: outputJsonService },
        { provide: OutputMarkdownService, useValue: outputMarkdownService },
        {
          provide: MarkdownReportService,
          useValue: new MarkdownReportService(new ReportService()),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    // Resolved first: the context is set by the constructor, so nothing has
    // happened to the logger until the command itself exists.
    await module.resolve(CallidescopeCommand);

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CallidescopeCommand");
  });

  // 🎛️ Option parsing

  it("treats a valueless check flag as turning check mode on", () => {
    expect(command.parseCheck(undefined)).toBe(true);
  });

  it("lets check mode be turned off explicitly", () => {
    expect(command.parseCheck("false")).toBe(false);
  });

  it("resolves a relative directory to an absolute path", () => {
    // Everything downstream compares absolute paths against this prefix, so a
    // relative root reads as a workspace containing nothing at all.
    expect(path.isAbsolute(command.parseDirectory("."))).toBe(true);
  });

  it("defaults the directory to the working directory", () => {
    expect(command.parseDirectory(undefined)).toBe(path.resolve(process.cwd()));
  });

  it("splits the projects flag on commas", () => {
    expect(command.parseProjects("alpha, beta")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("reads an absent projects flag as every project", () => {
    expect(command.parseProjects(undefined)).toStrictEqual([]);
  });

  it("drops empty entries from the projects flag", () => {
    expect(command.parseProjects("alpha,,beta,")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it.each([
    ["parseConfig", "callidescope.config.ts"],
    ["parseJson", "output/report.json"],
    ["parseMarkdown", "REPORT.md"],
  ] as const)("passes %s through unchanged", (method, value) => {
    expect(command[method](value)).toBe(value);
  });

  // 🏃 Running

  it("traces the workspace and prints a report", async () => {
    await command.run([], {});

    expect(callidescopeService.trace).toHaveBeenCalledTimes(1);
    // One write: the report is a single rendered document now.
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
  });

  it("prints markdown by default", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await command.run([], {});

    const printed = String(write.mock.calls[0]?.[0] ?? "");

    expect(printed).toContain("# 🔭 Callidescope");
    expect(printed).toContain("| Measure | Value |");
  });

  it("prints json when the format asks for it", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "json",
          json: undefined,
          markdown: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.buildReport.mockReturnValue('{"summary":{}}\n');

    await command.run([], {});

    expect(outputJsonService.buildReport).toHaveBeenCalledTimes(1);
  });

  it("prefers the format a flag names over the configured one", async () => {
    outputJsonService.buildReport.mockReturnValue("{}\n");

    await command.run([], { format: "json" });

    expect(outputJsonService.buildReport).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["json", "json"],
    ["markdown", "markdown"],
    [undefined, "markdown"],
    ["nonsense", "markdown"],
  ] as const)("parses the format flag %s as %s", (value, expected) => {
    expect(command.parseFormat(value)).toBe(expected);
  });

  it("writes a section into every traced project's README", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: undefined,
          projectReadmes: {
            endMarker: "<!-- END -->",
            heading: "## 🔭 Callidescope",
            previewCount: 3,
            startMarker: "<!-- START -->",
          },
        },
      }),
    );
    outputMarkdownService.syncProjectReadmes.mockReturnValue([]);
    stubTrace(
      buildCallGraphResult({
        projects: [
          buildProjectReport("example"),
          buildProjectReport("untraced"),
        ],
      }),
    );

    await command.run([], {});

    const [sent] = outputMarkdownService.syncProjectReadmes.mock.calls[0] ?? [];

    expect(sent?.sections.map((section) => section.path)).toStrictEqual([
      path.join("packages/example", "README.md"),
    ]);
  });

  it("addresses a section to the README of the project it describes", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: undefined,
          projectReadmes: {
            endMarker: "<!-- END -->",
            heading: "## 🔭 Callidescope",
            previewCount: 3,
            startMarker: "<!-- START -->",
          },
        },
      }),
    );
    outputMarkdownService.syncProjectReadmes.mockReturnValue([]);
    stubTrace(
      buildCallGraphResult({ projects: [buildProjectReport("example")] }),
    );

    await command.run([], {});

    const [sent] = outputMarkdownService.syncProjectReadmes.mock.calls[0] ?? [];

    expect(sent?.sections[0]?.content).toContain("## 🔭 Callidescope");
    expect(sent?.sections[0]?.content).toContain("`example`");
  });

  it("fails when a project README is stale in check mode", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: undefined,
          projectReadmes: {
            endMarker: "<!-- END -->",
            heading: "## 🔭 Callidescope",
            previewCount: 3,
            startMarker: "<!-- START -->",
          },
        },
      }),
    );
    outputMarkdownService.syncProjectReadmes.mockReturnValue([
      "packages/example/README.md",
    ]);

    await command.run([], { check: true });

    expect(process.exitCode).toBe(1);
  });

  it("leaves the exit code alone when nothing was found", async () => {
    await command.run([], {});

    expect(process.exitCode).toBeUndefined();
  });

  it("fails when a stack exceeded the limit", async () => {
    stubTrace(
      buildCallGraphResult({
        deepStacks: [
          {
            depth: 9,
            entryPointKind: "orphan-root",
            frames: [],
            isLowerBound: false,
            limit: 6,
          },
        ],
      }),
    );

    await command.run([], {});

    expect(process.exitCode).toBe(1);
  });

  it("writes a JSON report when a path is configured", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: { indentation: 2, path: "output/report.json" },
          markdown: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.sync.mockReturnValue(true);

    await command.run([], {});

    expect(outputJsonService.sync).toHaveBeenCalledTimes(1);
  });

  it("prefers the JSON path a flag names over the configured one", async () => {
    outputJsonService.sync.mockReturnValue(true);

    await command.run([], { json: "flagged.json" });

    expect(outputJsonService.sync.mock.calls[0]?.[0].destination).toStrictEqual(
      {
        indentation: 2,
        path: "flagged.json",
      },
    );
  });

  it("prefers the markdown path a flag names over the configured one", async () => {
    configurationService.resolveConfiguration.mockReturnValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: {
            description: undefined,
            endMarker: "<!-- END -->",
            path: "flagged.md",
            render: undefined,
            startMarker: "<!-- START -->",
            write: undefined,
          },
          projectReadmes: undefined,
        },
      }),
    );
    outputMarkdownService.sync.mockReturnValue(true);

    await command.run([], { markdown: "flagged.md" });

    expect(outputMarkdownService.sync.mock.calls[0]?.[0].destination.path).toBe(
      "flagged.md",
    );
  });

  it("writes nothing when no destination is configured", async () => {
    await command.run([], {});

    expect(outputJsonService.sync).not.toHaveBeenCalled();
    expect(outputMarkdownService.sync).not.toHaveBeenCalled();
  });

  it("fails when a configured report is stale in check mode", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: { indentation: 2, path: "output/report.json" },
          markdown: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.sync.mockReturnValue(false);

    await command.run([], { check: true });

    expect(process.exitCode).toBe(1);
  });

  it("fails when a configured markdown block is stale in check mode", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: {
            description: undefined,
            endMarker: "<!-- END -->",
            path: "REPORT.md",
            render: undefined,
            startMarker: "<!-- START -->",
            write: undefined,
          },
          projectReadmes: undefined,
        },
      }),
    );
    outputMarkdownService.sync.mockReturnValue(false);

    await command.run([], { check: true });

    expect(process.exitCode).toBe(1);
  });

  it("does not force check mode on a plain run", async () => {
    // Calling the parser again here would turn every run into a check, which
    // is why `run` reads the raw option instead.
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: { indentation: 2, path: "output/report.json" },
          markdown: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.sync.mockReturnValue(true);

    await command.run([], {});

    expect(outputJsonService.sync.mock.calls[0]?.[0].check).toBe(false);
  });

  it("traces only the projects a flag named", async () => {
    await command.run([], { projects: ["alpha"] });

    expect(
      callidescopeService.trace.mock.calls[0]?.[0].projectNames,
    ).toStrictEqual(["alpha"]);
  });

  it("loads the configuration file a flag named", async () => {
    await command.run([], { config: "custom.config.ts" });

    expect(
      configurationService.loadConfiguration.mock.calls[0]?.[0]
        ?.configurationPath,
    ).toBe("custom.config.ts");
  });
});
