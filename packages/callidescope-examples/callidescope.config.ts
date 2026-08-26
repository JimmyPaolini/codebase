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
 * - this package runs `--check reports`, because its traced source is frozen
 *   fixture code. A report here goes stale only when a fixture changed or the
 *   resolver did — which is exactly what the check should catch.
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
