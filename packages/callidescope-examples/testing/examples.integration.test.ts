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

import callidescopeConfiguration from "../callidescope.workspace.config.js";

import type {
  CallGraphResult,
  DeepStackFinding,
  ProjectReport,
} from "@callidescope/configuration";

// 🔭 Fixture expectations

/** Where this repository's root sits, relative to this file. */
const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** The package whose fixtures every assertion below is about. */
const EXAMPLES_DIRECTORY = "packages/callidescope-examples";

/** The nested project that carries its own limits, and breaches both. */
const GATED_LEAF_DIRECTORY = `${EXAMPLES_DIRECTORY}/examples/gated-leaf`;

/** The nested project that declares nothing, and is judged all the same. */
const INHERITED_LIMITS_DIRECTORY = `${EXAMPLES_DIRECTORY}/examples/inherited-limits`;

/**
 * The module identifier prefix every example directory is reported under.
 *
 * One module per directory under `examples/`, which is what
 * `workspaceStructure.rootModuleSegment` in the configuration buys.
 */
const MODULE_PREFIX = `${EXAMPLES_DIRECTORY}:`;

/**
 * Every example directory that is a project of its own — the ones holding a
 * `tsconfig.json`.
 *
 * Read off disk rather than listed, because that is what makes a fourth
 * nested-project example impossible to add halfway: it appears here the moment
 * its `tsconfig.json` does, and the assertion below then fails until the
 * `examples` target names it too.
 */
const NESTED_PROJECT_DIRECTORIES = readdirSync(
  path.join(WORKSPACE_ROOT, EXAMPLES_DIRECTORY, "examples"),
  { withFileTypes: true },
)
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(
        path.join(
          WORKSPACE_ROOT,
          EXAMPLES_DIRECTORY,
          "examples",
          entry.name,
          "tsconfig.json",
        ),
      ),
  )
  .map((entry) => `${EXAMPLES_DIRECTORY}/examples/${entry.name}`)
  .toSorted();

/**
 * Reads the `--directories` value out of one `examples` target configuration.
 *
 * The target's own command rather than a copy of it: the list this suite
 * traces and the list the target traces have to be one list, and a second
 * spelling of it here is a fixture that goes untraced in CI while every
 * assertion about it still passes.
 */
function readTargetDirectories(configuration: "check" | "write"): string {
  const command = String(
    (
      JSON.parse(
        readFileSync(
          path.join(WORKSPACE_ROOT, EXAMPLES_DIRECTORY, "project.json"),
          "utf8",
        ),
      ) as {
        targets: {
          examples: { configurations: Record<string, { command: string }> };
        };
      }
    ).targets.examples.configurations[configuration]?.command,
  ).split(" ");
  const value = command[command.indexOf("--directories") + 1];

  if (value === undefined) {
    throw new Error(`The examples ${configuration} command names no roots`);
  }

  return value;
}

/**
 * The roots a run is pointed at, read from the `examples` target itself.
 *
 * More than one, because an example directory holding its own `tsconfig.json`
 * is a project and a project is only measured when a run reaches it. Neither
 * nested one is reached through the closure — a closure destination must hold
 * a `package.json`, and a nested one makes Nx infer a project — so both are
 * named by the target instead.
 */
const STARTING_DIRECTORIES = readTargetDirectories("check");

/**
 * The `dependency-closure` fixture's stack, frame by frame, with the project
 * each frame was declared in.
 *
 * The project is the whole point: two of the four frames are declared outside
 * this package, and are there only because the run traced its closure.
 */
function readClosureFrames(
  result: CallGraphResult,
): { displayName: string; project: string }[] {
  const stack = result.projects
    .flatMap((project) => project.stacks)
    .find(
      (candidate) =>
        candidate.frames[0]?.displayName ===
        "DependencyClosureService.allowsDepth",
    );

  return (stack?.frames ?? []).map((frame) => ({
    displayName: frame.displayName,
    project: readFileProject(result, frame.location.filePath),
  }));
}

