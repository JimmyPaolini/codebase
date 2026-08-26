import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import callidescopeConfiguration from "../callidescope.config.js";

import type { CallGraphResult } from "@callidescope/configuration";

// 🔭 Fixture expectations

/** Where this repository's root sits, relative to this file. */
const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** The package whose fixtures every assertion below is about. */
const EXAMPLES_DIRECTORY = "packages/callidescope-examples";

/** The module identifier prefix every fixture module is reported under. */
const MODULE_PREFIX = `${EXAMPLES_DIRECTORY}:modules/`;

/**
 * Traces the fixtures the way the Nx target does, into a throwaway report.
 *
 * The real configuration is reused rather than restated — only its output is
 * redirected — so a limit changed in `callidescope.config.ts` changes what this
 * asserts instead of quietly disagreeing with it. The committed reports under
 * `output/` are left exactly where they were.
 */
function traceFixtures(): CallGraphResult {
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), "callidescope-examples-"),
  );
  const reportPath = path.join(temporaryDirectory, "report.json");
  const configurationPath = path.join(
    temporaryDirectory,
    "callidescope.config.json",
  );

  writeFileSync(
    configurationPath,
    JSON.stringify({
      ...callidescopeConfiguration,
      output: { json: { path: reportPath } },
    }),
    "utf8",
  );

  execFileSync(
    process.execPath,
    [
      "--import",
      "@swc-node/register/esm-register",
      "packages/callidescope-cli/src/main.ts",
      "callidescope",
      "--directories",
      EXAMPLES_DIRECTORY,
      "--config",
      configurationPath,
      "--write",
    ],
    { cwd: WORKSPACE_ROOT, stdio: "ignore" },
  );

  return JSON.parse(readFileSync(reportPath, "utf8")) as CallGraphResult;
}

describe("callidescope examples (integration)", () => {
  let result: CallGraphResult;

  beforeAll(() => {
    result = traceFixtures();
  });

  describe("what the run measured", () => {
    it("traces the whole package and nothing else", () => {
      expect(result.summary).toStrictEqual({
        callableCount: 68,
        cyclicComponentCount: 1,
        edgeCount: 52,
        entryPointCount: 22,
        fileCount: 37,
        maximumDepth: 8,
        projectCount: 1,
        unresolvedCallCount: 2,
      });
    });

    it("records exactly the two calls it cannot follow", () => {
      // One computed member name, and one structural expansion dropped for
      // exceeding `maximumImplementationCandidates`. Both are recorded rather
      // than guessed at, which is what makes a depth a floor and not a lie.
      expect(result.summary.unresolvedCallCount).toBe(2);
    });
  });

  describe("depth findings", () => {
    it("reports every deliberately deep stack and no others", () => {
      expect(
        result.deepStacks.map((stack) => ({
          depth: stack.depth,
          entry: stack.frames[0]?.displayName,
          isLowerBound: stack.isLowerBound,
        })),
      ).toStrictEqual([
        {
          depth: 8,
          entry: "ComputedMemberService.dispatch",
          isLowerBound: true,
        },
        { depth: 8, entry: "DeepStackService.quote", isLowerBound: false },
        {
          depth: 8,
          entry: "ForwardingStackService.handle",
          isLowerBound: false,
        },
        {
          depth: 7,
          entry: "FrameAnnotationsService.trace",
          isLowerBound: false,
        },
      ]);
    });

    it("ends the two pricing stacks on the tail they share", () => {
      // The convergence the mermaid diagram is drawn for. Without it the
      // diagram is two straight lines, which a list already says better.
      const tails = result.deepStacks
        .filter((stack) =>
          ["DeepStackService.quote", "ForwardingStackService.handle"].includes(
            stack.frames[0]?.displayName ?? "",
          ),
        )
        .map((stack) => stack.frames.at(-1)?.displayName);

      expect(tails).toStrictEqual(["roundToCents", "roundToCents"]);
    });
  });

  describe("cohesion findings", () => {
    it("reports the orchestrator and not its near miss", () => {
      expect(
        result.moduleSpreads.map((finding) => ({
          directModuleCount: finding.directModuleIds.length,
          displayName: finding.displayName,
        })),
      ).toStrictEqual([
        {
          directModuleCount: 5,
          displayName: "ModuleSpreadService.orchestrate",
        },
      ]);
    });

    it("suggests the module the misplaced helper's callers live in", () => {
      expect(
        result.misplacedCallables.map((finding) => ({
          callerCount: finding.callerCount,
          displayName: finding.displayName,
          foreignCallerCount: finding.foreignCallerCount,
          home: finding.homeModuleId,
          suggested: finding.suggestedModuleId,
        })),
      ).toStrictEqual([
        {
          callerCount: 2,
          displayName: "formatCurrency",
          foreignCallerCount: 2,
          home: `${MODULE_PREFIX}misplaced-callable`,
          suggested: `${MODULE_PREFIX}receipt`,
        },
      ]);
    });
  });

  describe("entry points", () => {
    it("carries one stack of every root kind", () => {
      const kinds = new Set(
        result.projects.flatMap((project) =>
          project.stacks.map((stack) => stack.entryPointKind),
        ),
      );

      expect([...kinds].toSorted()).toStrictEqual([
        "decorated-method",
        "exported-function",
        "lifecycle",
        "module-bootstrap",
        "orphan-root",
      ]);
    });
  });

  describe("frame annotations", () => {
    it("marks a deprecated frame, from its own root", () => {
      // Calling a `@deprecated` member is an ESLint error here, so the tag can
      // only have a frame if the deprecated callable heads its own stack.
      const stack = result.projects
        .flatMap((project) => project.stacks)
        .find(
          (candidate) =>
            candidate.frames[0]?.displayName ===
            "FrameAnnotationsService.legacyRender",
        );

      expect(stack?.frames[0]?.documentation?.isDeprecated).toBe(true);
    });

    it("names a destructured parameter that has no name in the syntax", () => {
      const frames =
        result.deepStacks.find(
          (stack) =>
            stack.frames[0]?.displayName === "FrameAnnotationsService.trace",
        )?.frames ?? [];
      const byName = new Map(frames.map((frame) => [frame.displayName, frame]));

      expect(
        byName.get("FrameAnnotationsService.describe")?.signature?.text,
      ).toContain("{ count, name }");
    });

    it("carries the whole summary in the report a machine reads", () => {
      // Shortening is the printed tree's business. The JSON keeps every
      // comment in full, because a machine reading it has no line width.
      const summary = result.deepStacks
        .flatMap((stack) => stack.frames)
        .find((frame) => frame.displayName === "FrameAnnotationsService.finish")
        ?.documentation?.summary;

      expect(summary?.length).toBeGreaterThan(120);
    });
  });
});
