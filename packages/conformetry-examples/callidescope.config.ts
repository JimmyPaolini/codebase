/**
 * What conformetry-examples is held to, measured rather than assumed.
 *
 * Thirteen frames over two callables of its own. The depth is real and almost
 * none of it is here: an example's entry point descends through the fifteen
 * projects this package's closure reaches.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — the limits this file falls back
 * to for everything it does not name, and why it neither spreads nor imports
 * them
 */
export default {
  limits: {
    maximumBreadth: 6,
    maximumDepth: 13,
  },
};
