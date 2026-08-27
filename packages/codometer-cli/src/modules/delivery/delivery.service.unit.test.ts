import { JsonService, MarkdownService } from "@codometer/output";
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

import {
  buildCodeStatistics,
  buildCodometerReport,
} from "../../../testing/mocks";

import { DeliveryService } from "./delivery.service";

import type { DocumentationMeasurement } from "../measure/documentation-measurement.types";
import type { MeasurementResult } from "../measure/measure.types";
import type { RunMode } from "../run-plan/run-plan.types";
import type {
  RenderMarkdownOutput,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";
import type { MockInstance } from "vitest";

const statistics = buildCodeStatistics();
const report = buildCodometerReport();
const documentationSection = [
  "### 📝 Documentation",
  "- `src/foo.ts:3` — `Foo` (class): 9/6 lines",
].join("\n\n");

/** Builds a documented declaration whose comment exceeded its kind's limit. */
function buildDocumentationBreach(): DocumentationMeasurement {
  return {
    breached: true,
    declaration: "Foo",
    file: "src/foo.ts",
    kind: "class",
    limit: 6,
    line: 3,
    measured: 9,
    severity: "fail",
    target: "codebase",
    unit: "lines",
  };
}

/** Builds a measurement carrying no targets and no documentation findings. */
function buildMeasurement(
  overrides: Partial<MeasurementResult> = {},
): MeasurementResult {
  return {
    documentation: [],
    failures: [],
    indexes: new Map(),
    limits: [],
    statistics,
    targets: [],
    ...overrides,
  };
}

/** Builds a fully-checked, fully-writing run mode. */
function buildMode(overrides: Partial<RunMode> = {}): RunMode {
  return {
    checksLimits: false,
    checksReports: false,
    writes: false,
    ...overrides,
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

/** Renders a resolved markdown destination the way `MarkdownService.sync` would. */
function renderDestination(
  destination: undefined | { render?: RenderMarkdownOutput | undefined },
): string | undefined {
  if (destination?.render === undefined) {
    return undefined;
  }

  return destination.render({
    description: undefined,
    renderBadges: () => "badges",
    statistics,
  });
}

describe(DeliveryService, () => {
  let service: DeliveryService;
  let jsonService: JsonService;
  let markdownService: MarkdownService;
  let standardOutput: MockInstance<typeof process.stdout.write>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: JsonService, useValue: createMock<JsonService>() },
        { provide: MarkdownService, useValue: createMock<MarkdownService>() },
      ],
    }).compile();

    service = await module.resolve(DeliveryService);
    jsonService = await module.resolve(JsonService);
    markdownService = await module.resolve(MarkdownService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    standardOutput = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.mocked(jsonService.render).mockReturnValue("{}\n");
    vi.mocked(jsonService.sync).mockReturnValue(true);
    vi.mocked(markdownService.renderBlock).mockReturnValue("block");
    vi.mocked(markdownService.renderDocument).mockReturnValue("document");
    vi.mocked(markdownService.renderDocumentationSection).mockReturnValue("");
    vi.mocked(markdownService.sync).mockReturnValue(true);
  });

  afterEach(() => {
    standardOutput.mockRestore();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("produces nothing for a run declaring no destinations", () => {
    const stalePaths = service.deliver({
      destinations: { json: undefined, markdown: undefined },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(stalePaths).toStrictEqual([]);
    expect(jsonService.sync).not.toHaveBeenCalled();
    expect(markdownService.sync).not.toHaveBeenCalled();
  });

  it("writes the JSON report where a path was resolved and the run writes", () => {
    service.deliver({
      destinations: {
        json: { indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      indentation: 2,
      path: "output/codometer.json",
      report,
    });
  });

  it("names a stale JSON report the run was checking", () => {
    vi.mocked(jsonService.sync).mockReturnValue(false);

    const stalePaths = service.deliver({
      destinations: {
        json: { indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ checksReports: true }),
      report,
      scope: "project",
    });

    expect(stalePaths).toStrictEqual(["output/codometer.json"]);
  });

  it("writes the badge block with no documentation section when nothing breached", () => {
    service.deliver({
      destinations: {
        json: undefined,
        markdown: { ...markdownDestination, path: "docs/metrics.md" },
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "docs/metrics.md" },
      scope: "project",
      statistics,
      targets: [],
    });
  });

  it("appends the breached documentation section to the badge block", () => {
    const breach = buildDocumentationBreach();
    vi.mocked(markdownService.renderDocumentationSection).mockReturnValue(
      documentationSection,
    );

    service.deliver({
      destinations: {
        json: undefined,
        markdown: { ...markdownDestination, path: "docs/metrics.md" },
      },
      format: undefined,
      measurement: buildMeasurement({ documentation: [breach] }),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(markdownService.renderDocumentationSection).toHaveBeenCalledWith({
      breaches: [breach],
    });
    expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: expect.objectContaining({
        path: "docs/metrics.md",
      }) as ResolvedCodometerMarkdownOutputConfiguration,
      scope: "project",
      statistics,
      targets: [],
    });
  });

  it("splices the badge block into its file when the run writes", () => {
    service.deliver({
      destinations: {
        json: undefined,
        markdown: markdownDestination,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: markdownDestination,
      scope: "project",
      statistics,
      targets: [],
    });
  });

  it("splices the breached documentation section into that write", () => {
    const breach = buildDocumentationBreach();
    vi.mocked(markdownService.renderDocumentationSection).mockReturnValue(
      documentationSection,
    );
    let syncedDestination:
      | ResolvedCodometerMarkdownOutputConfiguration
      | undefined;
    vi.mocked(markdownService.sync).mockImplementationOnce((args) => {
      syncedDestination = args.destination;
      return true;
    });

    service.deliver({
      destinations: {
        json: undefined,
        markdown: markdownDestination,
      },
      format: undefined,
      measurement: buildMeasurement({ documentation: [breach] }),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    const renderedContent = renderDestination(syncedDestination);

    expect(renderedContent).toBe(["badges", documentationSection].join("\n\n"));
  });

  it("composes the documentation section after a configured custom render", () => {
    const breach = buildDocumentationBreach();
    vi.mocked(markdownService.renderDocumentationSection).mockReturnValue(
      documentationSection,
    );
    let syncedDestination:
      | ResolvedCodometerMarkdownOutputConfiguration
      | undefined;
    vi.mocked(markdownService.sync).mockImplementationOnce((args) => {
      syncedDestination = args.destination;
      return true;
    });

    service.deliver({
      destinations: {
        json: undefined,
        markdown: { ...markdownDestination, render: () => "custom badges" },
      },
      format: undefined,
      measurement: buildMeasurement({ documentation: [breach] }),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    const renderedContent = renderDestination(syncedDestination);

    expect(renderedContent).toBe(
      ["custom badges", documentationSection].join("\n\n"),
    );
  });

  it("hands the renderer the size of every target it measured, none for an empty one", () => {
    service.deliver({
      destinations: {
        json: undefined,
        markdown: { ...markdownDestination, path: "docs/metrics.md" },
      },
      format: undefined,
      measurement: buildMeasurement({
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
      }),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      destination: { ...markdownDestination, path: "docs/metrics.md" },
      scope: "project",
      statistics,
      targets: [
        { bytes: 5324, compression: "gzip", name: "Compiled JavaScript" },
      ],
    });
  });

  // 🖨️ The console

  it("prints the report when --format json asked for it", () => {
    service.deliver({
      destinations: { json: undefined, markdown: undefined },
      format: "json",
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(jsonService.render).toHaveBeenCalledExactlyOnceWith({
      indentation: 2,
      report,
    });
    expect(standardOutput).toHaveBeenCalledWith("{}\n");
  });

  it("prints the badges when --format markdown asked for them", () => {
    service.deliver({
      destinations: { json: undefined, markdown: undefined },
      format: "markdown",
      measurement: buildMeasurement(),
      mode: buildMode(),
      report,
      scope: "project",
    });

    expect(standardOutput).toHaveBeenCalledWith("block\n");
  });

  // The one writer of standard output. A file sink printing as well is how one
  // run put two documents on the stream a pipeline was parsing.
  it("prints nothing when no format was asked for, even writing a file", () => {
    service.deliver({
      destinations: {
        json: { indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: undefined,
      measurement: buildMeasurement(),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(standardOutput).not.toHaveBeenCalled();
  });

  it("prints and writes in the same run when both were asked for", () => {
    service.deliver({
      destinations: {
        json: { indentation: 2, path: "output/codometer.json" },
        markdown: undefined,
      },
      format: "markdown",
      measurement: buildMeasurement(),
      mode: buildMode({ writes: true }),
      report,
      scope: "project",
    });

    expect(standardOutput).toHaveBeenCalledWith("block\n");
    expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith({
      check: false,
      indentation: 2,
      path: "output/codometer.json",
      report,
    });
  });
});
