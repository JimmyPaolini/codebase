import { ConfigurationService } from "@codometer/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { buildCodeStatistics } from "../../../testing/mocks";
import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";

import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const statistics = buildCodeStatistics();

/** Builds a resolved configuration with no output destination. */
function buildConfiguration(
  output: Partial<ResolvedCodometerConfiguration["output"]> = {},
): ResolvedCodometerConfiguration {
  return {
    exclude: ["**/node_modules/**"],
    excludeFrom: [],
    output: { json: undefined, markdown: undefined, ...output },
    python: { command: "python3" },
    statistics: [],
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

describe(CodometerCommand, () => {
  let command: CodometerCommand;
  let configurationService: ConfigurationService;
  let codometerService: CodometerService;
  let loggerService: LoggerService;
  let outputJsonService: OutputJsonService;
  let outputMarkdownService: OutputMarkdownService;

  /** Builds a command whose dependencies are all mocked. */
  function buildCommand(): CodometerCommand {
    return new CodometerCommand(
      configurationService,
      codometerService,
      outputJsonService,
      outputMarkdownService,
      loggerService,
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: CodometerService, useValue: createMock<CodometerService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: OutputJsonService,
          useValue: createMock<OutputJsonService>(),
        },
        {
          provide: OutputMarkdownService,
          useValue: createMock<OutputMarkdownService>(),
        },
      ],
    }).compile();

    command = await module.resolve(CodometerCommand);
  });

  beforeEach(() => {
    configurationService = createMock<ConfigurationService>();
    codometerService = createMock<CodometerService>();
    loggerService = createMock<LoggerService>();
    outputJsonService = createMock<OutputJsonService>();
    outputMarkdownService = createMock<OutputMarkdownService>();
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration(),
    );
    vi.mocked(codometerService.measure).mockReturnValue(statistics);
    vi.mocked(outputJsonService.sync).mockReturnValue(true);
    vi.mocked(outputMarkdownService.sync).mockReturnValue(true);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: CodometerService, useValue: createMock<CodometerService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: OutputJsonService,
          useValue: createMock<OutputJsonService>(),
        },
        {
          provide: OutputMarkdownService,
          useValue: createMock<OutputMarkdownService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CodometerCommand");
  });

  it("parses check values from boolean and string inputs", () => {
    const localCommand = buildCommand();

    expect(localCommand.parseCheck(true)).toBe(true);
    expect(localCommand.parseCheck("true")).toBe(true);
    expect(localCommand.parseCheck("false")).toBe(false);
    // A valueless `--check` reaches the parser as undefined, and the parser
    // runs only when the flag is present. Reading that as false is what made
    // check mode rewrite the README and exit 0 instead of failing.
    expect(localCommand.parseCheck(undefined)).toBe(true);
  });

  it("defaults directory to process cwd", () => {
    const localCommand = buildCommand();

    expect(localCommand.parseDirectory(undefined)).toBe(process.cwd());
  });

  it("passes the configured exclusions to the measurement", async () => {
    const localCommand = buildCommand();
    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockReturnValue(true);

    await localCommand.run([], { check: false, directory: "/repo" });

    expect(configurationService.loadConfiguration).toHaveBeenCalledWith({
      configurationPath: undefined,
      searchDirectory: "/repo",
    });
    expect(codometerService.measure).toHaveBeenCalledWith({
      configuration: buildConfiguration(),
      workingDirectory: "/repo",
    });

    stdoutWriteSpy.mockRestore();
  });

  it("writes json statistics to stdout when nothing is configured", async () => {
    const localCommand = buildCommand();
    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockReturnValue(true);

    await localCommand.run([], { check: false, directory: "/repo" });

    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      `${JSON.stringify(statistics, null, 2)}\n`,
    );
    expect(outputMarkdownService.sync).not.toHaveBeenCalled();
    expect(outputJsonService.sync).not.toHaveBeenCalled();

    stdoutWriteSpy.mockRestore();
  });

  it("writes both configured destinations relative to the analyzed directory", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({
        json: jsonDestination,
        markdown: markdownDestination,
      }),
    );
    const localCommand = buildCommand();

    await localCommand.run([], { check: false, directory: "/repo" });

    expect(outputMarkdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "/repo/README.md" },
      statistics,
    });
    expect(outputJsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...jsonDestination, path: "/repo/output/codometer.json" },
      statistics,
    });
  });

  it("lets command-line paths override the configured destinations", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({ markdown: markdownDestination }),
    );
    const localCommand = buildCommand();

    await localCommand.run([], {
      directory: "/repo",
      json: "reports/statistics.json",
      markdown: "docs/metrics.md",
    });

    expect(outputMarkdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "/repo/docs/metrics.md" },
      statistics,
    });
    expect(outputJsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { indentation: 2, path: "/repo/reports/statistics.json" },
      statistics,
    });
  });

  it("writes only the JSON report when no markdown destination exists", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({ json: jsonDestination }),
    );
    const localCommand = buildCommand();

    await localCommand.run([], { check: false, directory: "/repo" });

    expect(outputMarkdownService.sync).not.toHaveBeenCalled();
    expect(outputJsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...jsonDestination, path: "/repo/output/codometer.json" },
      statistics,
    });
  });

  it("applies the default markers to a path passed on the command line", async () => {
    const localCommand = buildCommand();

    await localCommand.run([], {
      directory: "/repo",
      markdown: "docs/metrics.md",
    });

    expect(outputMarkdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "/repo/docs/metrics.md" },
      statistics,
    });
  });

  it("flags stale output and exits non-zero in check mode", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({ markdown: markdownDestination }),
    );
    vi.mocked(outputMarkdownService.sync).mockReturnValue(false);
    const localCommand = buildCommand();
    process.exitCode = 0;

    await localCommand.run([], {
      check: true,
      directory: "/repo",
    });

    expect(outputMarkdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: true,
      destination: { ...markdownDestination, path: "/repo/README.md" },
      statistics,
    });
    expect(loggerService.error).toHaveBeenCalledWith(
      "📊 Found stale statistics",
      undefined,
      { paths: ["/repo/README.md"] },
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = 0;
  });

  it("keeps a configured write function as a destination of its own", async () => {
    const write = vi.fn(() => true);
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({
        markdown: { ...markdownDestination, path: undefined, write },
      }),
    );
    // The writer belongs to the destination the command hands over; whether it
    // reported the file current is the output service's answer, not its own.
    vi.mocked(outputMarkdownService.sync).mockReturnValue(false);
    const localCommand = buildCommand();
    process.exitCode = 0;

    await localCommand.run([], { check: true, directory: "/repo" });

    expect(outputMarkdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: true,
      destination: { ...markdownDestination, path: undefined, write },
      statistics,
    });
    expect(loggerService.error).toHaveBeenCalledWith(
      "📊 Found stale statistics",
      undefined,
      { paths: ["markdown output"] },
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = 0;
  });

  it("names every stale destination in check mode", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({
        json: jsonDestination,
        markdown: markdownDestination,
      }),
    );
    vi.mocked(outputMarkdownService.sync).mockReturnValue(false);
    vi.mocked(outputJsonService.sync).mockReturnValue(false);
    const localCommand = buildCommand();
    process.exitCode = 0;

    await localCommand.run([], { check: true, directory: "/repo" });

    expect(loggerService.error).toHaveBeenCalledWith(
      "📊 Found stale statistics",
      undefined,
      { paths: ["/repo/README.md", "/repo/output/codometer.json"] },
    );
    expect(process.exitCode).toBe(1);

    process.exitCode = 0;
  });

  it("does not set an exit code when the output is current in check mode", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({ markdown: markdownDestination }),
    );
    const localCommand = buildCommand();
    process.exitCode = 0;

    await localCommand.run([], { check: true, directory: "/repo" });

    expect(process.exitCode).toBe(0);
  });

  it("writes when the check flag is absent entirely", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
      buildConfiguration({ markdown: markdownDestination }),
    );
    const localCommand = buildCommand();

    // nest-commander omits the key rather than passing false, so this is the
    // ordinary `nx run codebase:codometer` path, not an edge case.
    await localCommand.run([], { directory: "/repo" });

    expect(outputMarkdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "/repo/README.md" },
      statistics,
    });
  });

  it("passes an explicit configuration path through to the loader", async () => {
    const localCommand = buildCommand();
    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockReturnValue(true);

    await localCommand.run([], {
      config: "configuration/codometer.config.ts",
      directory: "/repo",
    });

    expect(configurationService.loadConfiguration).toHaveBeenCalledWith({
      configurationPath: "configuration/codometer.config.ts",
      searchDirectory: "/repo",
    });

    stdoutWriteSpy.mockRestore();
  });

  it("returns the parsed value for every optional path flag", () => {
    const localCommand = buildCommand();

    expect(localCommand.parseConfig("codometer.config.ts")).toBe(
      "codometer.config.ts",
    );
    expect(localCommand.parseConfig(undefined)).toBeUndefined();
    expect(localCommand.parseJson("statistics.json")).toBe("statistics.json");
    expect(localCommand.parseJson(undefined)).toBeUndefined();
    expect(localCommand.parseMarkdown("README.md")).toBe("README.md");
    expect(localCommand.parseMarkdown(undefined)).toBeUndefined();
  });

  it("registers each CLI flag through the Option decorator", () => {
    const flags = [
      "parseCheck",
      "parseConfig",
      "parseDirectory",
      "parseJson",
      "parseMarkdown",
    ].map(
      (parser) =>
        Reflect.getMetadata(
          "CommandBuilder:Option:Meta",
          Reflect.get(CodometerCommand.prototype, parser) as object,
        ) as undefined | { flags: string },
    );

    expect(flags.map((option) => option?.flags)).toStrictEqual([
      "--check",
      "--config [config]",
      "-d, --directory [directory]",
      "--json [json]",
      "-m, --markdown [markdown]",
    ]);
  });
});
