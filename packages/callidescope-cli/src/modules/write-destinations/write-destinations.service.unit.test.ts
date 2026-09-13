import path from "node:path";

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
import { beforeAll, describe, expect, it } from "vitest";

import { buildCallGraphResult } from "../../../testing/mocks";

import { WriteDestinationsService } from "./write-destinations.service";

import type { SyncDestinationsArguments } from "./write-destinations.types";
import type {
  ProjectLimits,
  ProjectLimitsLookup,
  ProjectReport,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeMarkdownOutputConfiguration,
  ResolvedCallidescopeWriteConfiguration,
} from "@callidescope/configuration";

/** Builds a resolved configuration with no destinations configured. */
function buildConfiguration(
  write: Partial<ResolvedCallidescopeWriteConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    directories: [],
    entryPoints: {
      addresses: [],
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeCallees: [],
    excludeFrom: [],
    limits: { maximumDepth: 6 },
    write: buildWrite(write),
  };
}

/** Builds a markdown destination carrying nothing but the path it writes to. */
function buildDestination(
  destinationPath: string,
): ResolvedCallidescopeMarkdownOutputConfiguration {
  return {
    description: undefined,
    endMarker: "<!-- END -->",
    heading: "## 🔭 Callidescope",
    path: destinationPath,
    render: undefined,
    startMarker: "<!-- START -->",
    writeBlock: undefined,
  };
}

/** A project's own limits, inheriting depth and declaring no breadth. */
function buildProjectLimits(): ProjectLimits {
  return {
    maximumBreadth: undefined,
    maximumDepth: { origin: "inherited", path: undefined, value: 6 },
  };
}

/** A lookup naming every project a run reached. */
function buildProjectLimitsLookup(): ProjectLimitsLookup {
  return { byProject: new Map(), workspace: buildProjectLimits() };
}

/** Builds an empty report for one named project. */
function buildProjectReport(projectName: string): ProjectReport {
  return {
    callableBreadths: [],
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
  };
}

/** Builds a resolved write configuration, defaulting every destination away. */
function buildWrite(
  overrides: Partial<ResolvedCallidescopeWriteConfiguration> = {},
): ResolvedCallidescopeWriteConfiguration {
  return {
    json: undefined,
    markdown: undefined,
    mermaid: undefined,
    projectReadmes: undefined,
    ...overrides,
  };
}

describe(WriteDestinationsService, () => {
  let outputMarkdownService: ReturnType<
    typeof createMock<OutputMarkdownService>
  >;
  let service: WriteDestinationsService;

  /** The whole-run fan-out, plus whatever the one traced project declared. */
  function buildArguments(
    writeByProject: ReadonlyMap<
      string,
      ResolvedCallidescopeWriteConfiguration
    > = new Map(),
  ): SyncDestinationsArguments {
    return {
      check: false,
      configuration: buildConfiguration({
        projectReadmes: {
          endMarker: "<!-- END -->",
          heading: "## 🔭 Callidescope",
          previewCount: 3,
          startMarker: "<!-- START -->",
        },
      }),
      projectLimits: buildProjectLimitsLookup(),
      result: buildCallGraphResult({
        projects: [buildProjectReport("packages/example")],
      }),
      startingProjectRoots: new Map([["packages/example", "packages/example"]]),
      writeByProject,
    };
  }

  /** Points the markdown writer at a verdict, the way a real one returns one. */
  function stubWrites(current: boolean): void {
    outputMarkdownService.sync.mockReturnValue(current);
    outputMarkdownService.syncProjectReadmes.mockReturnValue([]);
  }

  beforeAll(async () => {
    outputMarkdownService = createMock<OutputMarkdownService>();

    const module = await Test.createTestingModule({
      providers: [
        WriteDestinationsService,
        {
          provide: MarkdownReportService,
          useValue: new MarkdownReportService(
            new MermaidReportService(),
            new ReportService(),
            new WorkspaceReportService(),
          ),
        },
        {
          provide: OutputJsonService,
          useValue: createMock<OutputJsonService>(),
        },
        { provide: OutputMarkdownService, useValue: outputMarkdownService },
      ],
    }).compile();

    service = await module.resolve(WriteDestinationsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📝 A project's own destinations

  it("writes a project's declared destination under that project's root", () => {
    stubWrites(true);
    service.syncDestinations(
      buildArguments(
        new Map([
          [
            "packages/example",
            buildWrite({ markdown: buildDestination("docs/CALLS.md") }),
          ],
        ]),
      ),
    );

    expect(
      outputMarkdownService.sync.mock.calls.map(
        ([call]) => call.destination.path,
      ),
    ).toStrictEqual([path.join("packages/example", "docs/CALLS.md")]);
  });

  it("reports a project's own stale destination by its resolved path", () => {
    stubWrites(false);

    const stale = service.syncDestinations(
      buildArguments(
        new Map([
          [
            "packages/example",
            buildWrite({ markdown: buildDestination("docs/CALLS.md") }),
          ],
        ]),
      ),
    );

    expect(stale).toStrictEqual([
      path.join("packages/example", "docs/CALLS.md"),
    ]);
  });

  it("leaves a project that declared its own destinations out of the fan-out", () => {
    stubWrites(true);
    service.syncDestinations(
      buildArguments(
        new Map([
          [
            "packages/example",
            buildWrite({ markdown: buildDestination("docs/CALLS.md") }),
          ],
        ]),
      ),
    );

    const [sent] = outputMarkdownService.syncProjectReadmes.mock.calls[0] ?? [];

    expect(sent?.sections).toStrictEqual([]);
  });

  it("publishes nothing for a project whose declared destinations are both absent", () => {
    stubWrites(true);
    service.syncDestinations(
      buildArguments(new Map([["packages/example", buildWrite()]])),
    );

    const [sent] = outputMarkdownService.syncProjectReadmes.mock.calls[0] ?? [];

    expect(outputMarkdownService.sync).not.toHaveBeenCalled();
    expect(sent?.sections).toStrictEqual([]);
  });

  it("reaches a project that declared nothing through the fan-out", () => {
    stubWrites(true);
    service.syncDestinations(buildArguments());

    const [sent] = outputMarkdownService.syncProjectReadmes.mock.calls[0] ?? [];

    expect(sent?.sections.map((section) => section.path)).toStrictEqual([
      path.join("packages/example", "README.md"),
    ]);
  });
});
