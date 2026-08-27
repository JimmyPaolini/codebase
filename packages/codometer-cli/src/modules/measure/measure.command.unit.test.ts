import { ConfigurationService, InputService } from "@codometer/configuration";
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

import { buildCodeStatistics, throwUnknown } from "../../../testing/mocks";
import { DeliveryService } from "../delivery/delivery.service";
import { ReportService } from "../report/report.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import { MeasureCommand } from "./measure.command";
import { MeasureService } from "./measure.service";

import type { EvaluatedLimit } from "../limits/limits.types";
import type { DocumentationMeasurement } from "./documentation-measurement.types";
import type { MeasureCommandOptions } from "./measure.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";
import type { JsonService, MarkdownService } from "@codometer/output";
import type { MockInstance } from "vitest";

const statistics = buildCodeStatistics();

/** Builds a limit that came out over its value. */
function buildBreach(severity: EvaluatedLimit["severity"]): EvaluatedLimit {
  return {
    breached: true,
    label: "Bundle",
    limit: 4000,
    measured: 4529,
    metric: "size",
    severity,
    target: "compiled",
  };
}

/** Builds a resolved configuration with no output destination. */
function buildConfiguration(
  output: Partial<ResolvedCodometerConfiguration["output"]> = {},
): ResolvedCodometerConfiguration {
  return {
    defaultTarget: undefined,
    documentation: { default: 6, kinds: {}, severity: "fail", unit: "lines" },
    exclude: ["**/node_modules/**"],
    excludeFrom: [],
    limits: [],
    output: { json: undefined, markdown: undefined, ...output },
    python: { command: "python3" },
    statistics: [],
    targets: [],
  };
}

/** Builds a documented declaration whose comment exceeded its kind's limit. */
function buildDocumentationBreach(
  severity: DocumentationMeasurement["severity"],
): DocumentationMeasurement {
  return {
    breached: true,
    declaration: "Foo",
    file: "src/foo.ts",
    kind: "class",
    limit: 6,
    line: 3,
    measured: 9,
    severity,
    target: "codebase",
    unit: "lines",
  };
}

const markdownDestination = {
  description: undefined,
  endMarker: "<!-- CODE_STATISTICS_END -->",
  path: "README.md",
  render: undefined,
  startMarker: "<!-- CODE_STATISTICS_START -->",
  write: undefined,
};

const jsonDestination = { indentation: 2, path: "output/codometer.json" };

