import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What conformetry-languages is held to, measured rather than assumed.
 *
 * Four frames and eleven direct callees, both measured by a run scoped to
 * this project and its dependency closure, and both set **at** what they
 * measured rather than above it: a stack or a callable at either limit
 * passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * That scoped depth is the one this file is for. The whole-workspace report
 * shows thirteen for the same package, and that is a different question: it
 * traces the Jupyter Language descending into a notebook's markdown cells from
 * an entry point above this package, where a scoped run enters at this
 * package's own surface. Declaring the workspace figure would leave nine
 * frames of headroom and gate nothing.
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
    maximumDepth: 4,
  },
};