/**
 * Every deep-stack finding one project is answerable for, deepest first.
 *
 * Selected by the project owning the stack's **root**, which is the attribution
 * the limit resolution itself uses, rather than by the path the root's file
 * sits at. The two part company here: a nested project's files sit under this
 * package's directory, so a path test would charge this package with findings
 * that belong to a project of its own.
 */
function readDeepStacksFor(
  result: CallGraphResult,
  projectName: string,
): DeepStackFinding[] {
  return result.deepStacks.filter((stack) => {
    const filePath = stack.frames[0]?.location.filePath;

    return (
      filePath !== undefined &&
      readFileProject(result, filePath) === projectName
    );
  });
}

/**
 * The project a frame's file belongs to, named the way the run names it.
 *
 * A `StackFrame` carries no project of its own, so the owner is resolved
 * against the `projectName` values the run itself reported rather than guessed
 * from the shape of the path — the two agree for every project here, and only
 * one of them keeps agreeing when a project root is nested any deeper than two
 * segments. The longest match wins, so a project inside another project is
 * never credited to its parent.
 */
function readFileProject(result: CallGraphResult, filePath: string): string {
  const owner = result.projects
    .map((project) => project.projectName)
    .filter((projectName) => filePath.startsWith(`${projectName}/`))
    .toSorted((first, second) => second.length - first.length)[0];

  if (owner === undefined) {
    throw new Error(`The run reported no project owning ${filePath}`);
  }

  return owner;
}

/**
 * What one example's `## Next` section links to.
 *
 * The section rather than the whole file, because a guide links to its
 * neighbors from its prose as well — reading the whole file would call a
 * broken chain unbroken on the strength of a mention halfway up it.
 *
 * The first `## Next`, not the last: a guide with a generated section below
 * its own `## Next` — `gated-leaf` and `inherited-limits` both carry a
 * `## 🔭 Callidescope` block after it — would otherwise read that trailing
 * section instead of the reading-order link this assertion exists to check.
 */
function readNextLink(exampleName: string): string {
  const guide = readFileSync(
    path.join(
      WORKSPACE_ROOT,
      EXAMPLES_DIRECTORY,
      "examples",
      exampleName,
      "README.md",
    ),
    "utf8",
  );

  return guide.split("## Next")[1] ?? "";
}

/**
 * This package's own slice of a run.
 *
 * Every count below is read from here rather than from the whole-run summary,
 * because the run covers three dependency packages as well and they are
 * ordinary code that changes for ordinary reasons. A suite about fixtures that
 * failed when `packages/logger` gained a method would teach people to update
 * its numbers without reading them, which is the one thing these exact
 * assertions exist to prevent.
 */
function readOwnReport(result: CallGraphResult): ProjectReport {
  return readProjectReport(result, EXAMPLES_DIRECTORY);
}

/** Reads one project's report, failing loudly when the run reached no such project. */
function readProjectReport(
  result: CallGraphResult,
  projectName: string,
): ProjectReport {
  const report = result.projects.find(
    (project) => project.projectName === projectName,
  );

  if (report === undefined) {
    throw new Error(`The run reported no project named ${projectName}`);
  }

  return report;
}

/**
 * The examples in the order the package guide walks a reader through them.
 *
 * Read out of the guide rather than restated here: a list in this file would
 * be a second reading order, free to agree with the assertions below while
 * disagreeing with the document a reader actually follows.
 */
