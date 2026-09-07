/**
 * What conformetry-configuration is held to, measured rather than assumed.
 *
 * Thirteen frames, which is more than any other configuration reader here: this
 * one resolves templates, instances, and the tags that select them.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * No `maximumBreadth`. The widest callable here reaches 5, which is ordinary
 * fan-out rather than a budget: gating it would fire on the next helper anybody
 * calls and say nothing about the shape of the code. Breadth is left out of
 * this gate until there is a number worth holding.
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
