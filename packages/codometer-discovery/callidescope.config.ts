import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What codometer-discovery is held to, measured rather than assumed.
 *
 * Seven frames of gitignore-aware walking, and seven callees in the match that
 * decides each file.
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
    maximumBreadth: 7,
    maximumDepth: 7,
  },
};
