import { AddressService } from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CallidescopeService } from "../callidescope/callidescope.service";
import { RunPlanService } from "../run-plan/run-plan.service";

import { AddressLookupService } from "./address-lookup.service";

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

/** Builds a resolved configuration with the defaults this suite assumes. */
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

/** Builds an empty located outcome, for tests that only care about the resolution. */
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

describe(AddressLookupService, () => {
  let addressService: ReturnType<typeof createMock<AddressService>>;
  let callidescopeService: ReturnType<typeof createMock<CallidescopeService>>;
  let runPlanService: ReturnType<typeof createMock<RunPlanService>>;
  let service: AddressLookupService;

  beforeAll(async () => {
    addressService = createMock<AddressService>();
    callidescopeService = createMock<CallidescopeService>();
    runPlanService = createMock<RunPlanService>();

    const module = await Test.createTestingModule({
      providers: [
        AddressLookupService,
        { provide: AddressService, useValue: addressService },
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: RunPlanService, useValue: runPlanService },
      ],
    }).compile();

    service = await module.resolve(AddressLookupService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🔍 Looking up an address

  it("resolves the address against what a lookup located", async () => {
    const configuration = buildConfiguration();
    const located = buildLocated();

    runPlanService.prepareLookup.mockResolvedValue({
      configuration,
      workspaceRoot: "/workspace",
    });
    callidescopeService.locate.mockReturnValue(located);
    addressService.resolve.mockReturnValue({ id: "a#0", kind: "resolved" });

    const workspace = await service.locate({});

    expect(workspace).toStrictEqual({
      configuration,
      located,
      workspaceRoot: "/workspace",
    });
    expect(
      service.resolve({ address: "a.ts#Foo.bar", workspace }),
    ).toStrictEqual({ id: "a#0", kind: "resolved" });
    expect(addressService.resolve).toHaveBeenCalledWith({
      address: "a.ts#Foo.bar",
      callablesById: located.callablesById,
      workspaceRoot: "/workspace",
    });
  });

  // One trace serves both the list a prompt completes against and the lookup
  // that follows it, so offering a choice never costs a second trace.
  it("lists every traced callable as an address, from one trace", async () => {
    const located = buildLocated();

    runPlanService.prepareLookup.mockResolvedValue({
      configuration: buildConfiguration(),
      workspaceRoot: "/workspace",
    });
    callidescopeService.locate.mockReturnValue(located);
    addressService.listAddresses.mockReturnValue(["a.ts#Foo.bar"]);

    const workspace = await service.locate({});

    expect(service.listAddresses(workspace)).toStrictEqual(["a.ts#Foo.bar"]);
    expect(addressService.listAddresses).toHaveBeenCalledExactlyOnceWith(
      located.callablesById,
    );
    expect(callidescopeService.locate).toHaveBeenCalledTimes(1);
  });

  it("scopes the trace to the directories a flag named", async () => {
    runPlanService.prepareLookup.mockResolvedValue({
      configuration: buildConfiguration(),
      workspaceRoot: "/workspace",
    });
    callidescopeService.locate.mockReturnValue(buildLocated());
    addressService.resolve.mockReturnValue({ kind: "not-found" });

    await service.locate({ directories: ["alpha"] });

    expect(
      callidescopeService.locate.mock.calls[0]?.[0].directories,
    ).toStrictEqual(["alpha"]);
  });

  // 🗣️ Describing a problem

  it("says nothing is wrong with a resolved address", () => {
    expect(
      service.describeProblem({
        address: "a.ts#Foo.bar",
        resolution: { id: "a#0", kind: "resolved" },
      }),
    ).toBeUndefined();
  });

  it("states an invalid address's own reason", () => {
    expect(
      service.describeProblem({
        address: "a.ts",
        resolution: { kind: "invalid", reason: "needs a '#'" },
      }),
    ).toBe("needs a '#'");
  });

  it("names the address when nothing matches it", () => {
    expect(
      service.describeProblem({
        address: "a.ts#Foo.bar",
        resolution: { kind: "not-found" },
      }),
    ).toContain("a.ts#Foo.bar");
  });

  it("lists every candidate an ambiguous address matched", () => {
    const problem = service.describeProblem({
      address: "a.ts#Foo.bar",
      resolution: {
        candidates: [
          { id: "a#0", location: { column: 1, filePath: "a.ts", line: 3 } },
          { id: "a#1", location: { column: 1, filePath: "a.ts", line: 8 } },
        ],
        kind: "ambiguous",
      },
    });

    expect(problem).toContain("a.ts:3");
    expect(problem).toContain("a.ts:8");
  });
});
