import type { CallidescopeConfiguration } from "@callidescope/configuration";

/**
 * What this package says about itself, as opposed to what it runs.
 *
 * Two files at this root, two roles. `callidescope.workspace.config.ts` beside
 * this one is the *workspace* configuration a run of these fixtures is handed:
 * it names the output destinations, the module layout, and the default limits
 * every project the run reaches falls back to. This file is this *project's*
 * own, discovered the way every project's is — by name, at the root holding the
 * `tsconfig.json` that makes it a project — and it may only say the four things
 * a project is entitled to say about itself.
 *
 * ## Never spread the workspace limits
 *
 * A project writes the limits it overrides and nothing else:
 *
 * ```ts
 * limits: { maximumDepth: 5 }
 * ```
 *
 * Spreading a workspace limits object into this one is refused before anything
 * is traced, because such an object carries limits that shape the graph —
 * `spreadThreshold`, `maximumImplementationCandidates` — and two projects that
 * disagreed about those would be describing two different graphs over the same
 * shared code.
 *
 * Nothing is lost by writing only the override. Limits fall back one at a time
 * rather than as an object, so `maximumBreadth` and every analysis-shaping
 * limit still come from the run. And a spread would have nothing left to
 * contribute anyway: depth and breadth are the only two a project may set, so
 * it would supply the field being overridden plus the one that gets the file
 * rejected.
 *
 * ## Why five
 *
 * Six is what this package would inherit — `callidescope.workspace.config.ts`
 * declares it, and the three dependency packages this run reaches are judged by
 * it. Five is one tighter, and the difference is the example: every finding
 * this package produces carries `"limit": 5`, the dependency packages' carry
 * `"limit": 6`, and `examples/project-depth-limit` is a six-frame chain that is
 * a finding under one number and not the other. An override that restated the
 * number it already inherits would be indistinguishable from having no file at
 * all.
 *
 * @see examples/project-depth-limit/README.md — the limit, and what it changed
 * @see examples/declared-entry-points/README.md — the address, and the kind
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  entryPoints: {
    /**
     * One address, for a callable no rule would have rooted.
     *
     * `DeclaredEntryPointsService.collect` is called from inside this package,
     * so orphan promotion never sees it and it would head no stack of its own.
     * Naming it here roots it under the `declared` kind, which is how a package
     * states the surface it means to be measured on.
     */
    addresses: [
      "packages/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts#DeclaredEntryPointsService.collect",
    ],
  },
  limits: {
    /** Five, one under the six this package would otherwise inherit. */
    maximumDepth: 5,
  },
};

export default callidescopeConfiguration;
