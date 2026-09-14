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
 * Two direct callees at the widest: `buildCommentResult` filters a breach
 * list and then maps it, and `CustomizationService.map(…)`'s own step does
 * the ordinary array-method chaining every result builder here takes.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 2,
    maximumDepth: 5,
  },
};
