import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What conformetry-languages is held to, measured rather than assumed.
 *
 * Four frames, measured by a run scoped to this project and its dependency
 * closure, and set **at** what it measured rather than above it: a stack at
 * the limit passes, so this gate is green the day it arrives and the number is
 * a starting point to ratchet down from rather than a target to grow into.
 *
 * That scoped number is the one this file is for. The whole-workspace report
 * shows thirteen for the same package, and that is a different question: it
 * traces the Jupyter Language descending into a notebook's markdown cells from
 * an entry point above this package, where a scoped run enters at this
 * package's own surface. Declaring the workspace figure would leave nine
 * frames of headroom and gate nothing.
 *
 * No `maximumBreadth`. The widest callables here are the comparison walks,
 * whose fan-out is the shape of the syntax tree they descend rather than a
 * budget anybody chose; gating it would fire on the next node kind a Language
 * learns to compare and say nothing about the code. Run `breadth` against this
 * project to read it. Breadth is left out of this gate until there is a number
 * worth holding.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: undefined,
    maximumDepth: 4,
  },
};
