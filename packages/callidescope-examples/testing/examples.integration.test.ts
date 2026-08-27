import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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

/**
 * The module identifier prefix every example directory is reported under.
 *
 * One module per directory under `examples/`, which is what
 * `workspaceStructure.rootModuleSegment` in the configuration buys.
 */
const MODULE_PREFIX = `${EXAMPLES_DIRECTORY}:`;

/**
 * Traces the fixtures the way the Nx target does, into a throwaway report.
 *
 * The real configuration is reused rather than restated — only its output is
 * redirected — so a limit changed in `callidescope.config.ts` changes what this
 * asserts instead of quietly disagreeing with it. The committed reports under
 * `output/` are left exactly where they were.
 *
 * `limits` overrides one threshold for the differential the cap fixture needs:
 * the only way to show a cap doing something is to run the same fixtures again
 * with it lifted.
 */
function traceFixtures(limits: Record<string, number> = {}): CallGraphResult {
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
      limits: { ...callidescopeConfiguration.limits, ...limits },
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

  describe("the examples are all documented", () => {
    // The half no assertion about a finding can catch: an example whose guide
    // is missing, or which nothing links to, is reachable only by listing the
    // directory. Every sibling `*-examples` package checks the same two things.
    const exampleNames = readdirSync(
      path.join(WORKSPACE_ROOT, EXAMPLES_DIRECTORY, "examples"),
      { withFileTypes: true },
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();

    it.each(exampleNames)("%s carries its own README.md", (exampleName) => {
      expect.hasAssertions();
      expect(
        existsSync(
          path.join(
            WORKSPACE_ROOT,
            EXAMPLES_DIRECTORY,
            "examples",
            exampleName,
            "README.md",
          ),
        ),
      ).toBe(true);
    });

    it.each(exampleNames)(
      "%s is linked from the package guide's reading order",
      (exampleName) => {
        expect.hasAssertions();

        const guide = readFileSync(
          path.join(WORKSPACE_ROOT, EXAMPLES_DIRECTORY, "README.md"),
          "utf8",
        );

        expect(guide).toContain(`(examples/${exampleName}/README.md)`);
      },
    );
  });

  describe("what the run measured", () => {
    it("traces the whole package and nothing else", () => {
      expect(result.summary).toStrictEqual({
        callableCount: 69,
        cyclicComponentCount: 1,
        edgeCount: 53,
        entryPointCount: 23,
        fileCount: 32,
        maximumDepth: 8,
        projectCount: 1,
        unresolvedCallCount: 2,
      });
    });

    it("drops the over-cap structural expansion, and only that", () => {
      // The cap can only be shown to do something by lifting it. Three classes
      // satisfy `LineSink`; at a cap of two the whole expansion is dropped and
      // recorded as unfollowable, leaving the computed member name as the only
      // other one. Raised past three, those same three edges appear and the
      // unfollowable count falls to the computed member alone.
      //
      // Without this, the cap could stop working entirely and every other
      // assertion here would still pass.
      const lifted = traceFixtures({ maximumImplementationCandidates: 8 });

      expect(result.summary.unresolvedCallCount).toBe(2);
      expect(lifted.summary.unresolvedCallCount).toBe(1);
      expect(lifted.summary.edgeCount).toBe(result.summary.edgeCount + 3);
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

  describe("recursion", () => {
    it("collapses the cycle of three into frames marked as one", () => {
      // Every member of a cycle has a caller inside it, so none is promoted as
      // an orphan. `traverse` is the root above the cluster that makes the
      // collapsed component reachable, and therefore reportable at all.
      const stack = result.projects
        .flatMap((project) => project.stacks)
        .find(
          (candidate) =>
            candidate.frames[0]?.displayName ===
            "MutualRecursionService.traverse",
        );

      expect(
        stack?.frames.map((frame) => [frame.displayName, frame.isCycle]),
      ).toStrictEqual([
        ["MutualRecursionService.traverse", false],
        ["MutualRecursionService.branch", true],
        ["MutualRecursionService.leaf", true],
        ["MutualRecursionService.descend", true],
      ]);
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
