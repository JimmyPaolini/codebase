import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What codometer-size is held to, measured rather than assumed.
 *
 * Three, the other figure spec #589 quotes: it compresses a file set and
 * measures the result, and that is the whole of it. Held at seventeen it was
 * gated by nothing.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Two direct callees at the widest — ordinary fan-out rather than a closed
 * enumeration, so the next helper anybody extracts here is what moves the
 * number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 2,
    maximumDepth: 3,
  },
};
