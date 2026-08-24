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

import { buildCallGraphResult, buildStackFrame } from "../../../testing/mocks";
import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";
import { MarkdownReportService } from "../report/markdown-report.service";
import { MermaidReportService } from "../report/mermaid-report.service";
import { ReportService } from "../report/report.service";

import { CallidescopeCommand } from "./callidescope.command";
import { CallidescopeService } from "./callidescope.service";
import { RunPlanService } from "./run-plan.service";

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
    ignoreCallees: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 3,
      maximumDepth: 6,
      maximumImplementationCandidates: 8,
      minimumCallers: 2,
      spreadThreshold: 4,
    },
    output: {
      format: "markdown",
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
      projectReadmes: undefined,
    },
    projects: [],
    ...overrides,
  };
}

/** Builds an empty report for one named project. */
function buildProjectReport(projectName: string): ProjectReport {
  return {
    callableBreadths: [],
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
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let outputJsonService: ReturnType<typeof createMock<OutputJsonService>>;
  let outputMarkdownService: ReturnType<
    typeof createMock<OutputMarkdownService>
  >;

  /** Configures a report destination, the one output every mode can reach. */
  function configureJsonDestination(): void {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: { indentation: 2, path: "output/report.json" },
          markdown: undefined,
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
  }

  /** Points the trace at a result holding one stack past the limit. */
  function stubDeepStack(): void {
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
  }

  /** Points the trace at a result holding one callable past the breadth limit. */
  function stubWideCallable(): void {
    stubTrace(
      buildCallGraphResult({
        wideCallables: [
          {
            breadth: 5,
            callees: [],
            displayName: "example",
            id: "packages/example/src/example.ts#0",
            limit: 3,
            location: {
              column: 1,
              filePath: "packages/example/src/example.ts",
              line: 1,
            },
            signature: undefined,
          },
        ],
      }),
    );
  }

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
          useValue: new MarkdownReportService(
            new MermaidReportService(),
            new ReportService(),
          ),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        RunPlanService,
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
    logger = createMock<LoggerService>();
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
          useValue: new MarkdownReportService(
            new MermaidReportService(),
            new ReportService(),
          ),
        },
        { provide: LoggerService, useValue: logger },
        RunPlanService,
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
          useValue: new MarkdownReportService(
            new MermaidReportService(),
            new ReportService(),
          ),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        RunPlanService,
      ],
    }).compile();

    // Resolved first: the context is set by the constructor, so nothing has
    // happened to the logger until the command itself exists.
    await module.resolve(CallidescopeCommand);

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CallidescopeCommand");
  });

  // 🎛️ Option parsing

  it("keeps the check set exactly as it was written", () => {
    expect(command.parseCheck("depth,reports")).toBe("depth,reports");
  });

  it("reads a valueless write flag as asking to write", () => {
    expect(command.parseWrite(undefined)).toBe(true);
  });

  it("keeps a written write flag as it was given", () => {
    expect(command.parseWrite(false)).toBe(false);
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

  it("logs the start of a trace with the resolved workspace root", async () => {
    await command.run([], { directory: "." });

    expect(logger.debug).toHaveBeenCalledWith(
      "🔭 Starting a call-stack trace",
      undefined,
      { format: undefined, workspaceRoot: path.resolve(".") },
    );
  });

  it("logs the finish of a trace with its findings", async () => {
    stubDeepStack();

    await command.run([], {});

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Finished a call-stack trace",
      undefined,
      { deepStackCount: 1, staleReportCount: 0, wideCallableCount: 0 },
    );
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
          mermaid: undefined,
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
    ["mermaid", "mermaid"],
    [undefined, "markdown"],
    ["nonsense", "markdown"],
  ] as const)("parses the format flag %s as %s", (value, expected) => {
    expect(command.parseFormat(value)).toBe(expected);
  });

  it("prints a diagram when the format asks for mermaid", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "mermaid",
          json: undefined,
          markdown: undefined,
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    stubTrace(
      buildCallGraphResult({
        deepStacks: [
          {
            depth: 2,
            entryPointKind: "decorated-method",
            frames: [
              buildStackFrame({ displayName: "Resolver.read", id: "a" }),
              buildStackFrame({ displayName: "Service.load", id: "b" }),
            ],
            isLowerBound: false,
            limit: 1,
          },
        ],
      }),
    );

    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await command.run([], {});

    const printed = String(write.mock.calls[0]?.[0] ?? "");

    expect(printed).toContain("```mermaid");
    expect(printed).toContain("flowchart LR");
    expect(printed).toContain("n0 --> n1");
  });

  it("writes the diagram destination alongside the markdown one", async () => {
    const destination = {
      description: undefined,
      endMarker: "<!-- END -->",
      path: "DIAGRAM.md",
      render: undefined,
      startMarker: "<!-- START -->",
      write: undefined,
    };

    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: { ...destination, path: "REPORT.md" },
          mermaid: destination,
          projectReadmes: undefined,
        },
      }),
    );
    outputMarkdownService.sync.mockReturnValue(true);

    await command.run([], { write: true });

    const written = outputMarkdownService.sync.mock.calls.map(
      ([call]) => call.destination.path,
    );

    expect(written).toStrictEqual(["REPORT.md", "DIAGRAM.md"]);
  });

  it("draws the stacks in the diagram destination and prints them in the other", async () => {
    const destination = {
      description: undefined,
      endMarker: "<!-- END -->",
      path: "DIAGRAM.md",
      render: undefined,
      startMarker: "<!-- START -->",
      write: undefined,
    };

    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: { ...destination, path: "REPORT.md" },
          mermaid: destination,
          projectReadmes: undefined,
        },
      }),
    );
    outputMarkdownService.sync.mockReturnValue(true);
    stubTrace(
      buildCallGraphResult({
        deepStacks: [
          {
            depth: 2,
            entryPointKind: "decorated-method",
            frames: [
              buildStackFrame({ displayName: "Resolver.read", id: "a" }),
              buildStackFrame({ displayName: "Service.load", id: "b" }),
            ],
            isLowerBound: false,
            limit: 1,
          },
        ],
      }),
    );

    await command.run([], { write: true });

    const [report, diagram] = outputMarkdownService.sync.mock.calls.map(
      ([call]) => call.content,
    );

    expect(report).toContain("```text");
    expect(report).not.toContain("```mermaid");
    expect(diagram).toContain("```mermaid");
  });

  it("writes a section into every traced project's README", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: undefined,
          mermaid: undefined,
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

    await command.run([], { write: true });

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
          mermaid: undefined,
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

    await command.run([], { write: true });

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
          mermaid: undefined,
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

    await command.run([], { check: "reports" });

    expect(process.exitCode).toBe(1);
  });

  it("leaves the exit code alone when nothing was found", async () => {
    await command.run([], {});

    expect(process.exitCode).toBeUndefined();
  });

  it("fails when a stack exceeded the limit", async () => {
    stubDeepStack();

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBe(1);
  });

  it("names a stack that is too deep as its own finding", async () => {
    stubDeepStack();

    await command.run([], { check: "depth" });

    // Never worded as staleness: one says the code calls too far down, the
    // other says the checkout has not caught up, and they are fixed
    // differently.
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Found call stacks too deep",
      undefined,
      expect.objectContaining({ count: 1, deepest: 9 }),
    );
  });

  it("passes over a stack that is too deep when only reports are checked", async () => {
    stubDeepStack();

    await command.run([], { check: "reports" });

    expect(process.exitCode).toBeUndefined();
  });

  // 🌐 The breadth gate

  it("fails when a callable exceeded the breadth limit", async () => {
    stubWideCallable();
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        limits: { ...buildConfiguration().limits, maximumBreadth: 3 },
      }),
    );

    await command.run([], { check: "breadth" });

    expect(process.exitCode).toBe(1);
  });

  it("names a callable that calls too much directly as its own finding", async () => {
    stubWideCallable();
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        limits: { ...buildConfiguration().limits, maximumBreadth: 3 },
      }),
    );

    await command.run([], { check: "breadth" });

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Found callables calling too much directly",
      undefined,
      expect.objectContaining({ count: 1, widest: 5 }),
    );
  });

  it("passes over a wide callable when only depth is checked", async () => {
    stubWideCallable();
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        limits: { ...buildConfiguration().limits, maximumBreadth: 3 },
      }),
    );

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBeUndefined();
  });

  it("refuses to check breadth when no limit is configured", async () => {
    await command.run([], { check: "breadth" });

    expect(process.exitCode).toBe(1);
    expect(callidescopeService.trace).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected the configuration",
      undefined,
      {
        reasons: [
          "--check breadth requires limits.maximumBreadth to be set. Add `limits: { maximumBreadth: <number> }` to your callidescope.config.ts before running --check breadth.",
        ],
        workspaceRoot: path.resolve("."),
      },
    );
  });

  it("traces normally when breadth is configured but not checked", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        limits: { ...buildConfiguration().limits, maximumBreadth: 3 },
      }),
    );

    await command.run([], {});

    expect(callidescopeService.trace).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it("reads no destination when only depth is checked", async () => {
    configureJsonDestination();
    // The committed report is out of date, which is what a pull request whose
    // call graph has moved looks like. The depth gate has no opinion about it.
    outputJsonService.sync.mockReturnValue(false);

    await command.run([], { check: "depth" });

    expect(outputJsonService.sync).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it("leaves every configured destination alone on a bare run", async () => {
    configureJsonDestination();

    await command.run([], {});

    expect(outputJsonService.sync).not.toHaveBeenCalled();
  });

  it("refuses a check flag carrying no value", async () => {
    await command.run([], { check: true });

    expect(process.exitCode).toBe(1);
    expect(callidescopeService.trace).not.toHaveBeenCalled();
  });

  it("refuses an empty check set", async () => {
    await command.run([], { check: "" });

    expect(process.exitCode).toBe(1);
    expect(callidescopeService.trace).not.toHaveBeenCalled();
  });

  it("refuses a check name it does not accept, and says what it takes", async () => {
    await command.run([], { check: "limits" });

    expect(process.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected the command line",
      undefined,
      {
        reasons: [
          `--check does not accept "limits". It takes a comma-separated set drawn from "breadth" and "depth" and "reports", as in "--check breadth,depth,reports".`,
        ],
      },
    );
  });

  it("refuses writing and checking reports in one run", async () => {
    await command.run([], { check: "reports", write: true });

    expect(process.exitCode).toBe(1);
    expect(callidescopeService.trace).not.toHaveBeenCalled();
  });

  it("writes a JSON report when a path is configured", async () => {
    configurationService.loadConfiguration.mockResolvedValue(
      buildConfiguration({
        output: {
          format: "markdown",
          json: { indentation: 2, path: "output/report.json" },
          markdown: undefined,
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.sync.mockReturnValue(true);

    await command.run([], { write: true });

    expect(outputJsonService.sync).toHaveBeenCalledTimes(1);
  });

  it("prefers the JSON path a flag names over the configured one", async () => {
    outputJsonService.sync.mockReturnValue(true);

    await command.run([], { json: "flagged.json", write: true });

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
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputMarkdownService.sync.mockReturnValue(true);

    await command.run([], { markdown: "flagged.md", write: true });

    expect(outputMarkdownService.sync.mock.calls[0]?.[0].destination.path).toBe(
      "flagged.md",
    );
  });

  it("writes nothing when no destination is configured", async () => {
    await command.run([], { write: true });

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
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.sync.mockReturnValue(false);

    await command.run([], { check: "reports" });

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
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputMarkdownService.sync.mockReturnValue(false);

    await command.run([], { check: "reports" });

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
          mermaid: undefined,
          projectReadmes: undefined,
        },
      }),
    );
    outputJsonService.sync.mockReturnValue(true);

    await command.run([], { write: true });

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
