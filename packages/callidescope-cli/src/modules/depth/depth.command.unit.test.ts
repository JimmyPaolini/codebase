import { InputService } from "@callidescope/configuration";
import { AddressDepthService } from "@callidescope/graph";
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

import { AddressLookupService } from "../address-lookup/address-lookup.service";
import { AddressReportService } from "../address-report/address-report.service";

import { DepthCommand } from "./depth.command";

import type { LocatedWorkspace } from "../address-lookup/address-lookup.types";
import type { LocateOutcome } from "../callidescope/callidescope.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

/** A resolved configuration with the defaults these tests assume. */
function buildConfiguration(): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    directories: [],
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
    workspaceStructure: {
      modulesDirectory: "modules",
      rootModuleSegment: "src",
    },
  };
}

/** An empty located outcome, for tests that only care about the resolution. */
function buildLocated(): LocateOutcome {
  return {
    callablesById: new Map(),
    graph: {
      calleeIdsByCaller: new Map(),
      callerIdsByCallee: new Map(),
      edges: [],
      unresolvedCallerIds: new Set(),
      unresolvedCalls: [],
    },
    projectRoots: new Map(),
  };
}

describe(DepthCommand, () => {
  let addressLookupService: ReturnType<typeof createMock<AddressLookupService>>;
  let addressReportService: ReturnType<typeof createMock<AddressReportService>>;
  let addressDepthService: ReturnType<typeof createMock<AddressDepthService>>;
  let command: DepthCommand;
  let inputService: InputService;
  let logger: ReturnType<typeof createMock<LoggerService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DepthCommand,
        {
          provide: AddressLookupService,
          useValue: createMock<AddressLookupService>(),
        },
        {
          provide: AddressReportService,
          useValue: createMock<AddressReportService>(),
        },
        {
          provide: AddressDepthService,
          useValue: createMock<AddressDepthService>(),
        },
        InputService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(DepthCommand);
  });

  beforeEach(() => {
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    addressDepthService = createMock<AddressDepthService>();
    logger = createMock<LoggerService>();
    inputService = new InputService();
    vi.spyOn(inputService, "canPrompt").mockReturnValue(false);

    command = new DepthCommand(
      addressLookupService,
      addressReportService,
      addressDepthService,
      inputService,
      logger,
    );

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
        DepthCommand,
        {
          provide: AddressLookupService,
          useValue: createMock<AddressLookupService>(),
        },
        {
          provide: AddressReportService,
          useValue: createMock<AddressReportService>(),
        },
        {
          provide: AddressDepthService,
          useValue: createMock<AddressDepthService>(),
        },
        InputService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DepthCommand");
  });

  // 🎛️ Option parsing

  it("delegates option parsing to the shared parsing service", () => {
    expect(command.parseFormat("json")).toBe("json");
    expect(command.parseDirectories("alpha,beta")).toStrictEqual([
      "alpha",
      "beta",
    ]);
    expect(command.parseConfig("callidescope.config.ts")).toBe(
      "callidescope.config.ts",
    );
  });

  it("parses the interactive opt-out flag", () => {
    expect(command.parseInteractive()).toBe(false);
  });

  // 🏃 Running

  it("rejects a run with no address", async () => {
    await command.run([], {});

    expect(process.exitCode).toBe(1);
    expect(addressLookupService.resolve).not.toHaveBeenCalled();
  });

  it("rejects a run whose address could not be resolved", async () => {
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run(["a.ts#Foo.bar"], {});

    expect(process.exitCode).toBe(1);
    expect(addressDepthService.buildDownwardStacks).not.toHaveBeenCalled();
  });

  it("traces both directions and prints the rendered report", async () => {
    const located = buildLocated();

    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located,
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({
      id: "a.ts#0",
      kind: "resolved",
    });
    addressLookupService.describeProblem.mockReturnValue(undefined);
    addressDepthService.buildDownwardStacks.mockReturnValue({
      stacks: [],
      truncated: false,
    });
    addressDepthService.buildUpwardStacks.mockReturnValue({
      stacks: [],
      truncated: false,
    });
    addressReportService.renderDepth.mockReturnValue("rendered depth\n");

    await command.run(["a.ts#Foo.bar"], {});

    expect(addressDepthService.buildDownwardStacks).toHaveBeenCalledWith({
      callablesById: located.callablesById,
      graph: located.graph,
      startId: "a.ts#0",
    });
    expect(addressDepthService.buildUpwardStacks).toHaveBeenCalledWith({
      callablesById: located.callablesById,
      graph: located.graph,
      startId: "a.ts#0",
    });
    expect(process.stdout.write).toHaveBeenCalledWith("rendered depth\n");
    expect(process.exitCode).toBeUndefined();
  });

  // 🗣️ Prompting

  it("prompts for the address when it is missing and the session can be prompted", async () => {
    vi.spyOn(inputService, "canPrompt").mockReturnValue(true);
    vi.spyOn(inputService, "promptForAutocomplete").mockResolvedValue(
      "a.ts#Foo.bar",
    );
    addressLookupService.listAddresses.mockReturnValue([
      "a.ts#Foo.bar",
      "b.ts#Bar.baz",
    ]);
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    // A format is passed explicitly so this test exercises only the address
    // prompt, not the separate format prompt `resolveOptions` would also try.
    await command.run([], { format: "markdown" });

    // The list it completes against is what the one trace found, so the
    // caller picks a callable that provably exists.
    expect(inputService.promptForAutocomplete).toHaveBeenCalledWith({
      message: "Which callable? (file#qualified-name)",
      suggestions: ["a.ts#Foo.bar", "b.ts#Bar.baz"],
    });
    expect(addressLookupService.resolve).toHaveBeenCalledWith({
      address: "a.ts#Foo.bar",
      workspace: expect.objectContaining({
        workspaceRoot: "/workspace",
      }) as LocatedWorkspace,
    });
  });

  it("does not prompt for the address when one was already given", async () => {
    vi.spyOn(inputService, "canPrompt").mockReturnValue(true);
    vi.spyOn(inputService, "promptForText");
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run(["a.ts#Foo.bar"], { format: "markdown" });

    expect(inputService.promptForText).not.toHaveBeenCalled();
  });

  it("prompts for a format when it was left off and the session can be prompted", async () => {
    vi.spyOn(inputService, "canPrompt").mockReturnValue(true);
    vi.spyOn(inputService, "promptForSelect").mockResolvedValue("json");
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run(["a.ts#Foo.bar"], {});

    expect(inputService.promptForSelect).toHaveBeenCalledWith({
      choices: ["markdown", "mermaid", "json"],
      message: "Which output format?",
    });
    // The prompted format reaches the trace, which reads the configuration
    // it scopes the run with.
    expect(addressLookupService.locate).toHaveBeenCalledWith({
      format: "json",
    });
  });

  it("does not prompt for a format that was already given", async () => {
    vi.spyOn(inputService, "canPrompt").mockReturnValue(true);
    vi.spyOn(inputService, "promptForSelect");
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({ kind: "not-found" });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run(["a.ts#Foo.bar"], { format: "mermaid" });

    expect(inputService.promptForSelect).not.toHaveBeenCalled();
  });
});
