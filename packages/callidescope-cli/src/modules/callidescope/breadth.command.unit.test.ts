import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildDiscoveredCallable } from "../../../testing/mocks";

import { BreadthCommand } from "./breadth.command";
import { TraceOptionParsingService } from "./trace-option-parsing.service";

import type { AddressLookupService } from "./address-lookup.service";
import type { AddressReportService } from "./address-report.service";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";
import type { BreadthService } from "@callidescope/graph";
import type { LoggerService } from "@codebase/logger";

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
  let logger: ReturnType<typeof createMock<LoggerService>>;

  beforeEach(() => {
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    breadthService = createMock<BreadthService>();
    logger = createMock<LoggerService>();

    command = new BreadthCommand(
      addressLookupService,
      addressReportService,
      breadthService,
      new TraceOptionParsingService(),
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

  it("sets logger context", () => {
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
    expect(addressLookupService.lookup).not.toHaveBeenCalled();
  });

  it("rejects a run whose address could not be resolved", async () => {
    addressLookupService.lookup.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      resolution: { kind: "not-found" },
    });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run(["a.ts#Foo.bar"], {});

    expect(process.exitCode).toBe(1);
    expect(breadthService.describeDirectCalls).not.toHaveBeenCalled();
  });

  it("fails when the resolved id was not among the traced callables", async () => {
    addressLookupService.lookup.mockResolvedValue({
      configuration: buildConfiguration(),
      located: buildLocated(),
      resolution: { id: "missing#0", kind: "resolved" },
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

    addressLookupService.lookup.mockResolvedValue({
      configuration: buildConfiguration(),
      located,
      resolution: { id: "a.ts#0", kind: "resolved" },
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
});
