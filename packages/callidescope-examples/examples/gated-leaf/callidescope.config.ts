import type { CallidescopeConfiguration } from "@callidescope/configuration";

/**
 * What one leaf project says about itself, and nothing else.
 *
 * A project configuration may set `entryPoints`, `limits.maximumDepth`,
 * `limits.maximumBreadth`, and `exclude`. Everything else describes the run or
 * the shape of the graph, and a project file that sets one of those is refused
 * before anything is traced — so **never spread the workspace limits into this
 * object**. `spreadThreshold` travels with them, and carrying it is exactly
 * that refusal.
 *
 * Nothing is lost by writing only the overrides. Limits fall back one at a
 * time rather than as an object, so the two named here are the two this project
 * chose and every other one still comes from the run.
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  entryPoints: {
    /**
     * The one address this project publishes.
     *
     * Without it this project roots nothing at all: `read` is called by
     * `inherited-limits`, so no rule promotes it, and a project that roots
     * nothing measures zero however deep its code runs. Declaring the address
     * is what makes a limit on this project mean anything.
     */
    addresses: [
      "packages/callidescope-examples/examples/gated-leaf/gated-leaf.ts#GatedLeafService.read",
    ],
  },
  limits: {
    /** Two, against the three callees `read` reaches directly. */
    maximumBreadth: 2,
    /** Three, against the four frames `read` heads. */
    maximumDepth: 3,
  },
};

export default callidescopeConfiguration;