describe(MeasureCommand, () => {
  let command: MeasureCommand;
  let configurationService: ConfigurationService;
  let measureService: MeasureService;
  let loggerService: LoggerService;
  let jsonService: JsonService;
  let markdownService: MarkdownService;
  let stdoutWriteSpy: MockInstance<typeof process.stdout.write>;

  /** Builds a command whose measurement and output are mocked. */
  function buildCommand(): MeasureCommand {
    return new MeasureCommand(
      configurationService,
      measureService,
      new DeliveryService(jsonService, markdownService),
      new ReportService(),
      new RunPlanService(),
      new InputService(),
      loggerService,
    );
  }

  /** Runs the command over a repository at `/repo`. */
  async function run(options: MeasureCommandOptions = {}): Promise<void> {
    await buildCommand().run([], { directory: "/repo", ...options });
  }

  /** Reports the limits the measurement found breached. */
  function measured(limits: EvaluatedLimit[]): void {
    vi.mocked(measureService.measure).mockReturnValue({
      documentation: [],
      failures: [],
      indexes: new Map(),
      limits,
      statistics,
      targets: [],
    });
  }

  /** Reports the documentation measurements the run found. */
  function documented(documentation: DocumentationMeasurement[]): void {
    vi.mocked(measureService.measure).mockReturnValue({
      documentation,
      failures: [],
      indexes: new Map(),
      limits: [],
      statistics,
      targets: [],
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeasureCommand,
        InputService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: MeasureService, useValue: createMock<MeasureService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: DeliveryService, useValue: createMock<DeliveryService>() },
        { provide: ReportService, useValue: new ReportService() },
        { provide: RunPlanService, useValue: new RunPlanService() },
      ],
    }).compile();

    command = await module.resolve(MeasureCommand);
  });

  beforeEach(() => {
    process.exitCode = 0;
    configurationService = createMock<ConfigurationService>();
    measureService = createMock<MeasureService>();
    loggerService = createMock<LoggerService>();
    jsonService = createMock<JsonService>();
    markdownService = createMock<MarkdownService>();
    stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration(),
    );
    measured([]);
    vi.mocked(jsonService.render).mockReturnValue("{}\n");
    vi.mocked(jsonService.sync).mockReturnValue(true);
    vi.mocked(markdownService.renderBlock).mockReturnValue("block");
    vi.mocked(markdownService.renderDocument).mockReturnValue("document");
    vi.mocked(markdownService.renderDocumentationSection).mockReturnValue("");
    vi.mocked(markdownService.sync).mockReturnValue(true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    process.exitCode = 0;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeasureCommand,
        InputService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: MeasureService, useValue: createMock<MeasureService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: DeliveryService, useValue: createMock<DeliveryService>() },
        { provide: ReportService, useValue: new ReportService() },
        { provide: RunPlanService, useValue: new RunPlanService() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("MeasureCommand");
  });

  describe("the flag table", () => {
    beforeEach(() => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({ markdown: markdownDestination }),
      );
      vi.mocked(markdownService.sync).mockReturnValue(false);
      measured([buildBreach("fail")]);
    });

    it("writes nothing and fails nothing with no flags", async () => {
      await run();

      expect(markdownService.sync).not.toHaveBeenCalled();
      expect(stdoutWriteSpy).toHaveBeenCalledWith("block\n");
      expect(process.exitCode).toBe(0);
    });

    it("fails on a breach and not on staleness with --check limits", async () => {
      await run({ check: "limits" });

      expect(markdownService.sync).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Breached a failing limit",
        undefined,
        { limits: [buildBreach("fail")] },
      );
      expect(loggerService.error).not.toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        expect.anything(),
      );
    });

    it("fails on staleness and not on a breach with --check reports", async () => {
      measured([buildBreach("fail")]);

      await run({ check: "reports" });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: true,
        destination: { ...markdownDestination, path: "/repo/README.md" },
        scope: "project",
        statistics,
        targets: [],
      });
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        { paths: ["/repo/README.md"] },
      );
      expect(process.exitCode).toBe(1);
    });

    it("fails on staleness and on a breach with --check reports,limits", async () => {
      await run({ check: "reports,limits" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        { paths: ["/repo/README.md"] },
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Breached a failing limit",
        undefined,
        { limits: [buildBreach("fail")] },
      );
      expect(process.exitCode).toBe(1);
    });

    // The badge block is what carries a project's compressed size, so what a
    // target measured has to reach the renderer — and a target the run
    // measured no size for has to not, rather than arriving as a zero.
    it("hands the renderer the size of every target it measured", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        documentation: [],
        failures: [],
        indexes: new Map(),
        limits: [],
        statistics,
        targets: [
          {
            documentation: [],
            files: 5,
            language: undefined,
            name: "Compiled JavaScript",
            size: { bytes: 5324, compression: "gzip", files: 5 },
          },
          {
            documentation: [],
            files: 0,
            language: undefined,
            name: "Unsized",
            size: undefined,
          },
        ],
      });

      await run({ write: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: { ...markdownDestination, path: "/repo/README.md" },
        scope: "project",
        statistics,
        targets: [
          { bytes: 5324, compression: "gzip", name: "Compiled JavaScript" },
        ],
      });
    });

    // A target measured before its build lands matches nothing and sizes at
    // zero bytes. Declaring a limit turns that into a failure, but a target
    // that declares none would otherwise publish `0.00 kB gzip` into a README
    // a release commits — a figure that is wrong rather than merely absent.
    it("hands the renderer nothing for a target whose globs matched no file", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        documentation: [],
        failures: [],
        indexes: new Map(),
        limits: [],
        statistics,
        targets: [
          {
            documentation: [],
            files: 0,
            language: undefined,
            name: "Compiled JavaScript",
            size: { bytes: 0, compression: "gzip", files: 0 },
          },
        ],
      });

      await run({ write: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: { ...markdownDestination, path: "/repo/README.md" },
        scope: "project",
        statistics,
        targets: [],
      });
    });

    it("writes and fails nothing with --write", async () => {
      await run({ write: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: { ...markdownDestination, path: "/repo/README.md" },
        scope: "project",
        statistics,
        targets: [],
      });
      expect(process.exitCode).toBe(0);
    });

    // Ordering is the whole point: the report has to exist even when the gate
    // trips. Asserted in time rather than by reading `run()`, so reordering
    // `deliver` after `reportFindings` breaks a test and not just a paragraph.
    it("writes every report before failing with --write --check limits", async () => {
      let exitCodeWhileWriting: null | number | string | undefined;
      let breachReportedWhileWriting = true;
      vi.mocked(markdownService.sync).mockImplementation(() => {
        exitCodeWhileWriting = process.exitCode;
        breachReportedWhileWriting =
          vi.mocked(loggerService).error.mock.calls.length > 0;
        return true;
      });

      await run({ check: "limits", write: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: { ...markdownDestination, path: "/repo/README.md" },
        scope: "project",
        statistics,
        targets: [],
      });
      // Nothing had failed the run yet at the moment the report was written.
      expect(breachReportedWhileWriting).toBe(false);
      expect(exitCodeWhileWriting).toBe(0);
      expect(process.exitCode).toBe(1);
    });
  });

  describe("flags it refuses", () => {
    it("refuses --write together with --check reports", async () => {
      await run({ check: "reports", write: true });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the command line",
        undefined,
        {
          reasons: [
            expect.stringContaining(
              "--write cannot be combined with --check reports",
            ) as string,
          ],
        },
      );
      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it("refuses a --check value it does not know, naming the ones it does", async () => {
      await run({ check: "everything" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the command line",
        undefined,
        {
          reasons: [
            '--check does not accept "everything". It takes a comma-separated set drawn from "limits" and "reports", as in "--check limits,reports".',
          ],
        },
      );
      expect(process.exitCode).toBe(1);
    });

    it("names every unknown --check value in one run", async () => {
      await run({ check: "everything,anything" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the command line",
        undefined,
        {
          reasons: [
            expect.stringContaining('does not accept "everything"') as string,
            expect.stringContaining('does not accept "anything"') as string,
          ],
        },
      );
    });

    it("refuses a configuration nothing can read", async () => {
      vi.mocked(configurationService.loadConfiguration).mockRejectedValue(
        new Error('Cannot read the limit on "size" from "8 K"'),
      );

      await run();

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the configuration",
        undefined,
        { reason: 'Cannot read the limit on "size" from "8 K"' },
      );
      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it("reports a non-Error thrown value as a plain string", async () => {
      vi.mocked(configurationService.loadConfiguration).mockImplementation(
        () => {
          throwUnknown("not an Error");
        },
      );

      await run();

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the configuration",
        undefined,
        { reason: "not an Error" },
      );
      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it("refuses a --check carrying no value at all", async () => {
      await run({ check: true });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the command line",
        undefined,
        {
          reasons: [expect.stringContaining("--check needs a value") as string],
        },
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe("the output sinks", () => {
    it("prints the badges when the run touches no file", async () => {
      await run();

      expect(markdownService.renderBlock).toHaveBeenCalledWith({
        destination: {
          description: undefined,
          endMarker: "<!-- CODE_STATISTICS_END -->",
          path: undefined,
          render: undefined,
          startMarker: "<!-- CODE_STATISTICS_START -->",
          write: undefined,
        },
        scope: "project",
        statistics,
        targets: [],
      });
      expect(stdoutWriteSpy).toHaveBeenCalledWith("block\n");
      expect(markdownService.sync).not.toHaveBeenCalled();
    });

    it("writes the badge block where --output-markdown named", async () => {
      await run({ outputMarkdown: "docs/metrics.md", write: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: { ...markdownDestination, path: "/repo/docs/metrics.md" },
        scope: "project",
        statistics,
        targets: [],
      });
    });

    it("prints nothing alongside a written file", async () => {
      await run({ outputMarkdown: "docs/metrics.md", write: true });

      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it("appends the breached documentation section to the badge block", async () => {
      const breach = buildDocumentationBreach("fail");
      documented([breach]);
      vi.mocked(markdownService.renderDocumentationSection).mockReturnValue(
        "### 📝 Documentation",
      );

      await run({ outputMarkdown: "docs/metrics.md", write: true });

      expect(markdownService.renderDocumentationSection).toHaveBeenCalledWith({
        breaches: [breach],
      });
      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: expect.objectContaining({
          path: "/repo/docs/metrics.md",
        }) as ResolvedCodometerMarkdownOutputConfiguration,
        scope: "project",
        statistics,
        targets: [],
      });
    });

    it("writes the report where --output-json named", async () => {
      await run({ outputJson: "reports/statistics.json", write: true });

      expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        indentation: 2,
        path: "/repo/reports/statistics.json",
        report: { documentation: [], failures: [], targets: [] },
      });
    });

    it("prints the report for --format json without writing one", async () => {
      await run({ format: "json" });

      expect(jsonService.sync).not.toHaveBeenCalled();
      expect(stdoutWriteSpy).toHaveBeenCalledWith("{}\n");
    });

    it("produces only the sink the command line named", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({
          json: jsonDestination,
          markdown: markdownDestination,
        }),
      );

      await run({ outputJson: "statistics.json", write: true });

      expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        indentation: 2,
        path: "/repo/statistics.json",
        report: { documentation: [], failures: [], targets: [] },
      });
      expect(markdownService.sync).not.toHaveBeenCalled();
    });

    it("writes the configured destinations relative to the analyzed directory", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({
          json: jsonDestination,
          markdown: markdownDestination,
        }),
      );

      await run({ write: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        destination: { ...markdownDestination, path: "/repo/README.md" },
        scope: "project",
        statistics,
        targets: [],
      });
      expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
        check: false,
        indentation: 2,
        path: "/repo/output/codometer.json",
        report: { documentation: [], failures: [], targets: [] },
      });
    });

    it("names a stale report the run was checking", async () => {
      vi.mocked(jsonService.sync).mockReturnValue(false);

      await run({ check: "reports", outputJson: "reports/statistics.json" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        { paths: ["/repo/reports/statistics.json"] },
      );
      expect(process.exitCode).toBe(1);
    });

    it("names a stale badge block the run was checking", async () => {
      vi.mocked(markdownService.sync).mockReturnValue(false);

      await run({ check: "reports", outputMarkdown: "docs/metrics.md" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        { paths: ["/repo/docs/metrics.md"] },
      );
      expect(process.exitCode).toBe(1);
    });

    it("keeps a configured write function as a destination of its own", async () => {
      const write = vi.fn(() => true);
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({
          markdown: { ...markdownDestination, path: undefined, write },
        }),
      );
      vi.mocked(markdownService.sync).mockReturnValue(false);

      await run({ check: "reports" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        { paths: ["markdown output"] },
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe("what it refuses to measure", () => {
    it("keeps every file it writes out of what it measures", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({
          json: jsonDestination,
          markdown: markdownDestination,
        }),
      );

      await run({ write: true });

      expect(measureService.measure).toHaveBeenCalledExactlyOnceWith({
        configuration: expect.anything() as ResolvedCodometerConfiguration,
        outputPaths: ["output/codometer.json", "README.md"],
        workingDirectory: "/repo",
      });
    });

    it("says on the console which files it left out", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({ markdown: markdownDestination }),
      );

      await run();

      expect(loggerService.info).toHaveBeenCalledWith(
        "📊 Excluded the files codometer writes from what it measures",
        undefined,
        { paths: ["README.md"] },
      );
    });

    it("says nothing about excluded files when it writes nothing at all", async () => {
      await run();

      expect(loggerService.info).not.toHaveBeenCalledWith(
        "📊 Excluded the files codometer writes from what it measures",
        undefined,
        expect.anything(),
      );
    });
  });

  describe("what it reports", () => {
    it("reports a warn breach without touching the exit code", async () => {
      measured([buildBreach("warn")]);

      await run({ check: "limits" });

      expect(loggerService.warn).toHaveBeenCalledWith(
        "📊 Breached a warning limit",
        undefined,
        { limits: [buildBreach("warn")] },
      );
      expect(process.exitCode).toBe(0);
    });

    it("reports a fail breach without failing a run that gates nothing", async () => {
      measured([buildBreach("fail")]);

      await run();

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Breached a failing limit",
        undefined,
        { limits: [buildBreach("fail")] },
      );
      expect(process.exitCode).toBe(0);
    });

    it("tells staleness and a breach apart in what it prints", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration({ markdown: markdownDestination }),
      );
      vi.mocked(markdownService.sync).mockReturnValue(false);
      measured([buildBreach("fail")]);

      await run({ check: "reports,limits" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        { paths: ["/repo/README.md"] },
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Breached a failing limit",
        undefined,
        { limits: [buildBreach("fail")] },
      );
    });

    it("fails a gating run on a failing documentation breach", async () => {
      documented([buildDocumentationBreach("fail")]);

      await run({ check: "limits" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Breached a documentation length limit",
        undefined,
        { documentation: [buildDocumentationBreach("fail")] },
      );
      expect(process.exitCode).toBe(1);
    });

    it("never fails on a warning documentation breach", async () => {
      documented([buildDocumentationBreach("warn")]);

      await run({ check: "limits" });

      expect(loggerService.warn).toHaveBeenCalledWith(
        "📊 Breached a documentation length limit",
        undefined,
        { documentation: [buildDocumentationBreach("warn")] },
      );
      expect(process.exitCode).toBe(0);
    });

    it("does not fail a failing documentation breach without --check limits", async () => {
      documented([buildDocumentationBreach("fail")]);

      await run();

      expect(process.exitCode).toBe(0);
    });

    it("reports what it could not measure and fails a gating run", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        documentation: [],
        failures: [{ kind: "target", reason: "dist/ is gone", subject: "web" }],
        indexes: new Map(),
        limits: [],
        statistics,
        targets: [],
      });

      await run({ check: "limits" });

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Failed to measure part of the run",
        undefined,
        {
          failures: [
            { kind: "target", reason: "dist/ is gone", subject: "web" },
          ],
        },
      );
      expect(process.exitCode).toBe(1);
    });

    it("reports what it could not measure without failing a bare run", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        documentation: [],
        failures: [{ kind: "target", reason: "dist/ is gone", subject: "web" }],
        indexes: new Map(),
        limits: [],
        statistics,
        targets: [],
      });

      await run();

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Failed to measure part of the run",
        undefined,
        expect.anything(),
      );
      expect(process.exitCode).toBe(0);
    });
  });

  describe("what it announces", () => {
    it("debug-logs the start of the run with the resolved directory", async () => {
      await run();

      expect(loggerService.debug).toHaveBeenCalledWith(
        "🚀 Started the measurement run",
        undefined,
        { directory: "/repo" },
      );
    });

    it("debug-logs the configuration it loaded", async () => {
      await run({ config: "codometer.config.ts" });

      expect(loggerService.debug).toHaveBeenCalledWith(
        "🗂️ Loaded the configuration",
        undefined,
        { configuredPath: "codometer.config.ts" },
      );
    });

    it("logs completion on a fully clean run", async () => {
      await run();

      expect(loggerService.info).toHaveBeenCalledWith(
        "✅ Finished the measurement run",
        undefined,
        { breachCount: 0, targetCount: 0 },
      );
    });

    it("counts every target measured and every limit breached at completion", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        documentation: [],
        failures: [],
        indexes: new Map(),
        limits: [buildBreach("fail"), buildBreach("warn")],
        statistics,
        targets: [
          {
            documentation: [],
            files: 5,
            language: undefined,
            name: "Compiled JavaScript",
            size: { bytes: 5324, compression: "gzip", files: 5 },
          },
        ],
      });

      await run();

      expect(loggerService.info).toHaveBeenCalledWith(
        "✅ Finished the measurement run",
        undefined,
        { breachCount: 2, targetCount: 1 },
      );
    });
  });

  describe("the flags themselves", () => {
    it("defaults directory to process cwd", () => {
      expect(buildCommand().parseDirectory(undefined)).toBe(process.cwd());
    });

    it("defaults directory to process cwd for a valueless --directory", () => {
      // A valueless optional flag reaches commander as `true` and skips the
      // parser, so the boolean arrives here by way of `run`.
      expect(buildCommand().parseDirectory(true)).toBe(process.cwd());
    });

    it("passes an explicit configuration path through to the loader", async () => {
      await run({ config: "configuration/codometer.config.ts" });

      expect(configurationService.loadConfiguration).toHaveBeenCalledWith({
        configurationPath: "configuration/codometer.config.ts",
        searchDirectory: "/repo",
      });
    });

    it("returns the parsed value for every path flag", () => {
      const localCommand = buildCommand();

      expect(localCommand.parseCheck("limits")).toBe("limits");
      expect(localCommand.parseConfig("codometer.config.ts")).toBe(
        "codometer.config.ts",
      );
      expect(localCommand.parseConfig(undefined)).toBeUndefined();
      expect(localCommand.parseFormat("json")).toBe("json");
      expect(localCommand.parseOutputJson("statistics.json")).toBe(
        "statistics.json",
      );
      expect(localCommand.parseOutputMarkdown("README.md")).toBe("README.md");
      expect(localCommand.parseWrite(undefined)).toBe(true);
      expect(localCommand.parseWrite(false)).toBe(false);
    });

    it("registers each CLI flag through the Option decorator", () => {
      const flags = [
        "parseCheck",
        "parseConfig",
        "parseDirectory",
        "parseFormat",
        "parseOutputJson",
        "parseOutputMarkdown",
        "parseWrite",
      ].map(
        (parser) =>
          Reflect.getMetadata(
            "CommandBuilder:Option:Meta",
            Reflect.get(MeasureCommand.prototype, parser) as object,
          ) as undefined | { flags: string },
      );

      expect(flags.map((option) => option?.flags)).toStrictEqual([
        "--check [check]",
        "--config [config]",
        "-d, --directory [directory]",
        "-f, --format <format>",
        "--output-json <outputJson>",
        "--output-markdown <outputMarkdown>",
        "--write",
      ]);
    });
  });
});
