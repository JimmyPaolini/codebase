import path from "node:path";

import {
  ConfigurationService,
  InputError,
  InputService,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "@callidescope/configuration";
import { AddressService, ProgramConfigurationError } from "@callidescope/graph";
import {
  MarkdownReportService,
  MermaidReportService,
  OutputJsonService,
  OutputMarkdownService,
  ReportService,
  WorkspaceReportService,
} from "@callidescope/output";
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
import { ReportFindingsService } from "../report-findings/report-findings.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import { CallidescopeCommand } from "./callidescope.command";
import { buildUnknownCommandMessage } from "./callidescope.constants";
import { CallidescopeService } from "./callidescope.service";

import type {
  CallGraphResult,
  ProjectLimits,
  ProjectLimitsLookup,
  ProjectReport,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { UnresolvedEntryPointAddress } from "@callidescope/graph";

/** Builds a resolved configuration with no destinations configured. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    directories: [],
    entryPoints: {
      addresses: [],
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
    workspaceStructure: {
      modulesDirectory: "modules",
      rootModuleSegment: "src",
    },
    ...overrides,
  };
}

/** Builds the summary of a run that collected nothing at all. */
function buildEmptySummary(): CallGraphResult["summary"] {
  return {
    callableCount: 0,
    cyclicComponentCount: 0,
    edgeCount: 0,
    entryPointCount: 0,
    fileCount: 0,
    maximumDepth: 0,
    projectCount: 0,
    unresolvedCallCount: 0,
  };
}

/** A project's own limits, inheriting depth and declaring no breadth. */
function buildProjectLimits(
  overrides: Partial<ProjectLimits> = {},
): ProjectLimits {
  return {
    maximumBreadth: undefined,
    maximumDepth: { origin: "inherited", path: undefined, value: 6 },
    ...overrides,
  };
}

/** A lookup naming every project a run reached, declaring no breadth anywhere. */
function buildProjectLimitsLookup(
  byProject: ReadonlyMap<string, ProjectLimits> = new Map(),
): ProjectLimitsLookup {
  return { byProject, workspace: buildProjectLimits() };
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
  let inputService: InputService;
  let logger: ReturnType<typeof createMock<LoggerService>>;
  let outputJsonService: ReturnType<typeof createMock<OutputJsonService>>;
  let outputMarkdownService: ReturnType<
    typeof createMock<OutputMarkdownService>
  >;

  /** Configures a report destination, the one output every mode can reach. */
  function configureJsonDestination(): void {
    stubConfiguration(
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

  /**
   * Points the loader at a resolved configuration, as if it had read a file.
   *
   * The file-aware load rather than the plain one, because the run carries the
   * path it read forward: the trace resolves a configuration beside every
   * project it reaches and skips whichever file is already the run's own.
   */
  function stubConfiguration(
    configuration: ResolvedCallidescopeConfiguration,
  ): void {
    configurationService.loadConfigurationFile.mockResolvedValue({
      authored: {},
      configuration,
      path: undefined,
    });
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

  /**
   * Points the trace at a result holding one callable past the breadth
   * limit, and at the "example" project having declared that limit itself.
   */
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
      buildProjectLimitsLookup(
        new Map([
          [
            "example",
            buildProjectLimits({
              maximumBreadth: {
                origin: "declared",
                path: "packages/example/callidescope.config.ts",
                value: 3,
              },
            }),
          ],
        ]),
      ),
    );
  }

  /** Points the trace at a prepared result. */
  function stubTrace(
    result: CallGraphResult = buildCallGraphResult(),
    projectLimits: ProjectLimitsLookup = buildProjectLimitsLookup(),
  ): void {
    callidescopeService.trace.mockResolvedValue({
      projectLimits,
      projectNames: ["example"],
      result,
      startingProjectRoots: new Map([["example", "packages/example"]]),
      unresolvedAddresses: [],
    });
  }

  /** Points the trace at a result carrying declared addresses that did not resolve. */
  function stubUnresolvedEntryPointAddresses(
    unresolvedAddresses: readonly UnresolvedEntryPointAddress[],
  ): void {
    callidescopeService.trace.mockResolvedValue({
      projectLimits: buildProjectLimitsLookup(),
      projectNames: ["example"],
      result: buildCallGraphResult(),
      startingProjectRoots: new Map([["example", "packages/example"]]),
      unresolvedAddresses,
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
            new WorkspaceReportService(),
          ),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        AddressService,
        InputService,
        ReportFindingsService,
        RunPlanService,
      ],
    }).compile();

    command = await module.resolve(CallidescopeCommand);

    // Every write goes through the report service, and a real terminal would
    // otherwise fill with output while these run.
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(async () => {
    configurationService = createMock<ConfigurationService>();
    callidescopeService = createMock<CallidescopeService>();
    inputService = new InputService();
    logger = createMock<LoggerService>();
    outputJsonService = createMock<OutputJsonService>();
    outputMarkdownService = createMock<OutputMarkdownService>();
    // Not a terminal by default, so a test that does not opt into prompting
    // exercises what a scripted run gets.
    process.stdin.isTTY = false;

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
            new WorkspaceReportService(),
          ),
        },
        { provide: LoggerService, useValue: logger },
        { provide: InputService, useValue: inputService },
        AddressService,
        ReportFindingsService,
        RunPlanService,
      ],
    }).compile();

    command = await module.resolve(CallidescopeCommand);
    stubConfiguration(buildConfiguration());
    stubTrace();
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
    process.stdin.isTTY = originalIsTty;
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
            new WorkspaceReportService(),
          ),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        AddressService,
        InputService,
        ReportFindingsService,
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

  it("splits the directories flag on commas", () => {
    expect(command.parseDirectories("alpha, beta")).toStrictEqual([
      "alpha",
      "beta",
    ]);
  });

  it("reads an absent directories flag as every project", () => {
    expect(command.parseDirectories(undefined)).toStrictEqual([]);
  });

  it("drops empty entries from the directories flag", () => {
    expect(command.parseDirectories("alpha,,beta,")).toStrictEqual([
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

  it("refuses a positional argument rather than tracing anyway", async () => {
    // This is the default command, so a word commander could not match as a
    // subcommand arrives here as an operand. Tracing the whole workspace and
    // reporting success would be a worse answer to a typo than the
    // `unknown command` it replaced.
    await command.run(["deep"], {});

    expect(callidescopeService.trace).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected the command line",
      undefined,
      { reason: buildUnknownCommandMessage("deep") },
    );
  });

  it("logs the start of a trace with the working directory as its root", async () => {
    await command.run([], {});

    expect(logger.debug).toHaveBeenCalledWith(
      "🔭 Starting a call-stack trace",
      undefined,
      { format: undefined, workspaceRoot: process.cwd() },
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
    stubConfiguration(
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
    stubConfiguration(
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
      heading: "# 🔭 Callidescope",
      path: "DIAGRAM.md",
      render: undefined,
      startMarker: "<!-- START -->",
      write: undefined,
    };

    stubConfiguration(
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
      heading: "# 🔭 Callidescope",
      path: "DIAGRAM.md",
      render: undefined,
      startMarker: "<!-- START -->",
      write: undefined,
    };

    stubConfiguration(
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

  it("writes a section into every scoped project's README", async () => {
    stubConfiguration(
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
    // The second project is reported but not scoped — a dependency the run
    // measured through its closure. Publishing covers what a run was pointed
    // at, so no section is addressed to that project's README.
    stubTrace(
      buildCallGraphResult({
        projects: [
          buildProjectReport("example"),
          buildProjectReport("dependency"),
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
    stubConfiguration(
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
    stubConfiguration(
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

    await command.run([], { check: "breadth" });

    expect(process.exitCode).toBe(1);
  });

  it("names a callable that calls too much directly as its own finding", async () => {
    stubWideCallable();

    await command.run([], { check: "breadth" });

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Found callables calling too much directly",
      undefined,
      expect.objectContaining({ count: 1, widest: 5 }),
    );
  });

  it("passes over a wide callable when only depth is checked", async () => {
    stubWideCallable();

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBeUndefined();
  });

  it("refuses to check breadth when no project in scope declares a limit", async () => {
    // The default from `stubTrace` in `beforeEach`: a trace that reached one
    // project, and that project declared no breadth limit of its own.
    await command.run([], { check: "breadth" });

    expect(process.exitCode).toBe(1);
    // Unlike a command-line mistake, this is only known once the trace has
    // resolved which projects were even reached.
    expect(callidescopeService.trace).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected the configuration",
      undefined,
      {
        reasons: [
          "--check breadth requires at least one project in scope to declare limits.maximumBreadth. Add `limits: { maximumBreadth: <number> }` to that project's callidescope.config.ts before running --check breadth.",
        ],
        workspaceRoot: path.resolve("."),
      },
    );
  });

  it("does not let a project's own breadth limit gate a run that never asked for it", async () => {
    stubTrace(
      buildCallGraphResult(),
      buildProjectLimitsLookup(
        new Map([
          [
            "example",
            buildProjectLimits({
              maximumBreadth: {
                origin: "declared",
                path: "packages/example/callidescope.config.ts",
                value: 3,
              },
            }),
          ],
        ]),
      ),
    );

    await command.run([], {});

    expect(callidescopeService.trace).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it("gates breadth for a project that declared a limit alongside one that did not", async () => {
    // The easy way to get this wrong: refusing the whole run because
    // "packages/undeclared" named no limit, instead of noticing that
    // "example" named one and letting the run through to judge it.
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
      buildProjectLimitsLookup(
        new Map([
          [
            "example",
            buildProjectLimits({
              maximumBreadth: {
                origin: "declared",
                path: "packages/example/callidescope.config.ts",
                value: 3,
              },
            }),
          ],
          ["packages/undeclared", buildProjectLimits()],
        ]),
      ),
    );

    await command.run([], { check: "breadth" });

    expect(process.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Found callables calling too much directly",
      undefined,
      expect.objectContaining({ count: 1, widest: 5 }),
    );
  });

  // 🕳️ A run that traced nothing

  it("fails a run that collected no callables at all", async () => {
    // What an aborted trace looks like from here, and what used to exit 0:
    // the whole workspace produced nothing, so every gate above passed for
    // having nothing to judge.
    stubTrace(buildCallGraphResult({ summary: buildEmptySummary() }));

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBe(1);
  });

  it("names an empty trace as its own finding", async () => {
    stubTrace(buildCallGraphResult({ summary: buildEmptySummary() }));

    await command.run([], { check: "depth" });

    expect(logger.error).toHaveBeenCalledWith("🔭 Traced nothing", undefined, {
      projectCount: 0,
    });
  });

  it("fails a run that traced nothing even when no check was asked for", async () => {
    // Not something `--check` turns on: a bare `--write` that traced nothing
    // would otherwise publish an empty report over a real one.
    stubTrace(buildCallGraphResult({ summary: buildEmptySummary() }));

    await command.run([], {});

    expect(process.exitCode).toBe(1);
  });

  // 🚧 A project that could not be read

  /** Points the trace at a project whose configuration will not parse. */
  function stubUnreadableProject(): void {
    callidescopeService.trace.mockImplementation(() => {
      throw new ProgramConfigurationError({
        configurationPath: "packages/broken/tsconfig.json",
        messages: ["Argument for '--target' option must be: 'es6'"],
      });
    });
  }

  it("fails a run whose trace hit a project it could not read", async () => {
    stubUnreadableProject();

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBe(1);
  });

  it("names the project it could not read", async () => {
    stubUnreadableProject();

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project it could not read",
      undefined,
      {
        reason:
          "Could not read packages/broken/tsconfig.json: Argument for '--target' option must be: 'es6'",
      },
    );
  });

  it("writes no destination when a project could not be read", async () => {
    // The whole reason this ends the trace rather than stepping over it:
    // destinations are written before findings are weighed, so a partial
    // graph would be published and only then reported as a failure.
    configureJsonDestination();
    stubUnreadableProject();

    await command.run([], { write: true });

    expect(outputJsonService.sync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  // 🚧 A project configuration that was refused

  /** Points the trace at a project configuration reading raised. */
  function stubUnreadableProjectConfiguration(): void {
    callidescopeService.trace.mockImplementation(() => {
      throw new ProjectConfigurationError({
        cause: new Error("Unexpected token"),
        configurationPath: "packages/broken/callidescope.config.ts",
        project: "broken",
      });
    });
  }

  /** Points the trace at a project configuration setting a workspace-only field. */
  function stubDisallowedProjectConfigurationField(): void {
    callidescopeService.trace.mockImplementation(() => {
      throw new ProjectConfigurationFieldNotPermittedError({
        field: "limits",
        project: "broken",
      });
    });
  }

  it("fails a run whose trace hit a project configuration it could not read", async () => {
    stubUnreadableProjectConfiguration();

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBe(1);
  });

  it("names the project configuration it could not read", async () => {
    stubUnreadableProjectConfiguration();

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          "Failed to read the callidescope configuration for broken at packages/broken/callidescope.config.ts: Unexpected token",
      },
    );
  });

  it("writes no destination when a project configuration could not be read", async () => {
    configureJsonDestination();
    stubUnreadableProjectConfiguration();

    await command.run([], { write: true });

    expect(outputJsonService.sync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("fails a run whose trace hit a project configuration setting a field it may not", async () => {
    stubDisallowedProjectConfigurationField();

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBe(1);
  });

  it("names the project configuration field it may not set", async () => {
    stubDisallowedProjectConfigurationField();

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          "broken sets limits, which only the workspace configuration may set. A project configuration may set entryPoints, exclude, limits.maximumBreadth, and limits.maximumDepth.",
      },
    );
  });

  // 🚧 A declared entry point that failed to resolve

  it("fails a run whose trace declared an address that resolved to nothing", async () => {
    stubUnresolvedEntryPointAddresses([
      {
        address: "packages/broken/src/gone.service.ts#GoneService.run",
        projectName: "broken",
        resolution: { kind: "not-found" },
      },
    ]);

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBe(1);
  });

  it("names the project and the address of a declared entry point that resolves to nothing", async () => {
    stubUnresolvedEntryPointAddresses([
      {
        address: "packages/broken/src/gone.service.ts#GoneService.run",
        projectName: "broken",
        resolution: { kind: "not-found" },
      },
    ]);

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          'broken declares an entryPoints.addresses entry that resolves to nothing: "packages/broken/src/gone.service.ts#GoneService.run". Check the file path and the qualified name callidescope prints for it in a stack.',
      },
    );
  });

  it("prints every candidate with its line for a declared address that names more than one callable", async () => {
    stubUnresolvedEntryPointAddresses([
      {
        address: "packages/broken/src/handlers.ts#handle",
        projectName: "broken",
        resolution: {
          candidates: [
            {
              id: "packages/broken/src/handlers.ts#120",
              location: {
                column: 3,
                filePath: "packages/broken/src/handlers.ts",
                line: 12,
              },
            },
            {
              id: "packages/broken/src/handlers.ts#340",
              location: {
                column: 3,
                filePath: "packages/broken/src/handlers.ts",
                line: 34,
              },
            },
          ],
          kind: "ambiguous",
        },
      },
    ]);

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          'broken declares an entryPoints.addresses entry that matches more than one declaration: "packages/broken/src/handlers.ts#handle". Candidates: packages/broken/src/handlers.ts#handle:12, packages/broken/src/handlers.ts#handle:34. Add ":<line>" to the address to pick one.',
      },
    );
  });

  it("names the column of each candidate when an ambiguous address's candidates share a line", async () => {
    stubUnresolvedEntryPointAddresses([
      {
        address: "packages/broken/src/handlers.ts#handle:12",
        projectName: "broken",
        resolution: {
          candidates: [
            {
              id: "packages/broken/src/handlers.ts#120",
              location: {
                column: 3,
                filePath: "packages/broken/src/handlers.ts",
                line: 12,
              },
            },
            {
              id: "packages/broken/src/handlers.ts#148",
              location: {
                column: 31,
                filePath: "packages/broken/src/handlers.ts",
                line: 12,
              },
            },
          ],
          kind: "ambiguous",
        },
      },
    ]);

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          'broken declares an entryPoints.addresses entry that matches more than one declaration: "packages/broken/src/handlers.ts#handle:12". Candidates: packages/broken/src/handlers.ts#handle:12 (column 3), packages/broken/src/handlers.ts#handle:12 (column 31). Two declarations on one line cannot be told apart by ":<line>" — rename one, or name a different callable.',
      },
    );
  });

  it("names the project for an invalid address that project declared", async () => {
    stubUnresolvedEntryPointAddresses([
      {
        address: "not-an-address",
        projectName: "broken",
        resolution: { kind: "invalid", reason: 'It needs a "#".' },
      },
    ]);

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          'broken declares an invalid entryPoints.addresses entry. It needs a "#".',
      },
    );
  });

  it("names the workspace configuration for an invalid address it declared, alongside every other unresolved address", async () => {
    stubUnresolvedEntryPointAddresses([
      {
        address: "not-an-address",
        projectName: undefined,
        resolution: {
          kind: "invalid",
          reason:
            '"not-an-address" is not a callable address. It needs a file path and a qualified name joined by "#", as in "src/foo.service.ts#FooService.bar", optionally followed by ":<line>" to disambiguate.',
        },
      },
      {
        address: "packages/broken/src/gone.service.ts#GoneService.run",
        projectName: "broken",
        resolution: { kind: "not-found" },
      },
    ]);

    await command.run([], {});

    expect(logger.error).toHaveBeenCalledWith(
      "🔭 Rejected a project configuration",
      undefined,
      {
        reason:
          '2 declared entry points did not resolve. (1) the workspace configuration declares an invalid entryPoints.addresses entry. "not-an-address" is not a callable address. It needs a file path and a qualified name joined by "#", as in "src/foo.service.ts#FooService.bar", optionally followed by ":<line>" to disambiguate. (2) broken declares an entryPoints.addresses entry that resolves to nothing: "packages/broken/src/gone.service.ts#GoneService.run". Check the file path and the qualified name callidescope prints for it in a stack.',
      },
    );
  });

  it("writes no destination when a declared entry point does not resolve", async () => {
    configureJsonDestination();
    stubUnresolvedEntryPointAddresses([
      {
        address: "packages/broken/src/gone.service.ts#GoneService.run",
        projectName: "broken",
        resolution: { kind: "not-found" },
      },
    ]);

    await command.run([], { write: true });

    expect(outputJsonService.sync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("leaves a run whose declared addresses all resolve unaffected", async () => {
    stubUnresolvedEntryPointAddresses([]);

    await command.run([], { check: "depth" });

    expect(process.exitCode).toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
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
    stubConfiguration(
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
            heading: "# 🔭 Callidescope",
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
    stubConfiguration(
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
    stubConfiguration(
      buildConfiguration({
        output: {
          format: "markdown",
          json: undefined,
          markdown: {
            description: undefined,
            endMarker: "<!-- END -->",
            heading: "# 🔭 Callidescope",
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
    stubConfiguration(
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

  it("traces only the directories a flag named", async () => {
    await command.run([], { directories: ["alpha"] });

    expect(
      callidescopeService.trace.mock.calls[0]?.[0].directories,
    ).toStrictEqual(["alpha"]);
  });

  it("loads the configuration file a flag named", async () => {
    await command.run([], { config: "custom.config.ts" });

    expect(
      configurationService.loadConfigurationFile.mock.calls[0]?.[0]
        ?.configurationPath,
    ).toBe("custom.config.ts");
  });

  // 🗣️ Prompting

  it("prompts for a format when it was left off, at a terminal", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(inputService, "promptForSelect").mockResolvedValue("json");

    await command.run([], {});

    expect(inputService.promptForSelect).toHaveBeenCalledWith({
      choices: ["markdown", "mermaid", "json"],
      message: "Which output format?",
      subject: "An output format (--format)",
    });
    // The prompted format reached `run` through the resolved options: json
    // routes through the JSON report rather than the markdown one.
    expect(outputJsonService.buildReport).toHaveBeenCalledTimes(1);
  });

  it("does not prompt for a format that was already given", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(inputService, "promptForSelect");

    await command.run([], { format: "mermaid" });

    expect(inputService.promptForSelect).not.toHaveBeenCalled();
  });

  // The configuration declares a format, so a scripted run keeps working
  // rather than being refused over a flag it has never had to pass.
  it("traces without prompting for a format when stdin is not a terminal", async () => {
    vi.spyOn(inputService, "promptForSelect");

    await command.run([], {});

    expect(inputService.promptForSelect).not.toHaveBeenCalled();
    expect(callidescopeService.trace).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  // Escape at the prompt resolves it with nothing, which the input service
  // reports as a refused command line rather than a crash.
  it("reports a cancelled format prompt as a refused command line", async () => {
    process.stdin.isTTY = true;
    vi.spyOn(inputService, "promptForSelect").mockRejectedValue(
      new InputError("An output format (--format) was not answered."),
    );

    await command.run([], {});

    expect(process.exitCode).toBe(1);
    expect(callidescopeService.trace).not.toHaveBeenCalled();
  });

  // A genuine failure keeps its stack rather than being reported to the
  // reader as a command line they mistyped.
  it("lets a failure that is not a refused command line propagate", async () => {
    callidescopeService.trace.mockImplementation(() => {
      throw new Error("Trace failed.");
    });

    await expect(command.run([], {})).rejects.toThrow("Trace failed.");
  });
});
