import { createMock } from "@golevelup/ts-vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DepthCommand } from "./depth.command";
import { TraceOptionParsingService } from "./trace-option-parsing.service";

import type { AddressLookupService } from "./address-lookup.service";
import type { AddressReportService } from "./address-report.service";
import type { LocateOutcome } from "./callidescope.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";
import type { CallTreeService } from "@callidescope/graph";
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

describe(DepthCommand, () => {
  let addressLookupService: ReturnType<typeof createMock<AddressLookupService>>;
  let addressReportService: ReturnType<typeof createMock<AddressReportService>>;
  let callTreeService: ReturnType<typeof createMock<CallTreeService>>;
  let command: DepthCommand;
  let logger: ReturnType<typeof createMock<LoggerService>>;

  beforeEach(() => {
    addressLookupService = createMock<AddressLookupService>();
    addressReportService = createMock<AddressReportService>();
    callTreeService = createMock<CallTreeService>();
    logger = createMock<LoggerService>();

    command = new DepthCommand(
      addressLookupService,
      addressReportService,
      callTreeService,
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

  // 🏃 Running

  it("rejects a run with no address", async () => {
    await command.run([], {});

    expect(process.exitCode).toBe(1);
    expect(addressLookupService.lookup).not.toHaveBeenCalled();
  });

  it("rejects a run whose address could not be resolved", async () => {
    addressLookupService.lookup.mockResolvedValue({
      configuration: buildConfiguration(),
      located: {
        callablesById: new Map(),
        graph: {
          calleeIdsByCaller: new Map(),
          callerIdsByCallee: new Map(),
          edges: [],
          unresolvedCallerIds: new Set(),
          unresolvedCalls: [],
        },
        projectRoots: new Map(),
      },
      resolution: { kind: "not-found" },
    });
    addressLookupService.describeProblem.mockReturnValue(
      "No callable matches it.",
    );

    await command.run(["a.ts#Foo.bar"], {});

    expect(process.exitCode).toBe(1);
    expect(callTreeService.buildDownwardStacks).not.toHaveBeenCalled();
  });

  it("traces both directions and prints the rendered report", async () => {
    const located: LocateOutcome = {
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

    addressLookupService.lookup.mockResolvedValue({
      configuration: buildConfiguration(),
      located,
      resolution: { id: "a.ts#0", kind: "resolved" },
    });
    addressLookupService.describeProblem.mockReturnValue(undefined);
    callTreeService.buildDownwardStacks.mockReturnValue({
      stacks: [],
      truncated: false,
    });
    callTreeService.buildUpwardStacks.mockReturnValue({
      stacks: [],
      truncated: false,
    });
    addressReportService.renderDepth.mockReturnValue("rendered depth\n");

    await command.run(["a.ts#Foo.bar"], {});

    expect(callTreeService.buildDownwardStacks).toHaveBeenCalledWith({
      callablesById: located.callablesById,
      graph: located.graph,
      startId: "a.ts#0",
    });
    expect(callTreeService.buildUpwardStacks).toHaveBeenCalledWith({
      callablesById: located.callablesById,
      graph: located.graph,
      startId: "a.ts#0",
    });
    expect(process.stdout.write).toHaveBeenCalledWith("rendered depth\n");
    expect(process.exitCode).toBeUndefined();
  });
});
