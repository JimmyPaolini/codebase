import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What codependix-boundaries is held to, measured rather than assumed.
 *
 * Twelve frames: a rule, the graph it is judged against, and the edges and
 * cycles that broke it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Five direct callees at the widest — ordinary fan-out rather than a closed
 * enumeration, so the next helper anybody extracts here is what moves the
 * number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 5,
    maximumDepth: 12,
  },
};
