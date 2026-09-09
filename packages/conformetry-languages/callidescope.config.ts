import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What conformetry-languages is held to, measured rather than assumed.
 *
 * Thirteen frames: the Jupyter Language descending into a notebook's markdown
 * cells, through the markdown tree walk that matches a node against its
 * template. It is the deepest stack in the package because Jupyter is the one
 * Language that composes the others.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Eleven direct callees at the widest, among the comparison walks — fan-out
 * shaped by the syntax tree they descend rather than a budget anybody chose.
 * The next node kind a Language learns to compare is what moves this number
 * now.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 11,
    maximumDepth: 13,
  },
};
