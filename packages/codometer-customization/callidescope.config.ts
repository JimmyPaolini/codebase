import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What codometer-customization is held to, measured rather than assumed.
 *
 * Five frames to evaluate a configured custom counter.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * One direct callee at the widest — every callable this project owns calls at
 * most one other directly. One is also the tool's own floor: `maximumBreadth`
 * refuses zero, so this is already the tightest number the gate can hold,
 * with no number below it to fail against.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 1,
    maximumDepth: 5,
  },
};
