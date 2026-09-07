/**
 * What conformetry-languages is held to, measured rather than assumed.
 *
 * Thirteen frames: the Jupyter Language descending into a notebook's markdown
 * cells, through the markdown tree walk that matches a node against its
 * template. It is the deepest stack in the package because Jupyter is the one
 * Language that composes the others.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * No `maximumBreadth`. The widest callables here are the comparison walks,
 * whose fan-out is the shape of the syntax tree they descend rather than a
 * budget anybody chose; gating it would fire on the next node kind a Language
 * learns to compare and say nothing about the code. Run `breadth` against this
 * project to read it. Breadth is left out of this gate until there is a number
 * worth holding.
 *
 * @see configuration/callidescope.config.ts — the limits this file falls back
 * to for everything it does not name, and why it neither spreads nor imports
 * them
 */
export default {
  limits: {
    maximumDepth: 13,
  },
};
