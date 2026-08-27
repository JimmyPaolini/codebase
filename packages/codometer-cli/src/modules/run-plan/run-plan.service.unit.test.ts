import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RunPlanService } from "./run-plan.service";

import type { MeasureCommandOptions } from "../measure/measure.types";
import type { RunDestinations } from "./run-plan.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/** Builds a resolved configuration with the given output destinations. */
function buildConfiguration(
  output: Partial<ResolvedCodometerConfiguration["output"]> = {},
): ResolvedCodometerConfiguration {
  return {
    defaultTarget: undefined,
    documentation: { default: 6, kinds: {}, severity: "fail", unit: "lines" },
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
    options: MeasureCommandOptions = {},
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

    // The scenario this exists for: CI runs `--check "$GATES"` with the
    // variable unset or misspelled. Read as "gate nothing" the run would pass
    // forever against a stale report, which is worse than no gate because it
    // looks like one.
    it.each([[""], [","], ["  "], [" , "]])(
      "refuses a --check value of %j, which names nothing",
      (check) => {
        const selection = service.selectMode({ check });

        expect(selection.errors).toStrictEqual([
          '--check needs a value. It takes a comma-separated set drawn from "limits" and "reports", as in "--check limits,reports".',
        ]);
        expect(selection.mode).toStrictEqual({
          checksLimits: false,
          checksReports: false,
          writes: false,
        });
      },
    );

    it("complains once about an unknown value rather than also about emptiness", () => {
      expect(service.selectMode({ check: "bogus" }).errors).toStrictEqual([
        expect.stringContaining('does not accept "bogus"') as string,
      ]);
    });

    it("reads --write as off when the flag never arrived", () => {
      expect(service.selectMode({ write: false }).mode.writes).toBe(false);
    });

    // The failure this exists for: an nx target that named a report path but
    // lost `--write`. The report went to the console, the run exited clean, and
    // the first thing to notice was a pull request section rendering as though
    // the project had changed nothing.
    it.each([
      [
        { outputJson: "codometer-report.json" },
        "--output-json codometer-report.json",
      ],
      [
        { check: "limits", outputJson: "codometer-report.json" },
        "--output-json codometer-report.json",
      ],
      [{ outputMarkdown: "README.md" }, "--output-markdown README.md"],
    ])(
      "refuses %j, which names a file nothing would write",
      (options: MeasureCommandOptions, refusal: string) => {
        expect(service.selectMode(options).errors).toStrictEqual([
          expect.stringContaining(
            `${refusal} needs --write or --check reports`,
          ) as string,
        ]);
      },
    );

    // Both are named in one run rather than one at a time, so a command line
    // with two unwritten paths is two mistakes to fix rather than two runs.
    it("names every unwritten output path in one run", () => {
      expect(
        service.selectMode({
          outputJson: "report.json",
          outputMarkdown: "README.md",
        }).errors,
      ).toHaveLength(2);
    });

    // A path the run does write, and a path it compares, are both accounted
    // for. Neither is the mistake above.
    it.each([
      [{ outputJson: "codometer-report.json", write: true }],
      [{ check: "reports", outputJson: "codometer-report.json" }],
      [{ outputMarkdown: "README.md", write: true }],
    ])("accepts %j, which does produce that file", (options) => {
      expect(service.selectMode(options).errors).toStrictEqual([]);
    });
  });

  describe("what it prints", () => {
    // The bare run: nothing is written, so the badges are what there is to
    // show. This is what makes `codometer` on its own worth running.
    it("prints the badges when the run touches no file", () => {
      expect(service.selectMode({}).format).toBe("markdown");
    });

    // A run whose output is a file has already answered the question. A
    // document on standard output as well is what a pipeline reading that
    // stream would choke on.
    it.each([[{ write: true }], [{ check: "reports" }]])(
      "prints nothing for %j, whose output is a file",
      (options) => {
        expect(service.selectMode(options).format).toBeUndefined();
      },
    );

    it.each(["json", "markdown"])("prints %s when asked for it", (format) => {
      expect(service.selectMode({ format }).format).toBe(format);
    });

    it("prints what --format asked for even on a run that writes", () => {
      expect(service.selectMode({ format: "json", write: true }).format).toBe(
        "json",
      );
    });

    it("refuses a --format it does not know, naming the ones it does", () => {
      const { errors, format } = service.selectMode({ format: "yaml" });

      expect(errors).toStrictEqual([
        expect.stringContaining('--format does not accept "yaml"') as string,
      ]);
      expect(format).toBeUndefined();
    });
  });

  describe("where the output goes", () => {
    it("writes no file when nothing names a destination", () => {
      expect(resolve()).toStrictEqual({
        json: undefined,
        markdown: undefined,
      });
    });

    it("reads a configured markdown destination as the markdown destination", () => {
      expect(
        resolve({}, buildConfiguration({ markdown: markdownConfiguration })),
      ).toStrictEqual({
        json: undefined,
        markdown: { ...markdownConfiguration, path: "/repo/README.md" },
      });
    });

    it("lets --output-markdown override the configured path", () => {
      const destinations = resolve(
        { outputMarkdown: "docs/statistics.md" },
        buildConfiguration({ markdown: markdownConfiguration }),
      );

      expect(destinations.markdown?.path).toBe("/repo/docs/statistics.md");
      // The markers and the description travel with it.
      expect(destinations.markdown?.startMarker).toBe("<!-- START -->");
    });

    it("keeps a configured write function as a destination of its own", () => {
      const write = (): boolean => true;
      const destinations = resolve(
        {},
        buildConfiguration({
          markdown: { ...markdownConfiguration, path: undefined, write },
        }),
      );

      expect(destinations.markdown?.path).toBeUndefined();
      expect(destinations.markdown?.write).toBe(write);
    });

    it("applies the default markers to an --output-markdown path", () => {
      expect(
        resolve({ outputMarkdown: "docs/statistics.md" }).markdown,
      ).toStrictEqual({
        description: undefined,
        endMarker: "<!-- CODE_STATISTICS_END -->",
        path: "/repo/docs/statistics.md",
        render: undefined,
        startMarker: "<!-- CODE_STATISTICS_START -->",
        write: undefined,
      });
    });

    it("resolves a report path against the measured directory", () => {
      const destinations = resolve(
        { outputJson: "reports/statistics.json" },
        buildConfiguration({
          json: { indentation: 4, path: "configured.json" },
        }),
      );

      expect(destinations.json).toStrictEqual({
        indentation: 4,
        path: "/repo/reports/statistics.json",
      });
    });

    it("gives the report the default indentation when nothing configured one", () => {
      expect(resolve({ outputJson: "statistics.json" }).json?.indentation).toBe(
        2,
      );
    });

    // A command line that names one destination names them all. Adding to the
    // configured set instead would write a file the command line never asked
    // for.
    it("lets a named destination stand for all of them", () => {
      const destinations = resolve(
        { outputJson: "statistics.json" },
        buildConfiguration({
          json: { indentation: 4, path: "configured.json" },
          markdown: markdownConfiguration,
        }),
      );

      expect(destinations.json).toStrictEqual({
        indentation: 4,
        path: "/repo/statistics.json",
      });
      expect(destinations.markdown).toBeUndefined();
    });

    it("drops a configured report when only --output-markdown names a destination", () => {
      const destinations = resolve(
        { outputMarkdown: "docs/statistics.md" },
        buildConfiguration({
          json: { indentation: 2, path: "configured.json" },
        }),
      );

      expect(destinations.json).toBeUndefined();
      expect(destinations.markdown?.path).toBe("/repo/docs/statistics.md");
    });

    it("never fires a configured write function for a run that named --output-json", () => {
      const destinations = resolve(
        { outputJson: "statistics.json" },
        buildConfiguration({
          markdown: {
            ...markdownConfiguration,
            path: undefined,
            write: (): boolean => true,
          },
        }),
      );

      expect(destinations.markdown).toBeUndefined();
    });
  });

  describe("what it refuses to measure", () => {
    it("lists every file the run writes, relative to the directory", () => {
      const destinations = resolve(
        {
          outputJson: "reports/statistics.json",
          outputMarkdown: "README.md",
        },
        buildConfiguration({ markdown: markdownConfiguration }),
      );

      expect(
        service.listOutputPaths({ destinations, workingDirectory: "/repo" }),
      ).toStrictEqual(["reports/statistics.json", "README.md"]);
    });

    it("lists nothing when the run names no file at all", () => {
      expect(
        service.listOutputPaths({
          destinations: resolve(),
          workingDirectory: "/repo",
        }),
      ).toStrictEqual([]);
    });
  });

  describe("what the run is measuring", () => {
    // Real directories rather than a mocked filesystem: the whole question is
    // whether a marker is on disk beside the measured directory.
    const root = mkdtempSync(path.join(tmpdir(), "codometer-scope-"));

    it("calls a directory carrying a repository marker a repository", () => {
      mkdirSync(path.join(root, ".git"), { recursive: true });

      expect(service.selectScope(root)).toBe("repository");
    });

    it("calls a workspace file a repository marker too", () => {
      const workspace = mkdtempSync(path.join(tmpdir(), "codometer-scope-"));

      writeFileSync(
        path.join(workspace, "pnpm-workspace.yaml"),
        "packages: []\n",
        "utf8",
      );

      expect(service.selectScope(workspace)).toBe("repository");
    });

    it("calls a directory beneath one a project", () => {
      const project = path.join(root, "packages", "logger");

      mkdirSync(project, { recursive: true });

      expect(service.selectScope(project)).toBe("project");
    });
  });
});
