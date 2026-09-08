import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What conformetry-validation is held to, measured rather than assumed.
 *
 * Twelve frames to measure an instance against its template, and ten callees in
 * the comparison that reports the difference.
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
    maximumBreadth: 10,
    maximumDepth: 12,
  },
};
