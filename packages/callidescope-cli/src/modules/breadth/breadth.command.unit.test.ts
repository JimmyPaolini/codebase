import { InputService } from "@callidescope/configuration";
import { BreadthService } from "@callidescope/graph";
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

import { buildDiscoveredCallable } from "../../../testing/mocks";
import { AddressLookupService } from "../address-lookup/address-lookup.service";
import { AddressReportService } from "../address-report/address-report.service";

import { BreadthCommand } from "./breadth.command";

import type { LocatedWorkspace } from "../address-lookup/address-lookup.types";
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
function buildLocated(): {
  callablesById: Map<string, ReturnType<typeof buildDiscoveredCallable>>;
  graph: {
    calleeIdsByCaller: Map<string, string[]>;
    callerIdsByCallee: Map<string, string[]>;
    edges: never[];
    unresolvedCallerIds: Set<string>;
    unresolvedCalls: never[];
  };
  projectRoots: Map<string, string>;
} {
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

describe(BreadthCommand, () => {
  let addressLookupService: ReturnType<typeof createMock<AddressLookupService>>;
  let addressReportService: ReturnType<typeof createMock<AddressReportService>>;
  let breadthService: ReturnType<typeof createMock<BreadthService>>;
  let command: BreadthCommand;
  let inputService: InputService;
  let logger: ReturnType<typeof createMock<LoggerService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BreadthCommand,
        {
          provide: AddressLookupService,
          useValue: createMock<AddressLookupService>(),
        },
        {
          provide: AddressReportService,
          useValue: createMock<AddressReportService>(),
        },
        { provide: BreadthService, useValue: createMock<BreadthService>() },
        InputService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(BreadthCommand);
  });

  const originalIsTty = process.stdin.isTTY;

  beforeEach(() => {
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    breadthService = createMock<BreadthService>();
    logger = createMock<LoggerService>();
    inputService = new InputService();
    // Not a terminal by default, so a test that does not opt into prompting
    // exercises the refusal a scripted run gets.
    process.stdin.isTTY = false;

    command = new BreadthCommand(
      addressLookupService,
      addressReportService,
      breadthService,
      inputService,
      logger,
    );

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
        BreadthCommand,
        {
          provide: AddressLookupService,
          useValue: createMock<AddressLookupService>(),
        },
        {
          provide: AddressReportService,
          useValue: createMock<AddressReportService>(),
        },
        { provide: BreadthService, useValue: createMock<BreadthService>() },
        InputService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("BreadthCommand");
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
    expect(breadthService.describeDirectCalls).not.toHaveBeenCalled();
  });

  it("fails when the resolved id was not among the traced callables", async () => {
    addressLookupService.locate.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      workspaceRoot: "/workspace",
    });
    addressLookupService.resolve.mockReturnValue({
      id: "missing#0",
      kind: "resolved",
    });
    addressLookupService.describeProblem.mockReturnValue(undefined);

    await command.run(["a.ts#Foo.bar"], {});

    expect(process.exitCode).toBe(1);
    expect(breadthService.describeDirectCalls).not.toHaveBeenCalled();
  });

  it("names the direct calls of the resolved callable and prints the report", async () => {
    const located = buildLocated();
    const callable = buildDiscoveredCallable({
      displayName: "Foo.bar",
      id: "a.ts#0",
    });

    located.callablesById.set("a.ts#0", callable);

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
    breadthService.describeDirectCalls.mockReturnValue({
      callees: [],
      callers: [],
    });
    addressReportService.renderBreadth.mockReturnValue("rendered breadth\n");

    await command.run(["a.ts#Foo.bar"], {});

    expect(breadthService.describeDirectCalls).toHaveBeenCalledWith({
      callablesById: located.callablesById,
      graph: located.graph,
      id: "a.ts#0",
    });
    expect(addressReportService.renderBreadth).toHaveBeenCalledWith({
      address: "a.ts#Foo.bar",
      directCalls: { callees: [], callers: [] },
      displayName: "Foo.bar",
      format: "markdown",
      id: "a.ts#0",
      location: callable.node.location,
    });
    expect(process.stdout.write).toHaveBeenCalledWith("rendered breadth\n");
    expect(process.exitCode).toBeUndefined();
  });

  // 🗣️ Prompting

  it("prompts for the address when it is missing", async () => {
    process.stdin.isTTY = true;
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
    // prompt, not the separate format prompt that would otherwise also run.
    await command.run([], { format: "markdown" });

    // The list it completes against is what the one trace found, so the
    // caller picks a callable that provably exists.
    expect(inputService.promptForAutocomplete).toHaveBeenCalledWith({
      message: "Which callable? (file#qualified-name)",
      subject:
        'A callable address, as in "breadth src/foo.service.ts#FooService.bar"',
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
    process.stdin.isTTY = true;
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

  it("prompts for a format when it was left off, at a terminal", async () => {
    process.stdin.isTTY = true;
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
      subject: "An output format (--format)",
    });
    // The prompted format reaches the trace, which reads the configuration
    // it scopes the run with.
    expect(addressLookupService.locate).toHaveBeenCalledWith({
      format: "json",
    });
  });

  it("does not prompt for a format that was already given", async () => {
    process.stdin.isTTY = true;
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

  // A genuine failure keeps its stack rather than being reported to the
  // reader as a command line they mistyped.
  it("lets a failure that is not a refused command line propagate", async () => {
    addressLookupService.locate.mockRejectedValue(new Error("Trace failed."));

    await expect(
      command.run(["a.ts#Foo.bar"], { format: "markdown" }),
    ).rejects.toThrow("Trace failed.");
  });
});