function readReadingOrder(): string[] {
  const guide = readFileSync(
    path.join(WORKSPACE_ROOT, EXAMPLES_DIRECTORY, "README.md"),
    "utf8",
  );
  const walkthrough = guide
    .split("Read them in the order below for a walkthrough:")
    .at(-1)
    ?.split("\n\n")[0];

  return [...(walkthrough ?? "").matchAll(/\(examples\/([a-z0-9-]+)\/README/g)]
    .map((match) => match[1])
    .filter((exampleName) => exampleName !== undefined);
}

/**
 * Traces the fixtures the way the Nx target does, into a throwaway report.
 *
 * The real configuration is reused rather than restated — only its output is
 * redirected — so a limit changed in `callidescope.workspace.config.ts` changes
 * what this asserts instead of quietly disagreeing with it. The committed
 * reports under `output/` are left exactly where they were.
 *
 * Both overrides exist for a differential, because a rule that narrows
 * something can only be shown to do anything by running the same fixtures again
 * without it. `limits` lifts the implementation cap; `exclude` drops one
 * project out of the run's dependency closure.
 *
 * Writing a derived copy into a temporary directory is also why the file it
 * derives from is not named `callidescope.config.ts`: `--config` then names the
 * temporary file, so the run's "one file, one role" skip has no path to match
 * and would discover the real one at the project root as this package's own
 * project configuration — which sets workspace-only fields and is refused.
 */
function traceFixtures(
  overrides: {
    exclude?: readonly string[];
    limits?: Record<string, number>;
  } = {},
): CallGraphResult {
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
      exclude: [
        ...(callidescopeConfiguration.exclude ?? []),
        ...(overrides.exclude ?? []),
      ],
      limits: { ...callidescopeConfiguration.limits, ...overrides.limits },
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
      STARTING_DIRECTORIES,
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

  describe("the examples target names every root", () => {
    // The standard's completeness rule, applied to the one list this package
    // keeps in three places: a nested-project example added without being
    // named by the target is simply never traced, and its guide's generated
    // section never appears — with nothing failing to say so.
    it("names the same roots in check and in write", () => {
      expect(readTargetDirectories("write")).toBe(STARTING_DIRECTORIES);
    });

    it("names this package and every nested project under examples", () => {
      expect(STARTING_DIRECTORIES.split(",").toSorted()).toStrictEqual(
        [EXAMPLES_DIRECTORY, ...NESTED_PROJECT_DIRECTORIES].toSorted(),
      );
    });
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

    it("reads every example exactly once, in the order the guide gives", () => {
      // The reading order is this package's index, so an example missing from
      // it is an example nothing walks a reader to. Asserted against the
      // directory listing rather than against a list written here, which would
      // be the same omission one file further away.
      expect(readReadingOrder().toSorted()).toStrictEqual(exampleNames);
    });

    it("hands every example on to the one after it", () => {
      // Inserting into a reading order changes its neighbor, and a dangling or
      // skipped `## Next` is the defect nothing else here would catch: every
      // guide still exists, every guide is still linked, and the walkthrough
      // silently loops or stops halfway.
      const order = readReadingOrder();

      expect(
        order.map((exampleName, index) => {
          const next = order[index + 1];

          return [
            exampleName,
            readNextLink(exampleName).includes(
              next === undefined ? "../../README.md" : `../${next}/README.md`,
            ),
          ];
        }),
      ).toStrictEqual(order.map((exampleName) => [exampleName, true]));
    });
  });

  describe("what the run measured", () => {
    it("traces this package and the projects its imports reach", () => {
      // The closure, stated as a set. What is absent asserts the narrowing
      // rule this run exercises: the package's program really reads four
      // files under `configuration/`, a project root holding a
      // `tsconfig.json` and no `package.json`, and admitting it would reach
      // every toolchain the repository configures. The other refusal — the
      // workspace root — is only reachable through that one here, so this
      // list stands for the first rule rather than for both.
      expect(
        result.projects.map((project) => project.projectName),
      ).toStrictEqual([
        "packages/callidescope-configuration",
        EXAMPLES_DIRECTORY,
        GATED_LEAF_DIRECTORY,
        INHERITED_LIMITS_DIRECTORY,
        "packages/codometer-configuration",
        "packages/logger",
      ]);
    });

    it("measures this package's own fixtures exactly", () => {
      expect(readOwnReport(result).summary).toStrictEqual({
        callableCount: 81,
        cyclicComponentCount: 1,
        edgeCount: 62,
        entryPointCount: 18,
        fileCount: 37,
        maximumDepth: 8,
        projectCount: 1,
        unresolvedCallCount: 2,
      });
    });

    it("credits a nested project's files to the nested project", () => {
      // Ownership is by containment rather than by whichever program asked
      // first, so the two example directories holding a `tsconfig.json` own
      // their own files even though this package's program lists them too.
      // Without that, a limit written in a nested project would be resolved
      // against a project that owns none of the code it describes.
      expect(
        result.projects
          .filter((project) =>
            project.projectName.startsWith(`${EXAMPLES_DIRECTORY}/examples/`),
          )
          .map((project) => [project.projectName, project.summary.fileCount]),
      ).toStrictEqual([
        [GATED_LEAF_DIRECTORY, 2],
        [INHERITED_LIMITS_DIRECTORY, 2],
      ]);
    });

    it("leaves out the file a project excluded, and only in that project", () => {
      // The same generated file was written into both nested projects, and
      // only `gated-leaf` declares `exclude: ["*.generated.ts"]`. Counting
      // what is on disk against what the run traced is what makes this an
      // assertion about the exclusion rather than about two fixed numbers: a
      // glob anchored to the workspace instead of to the project would match
      // neither file and both counts would move, and one that reached across
      // the boundary would drop both.
      const traced = (directory: string): Record<string, number> => ({
        onDisk: readdirSync(path.join(WORKSPACE_ROOT, directory)).filter(
          (name) => name.endsWith(".ts"),
        ).length,
        traced: readProjectReport(result, directory).summary.fileCount,
      });

      expect(traced(GATED_LEAF_DIRECTORY)).toStrictEqual({
        onDisk: 3,
        traced: 2,
      });
      expect(traced(INHERITED_LIMITS_DIRECTORY)).toStrictEqual({
        onDisk: 2,
        traced: 2,
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
      const own = readOwnReport(result);
      const lifted = readOwnReport(
        traceFixtures({ limits: { maximumImplementationCandidates: 8 } }),
      );

      expect(own.summary.unresolvedCallCount).toBe(2);
      expect(lifted.summary.unresolvedCallCount).toBe(1);
      expect(lifted.summary.edgeCount).toBe(own.summary.edgeCount + 3);
    });
  });

  describe("dependency closure", () => {
    it("follows a call into a dependency, and stops at the boundary without it", () => {
      // The closure can only be shown to do something by taking one project
      // out of it. The same fixture heads the same stack either way; what
      // changes is how far the stack goes, which is the whole claim.
      const withoutDependency = traceFixtures({
        exclude: ["packages/callidescope-configuration/**"],
      });

      expect(readClosureFrames(result)).toStrictEqual([
        {
          displayName: "DependencyClosureService.allowsDepth",
          project: EXAMPLES_DIRECTORY,
        },
        {
          displayName: "DependencyClosureService.readDepthLimit",
          project: EXAMPLES_DIRECTORY,
        },
        {
          displayName: "ConfigurationService.resolveConfiguration",
          project: "packages/callidescope-configuration",
        },
        {
          displayName: "ConfigurationService.resolveAllowSpreadFor",
          project: "packages/callidescope-configuration",
        },
      ]);

      expect(readClosureFrames(withoutDependency)).toStrictEqual([
        {
          displayName: "DependencyClosureService.allowsDepth",
          project: EXAMPLES_DIRECTORY,
        },
        {
          displayName: "DependencyClosureService.readDepthLimit",
          project: EXAMPLES_DIRECTORY,
        },
      ]);
    });
  });

  describe("depth findings", () => {
    it("reports every deliberately deep stack this package heads", () => {
      // Narrowed to the stacks this package heads, so it says nothing about
      // how many the whole run reports. The closure's three dependency
      // packages are real code judged by a limit set low enough to make these
      // fixtures findings, so one of them is over it — a fact about those
      // packages rather than about a fixture, and not this suite's to pin.
      expect(
        readDeepStacksFor(result, EXAMPLES_DIRECTORY).map((stack) => ({
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
        {
          depth: 6,
          entry: "ProjectDepthLimitService.judge",
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
        readOwnReport(result).moduleSpreads.map((finding) => ({
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
        readOwnReport(result).misplacedCallables.map((finding) => ({
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
        readOwnReport(result).stacks.map((stack) => stack.entryPointKind),
      );

      expect([...kinds].toSorted()).toStrictEqual([
        "declared",
        "decorated-method",
        "exported-function",
        "lifecycle",
        "module-bootstrap",
        "orphan-root",
      ]);
    });

    it("roots a declared address without taking the caller's own root away", () => {
      // `collect` has a caller, so no rule and no orphan promotion would ever
      // root it — the address in this package's own configuration is the whole
      // reason it heads a stack. `publish` keeps its orphan root beside it,
      // which is the "additive, never subtractive" half of the rule.
      expect(
        readOwnReport(result)
          .stacks.filter((stack) =>
            (stack.frames[0]?.displayName ?? "").startsWith(
              "DeclaredEntryPointsService.",
            ),
          )
          .map((stack) => [stack.frames[0]?.displayName, stack.entryPointKind]),
      ).toStrictEqual([
        ["DeclaredEntryPointsService.publish", "orphan-root"],
        ["DeclaredEntryPointsService.collect", "declared"],
      ]);
    });
  });

  describe("per-project limits", () => {
    it("judges each project against the limit its own configuration settles on", () => {
      // The whole feature in one assertion: four projects, three different
      // depth limits, one report. Two of them are declared in the project's own
      // `callidescope.config.ts` and one is the run's default, inherited by
      // every project that declares nothing.
      expect(
        result.deepStacks.map((stack) => [
          stack.frames[0]?.displayName,
          stack.limit,
        ]),
      ).toStrictEqual([
        ["ComputedMemberService.dispatch", 5],
        ["DeepStackService.quote", 5],
        ["ForwardingStackService.handle", 5],
        ["ConfigurationService.loadConfiguration", 6],
        ["FrameAnnotationsService.trace", 5],
        ["InheritedLimitsService.request", 6],
        ["ProjectDepthLimitService.judge", 5],
        ["GatedLeafService.read", 3],
      ]);
    });

    it("makes a six-frame chain a finding that the inherited limit would pass", () => {
      // `project-depth-limit`'s reason for existing. Six frames pass the six
      // this package would inherit and fail the five it declares, so the same
      // fixture is a finding or not depending on nothing but which file the
      // number was written in.
      const judged = readDeepStacksFor(result, EXAMPLES_DIRECTORY).find(
        (stack) =>
          stack.frames[0]?.displayName === "ProjectDepthLimitService.judge",
      );

      expect(judged?.depth).toBe(6);
      expect(judged?.limit).toBe(5);
    });

    it("gates the leaf below every limit above it", () => {
      // `gated-leaf`'s reason for existing. Four frames and three direct
      // callees are under every limit any project above it carries, and over
      // the two this project wrote for itself.
      const [deep] = readDeepStacksFor(result, GATED_LEAF_DIRECTORY);
      const wide = result.wideCallables;

      expect([
        deep?.frames[0]?.displayName,
        deep?.depth,
        deep?.limit,
      ]).toStrictEqual(["GatedLeafService.read", 4, 3]);
      expect(
        wide.map((finding) => [
          finding.displayName,
          finding.breadth,
          finding.limit,
        ]),
      ).toStrictEqual([["GatedLeafService.read", 3, 2]]);
    });

    it("judges the project that declares nothing by the run's own default", () => {
      // `inherited-limits`' reason for existing, and the reason breadth gates
      // nothing here: the run declares no `maximumBreadth`, so a project
      // inheriting from it inherits no breadth limit rather than some
      // stand-in for one.
      const [deep] = readDeepStacksFor(result, INHERITED_LIMITS_DIRECTORY);

      expect([
        deep?.frames[0]?.displayName,
        deep?.depth,
        deep?.limit,
      ]).toStrictEqual(["InheritedLimitsService.request", 7, 6]);
      expect(
        result.wideCallables.filter((finding) =>
          finding.displayName.startsWith("InheritedLimitsService."),
        ),
      ).toStrictEqual([]);
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
