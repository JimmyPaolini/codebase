/**
 * What callidescope-configuration is held to, measured rather than assumed.
 *
 * Six frames is nearly all of this package — it reads a file and resolves
 * limits — and eight is one resolver's fan-out over the fields it merges.
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
    maximumBreadth: 8,
    maximumDepth: 6,
  },
};
