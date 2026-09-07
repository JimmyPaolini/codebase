/**
 * What lexico-components is held to, measured rather than assumed.
 *
 * Three frames and seven callees, which is what a React component library
 * measures: nothing calls deeply, and a composed component calls widely.
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
    maximumBreadth: 7,
    maximumDepth: 3,
  },
};
