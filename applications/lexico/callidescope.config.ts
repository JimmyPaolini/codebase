/**
 * What lexico is held to, measured rather than assumed.
 *
 * Nine frames from a route down to a rendered form. Nine is also the widest
 * callable: `dispatchFormTransform` routes to one transform per part of
 * speech — verb, noun, adjective, and the rest — so its width is that fixed
 * set of parts of speech rather than a budget to hold down.
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
    maximumBreadth: 9,
    maximumDepth: 9,
  },
};
