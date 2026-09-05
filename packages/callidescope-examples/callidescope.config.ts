import type { CallidescopeConfiguration } from "@callidescope/configuration";

/**
 * The configuration the fixtures in this package are traced with.
 *
 * Deliberately not the workspace's. `configuration/callidescope.config.ts`
 * carries a ratchet — `maximumDepth: 19`, today's worst stack — because its job
 * is to stop the repository getting worse. This one carries the tool's own
 * defaults, because its job is to make the fixtures produce findings: a package
 * whose examples all pass demonstrates nothing.
 *
 * That is also why `configuration/.callidescopeignore` excludes this directory
 * from the workspace run. Fixtures that exist to be too deep would otherwise
 * fail `nx run codebase:callidescope:check`, and silencing them there would
 * mean either raising the workspace limit past what the repository can hold or
 * teaching everyone to ignore a red gate.
 *
 * The two gates therefore sit on opposite flags, which is the clearest
 * demonstration of the split this package can offer:
 *
 * - the workspace runs `--check depth`, and its committed report is published
 *   on `main` only, because the call graph moves on nearly every change;
 * - this package runs `--check reports`, because its fixtures are frozen. A
 *   report here goes stale when a fixture changed, when the resolver did, or
 *   when one of the three dependency packages the run's closure reaches did —
 *   all three of which are exactly what the check should catch.
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  limits: {
    /**
     * Two, against three structural implementations of `LineSink`.
     *
     * The default is eight, and demonstrating the cap at that setting would
     * need nine near-identical classes carrying no other meaning. Lowered here,
     * one small module shows the same behavior.
     */
    maximumImplementationCandidates: 2,
    /**
     * The tool's own default, so the deliberately deep fixtures are findings.
     *
     * Seven frames and up are reported; `DeepStackService` and
     * `ForwardingStackService` are eight apiece, and both are meant to fail.
     */
    maximumDepth: 6,
  },
  /**
   * Each directory under `examples/` is one module, which is what module spread
   * and misplacement are measured against.
   *
   * The default segment is `src`, and by default a module is
   * `src/modules/<name>`. Nothing here lives under either: the fixtures sit in
   * `examples/<name>/`, one directory per example, so each is readable on its
   * own. Naming `examples` as the root segment is what keeps
   * `ModuleSpreadService.orchestrate` reaching five distinct modules instead of
   * collapsing every fixture into one.
   */
  workspaceStructure: { rootModuleSegment: "examples" },

  output: {
    /** The whole run as JSON, which is the machine-readable shape. */
    json: { path: "packages/callidescope-examples/output/report.json" },
    /** The printed trees, spliced between anchors. */
    markdown: { path: "packages/callidescope-examples/output/report.md" },
    /** The same stacks drawn as one flowchart instead of printed. */
    mermaid: { path: "packages/callidescope-examples/output/diagram.md" },
    /** The `## 🔭 Callidescope` section at the bottom of this README. */
    projectReadmes: {},
  },
};

export default callidescopeConfiguration;
