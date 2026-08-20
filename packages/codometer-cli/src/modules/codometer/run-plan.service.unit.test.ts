import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RunPlanService } from "./run-plan.service";

import type { CodometerCommandOptions } from "./codometer.types";
import type { RunDestinations } from "./run-plan.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/** Builds a resolved configuration with the given output destinations. */
function buildConfiguration(
  output: Partial<ResolvedCodometerConfiguration["output"]> = {},
): ResolvedCodometerConfiguration {
  return {
    defaultTarget: undefined,
    exclude: [],
    excludeFrom: [],
    limits: [],
    output: { json: undefined, markdown: undefined, ...output },
    python: { command: "python3" },
    statistics: [],
    targets: [],
  };
}

const markdownConfiguration = {
  description: "Repository statistics.",
  endMarker: "<!-- END -->",
  path: "README.md",
  render: undefined,
  startMarker: "<!-- START -->",
  write: undefined,
};

describe(RunPlanService, () => {
  let service: RunPlanService;

  /** Resolves the destinations for one command line at `/repo`. */
  function resolve(
    options: CodometerCommandOptions = {},
    configuration = buildConfiguration(),
  ): RunDestinations {
    return service.resolveDestinations({
      configuration,
      options,
      workingDirectory: "/repo",
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RunPlanService],
    }).compile();

    service = await module.resolve(RunPlanService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("what the run does", () => {
    it.each([
      [{}, { checksLimits: false, checksReports: false, writes: false }],
      [
        { check: "limits" },
        { checksLimits: true, checksReports: false, writes: false },
      ],
      [
        { check: "reports" },
        { checksLimits: false, checksReports: true, writes: false },
      ],
      [
        { check: "reports,limits" },
        { checksLimits: true, checksReports: true, writes: false },
      ],
      [
        { write: true },
        { checksLimits: false, checksReports: false, writes: true },
      ],
      [
        { check: "limits", write: true },
        { checksLimits: true, checksReports: false, writes: true },
      ],
    ])("reads %o as %o", (options, mode) => {
      const selection = service.selectMode(options);

      expect(selection.errors).toStrictEqual([]);
      expect(selection.mode).toStrictEqual(mode);
    });

    it("tolerates spaces around the names in a --check set", () => {
      expect(
        service.selectMode({ check: " reports , limits " }).mode,
      ).toStrictEqual({
        checksLimits: true,
        checksReports: true,
        writes: false,
      });
    });

    // Nothing can be stale immediately after being written, so a run asking
    // for both has misunderstood one of them.
    it("refuses --write together with --check reports", () => {
      expect(
        service.selectMode({ check: "reports", write: true }).errors,
      ).toStrictEqual([
        expect.stringContaining(
          "--write cannot be combined with --check reports",
        ) as string,
      ]);
    });

    it("reads --write as off when the flag never arrived", () => {
      expect(service.selectMode({ write: false }).mode.writes).toBe(false);
    });
  });

  describe("where the output goes", () => {
    it("renders the badges to the console when nothing names a destination", () => {
      expect(resolve()).toStrictEqual({
        json: undefined,
        markdown: { description: undefined, path: undefined },
        readme: undefined,
      });
    });

    it("keeps the configured description on the console default", () => {
      const destinations = resolve(
        {},
        buildConfiguration({
          markdown: {
            ...markdownConfiguration,
            path: undefined,
            write: undefined,
          },
        }),
      );

      expect(destinations.markdown).toStrictEqual({
        description: "Repository statistics.",
        path: undefined,
      });
    });

    it("reads a configured markdown destination as a splice destination", () => {
      expect(
        resolve({}, buildConfiguration({ markdown: markdownConfiguration })),
      ).toStrictEqual({
        json: undefined,
        markdown: undefined,
        readme: { ...markdownConfiguration, path: "/repo/README.md" },
      });
    });

    it("lets --readme override the configured splice path", () => {
      const destinations = resolve(
        { readme: "docs/statistics.md" },
        buildConfiguration({ markdown: markdownConfiguration }),
      );

      expect(destinations.readme?.path).toBe("/repo/docs/statistics.md");
      // The markers and the description travel with it.
      expect(destinations.readme?.startMarker).toBe("<!-- START -->");
    });

    it("keeps a configured write function as a splice destination of its own", () => {
      const write = (): boolean => true;
      const destinations = resolve(
        {},
        buildConfiguration({
          markdown: { ...markdownConfiguration, path: undefined, write },
        }),
      );

      expect(destinations.readme?.path).toBeUndefined();
      expect(destinations.readme?.write).toBe(write);
    });

    it("applies the default markers to a --readme path", () => {
      expect(resolve({ readme: "docs/statistics.md" }).readme).toStrictEqual({
        description: undefined,
        endMarker: "<!-- CODE_STATISTICS_END -->",
        path: "/repo/docs/statistics.md",
        render: undefined,
        startMarker: "<!-- CODE_STATISTICS_START -->",
        write: undefined,
      });
    });

    it.each([
      [{ json: "reports/statistics.json" }, "/repo/reports/statistics.json"],
      // The flag with no path asks for the console, and outranks the
      // configured path rather than falling back to it.
      [{ json: true as const }, undefined],
    ])("resolves %o to %s", (options, expected) => {
      const destinations = resolve(
        options,
        buildConfiguration({
          json: { indentation: 4, path: "configured.json" },
        }),
      );

      expect(destinations.json).toStrictEqual({
        indentation: 4,
        path: expected,
      });
    });

    it("gives the report the default indentation when nothing configured one", () => {
      expect(resolve({ json: "statistics.json" }).json?.indentation).toBe(2);
    });

    // `codometer --json > report.json` has to produce one document. A
    // configured splice destination rendering onto the same stream would put a
    // second one there.
    it("lets a named destination stand for all of them", () => {
      const destinations = resolve(
        { json: true },
        buildConfiguration({
          json: { indentation: 4, path: "configured.json" },
          markdown: markdownConfiguration,
        }),
      );

      expect(destinations.json).toStrictEqual({
        indentation: 4,
        path: undefined,
      });
      expect(destinations.markdown).toBeUndefined();
      expect(destinations.readme).toBeUndefined();
    });

    it("drops a configured report when only --readme names a destination", () => {
      const destinations = resolve(
        { readme: "docs/statistics.md" },
        buildConfiguration({
          json: { indentation: 2, path: "configured.json" },
        }),
      );

      expect(destinations.json).toBeUndefined();
      expect(destinations.readme?.path).toBe("/repo/docs/statistics.md");
    });

    it("never fires a configured write function for a run that named --json", () => {
      const destinations = resolve(
        { json: "statistics.json" },
        buildConfiguration({
          markdown: {
            ...markdownConfiguration,
            path: undefined,
            write: (): boolean => true,
          },
        }),
      );

      expect(destinations.readme).toBeUndefined();
    });

    it("never turns --markdown into a splice destination", () => {
      const destinations = resolve({ markdown: "docs/metrics.md" });

      expect(destinations.markdown?.path).toBe("/repo/docs/metrics.md");
      expect(destinations.readme).toBeUndefined();
    });
  });

  describe("what it refuses to measure", () => {
    it("lists every file the run writes, relative to the directory", () => {
      const destinations = resolve(
        {
          json: "reports/statistics.json",
          markdown: "docs/metrics.md",
          readme: "README.md",
        },
        buildConfiguration({ markdown: markdownConfiguration }),
      );

      expect(
        service.listOutputPaths({ destinations, workingDirectory: "/repo" }),
      ).toStrictEqual([
        "reports/statistics.json",
        "docs/metrics.md",
        "README.md",
      ]);
    });

    it("lists nothing when every destination is the console", () => {
      expect(
        service.listOutputPaths({
          destinations: resolve(),
          workingDirectory: "/repo",
        }),
      ).toStrictEqual([]);
    });
  });
});
