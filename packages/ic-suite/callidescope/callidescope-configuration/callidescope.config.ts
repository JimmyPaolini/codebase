import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-configuration is held to, measured rather than assumed.
 *
 * Eight frames is nearly all of this package — it reads a file, plans a run
 * from flags, and resolves every traced project's limits — and eight is also
 * one resolver's fan-out over the fields it merges.
 *
 * Six was the number before this package published a single facade, and the
 * deepest stacks are the same stacks they always were: `ConfigurationService`
 * forwarding to the collaborator that answers stands one frame in front of
 * each of them. One frame is what the whole layer having one public entry
 * point costs, and it is paid once per stack that crosses it — measured, not
 * assumed: the reader a collaborator is handed makes no difference to it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 8,
    maximumDepth: 8,
  },
};
