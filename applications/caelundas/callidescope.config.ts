/**
 * What caelundas is held to, measured rather than assumed.
 *
 * Sixteen frames down `CaelundasCommand.run`, the astronomical-event
 * detection pipeline this application exists to run. Twelve is the widest
 * callable: `TwilightsDetectorService.buildTwilightTransitionEvents` checks
 * and builds one event per twilight boundary — astronomical, nautical, and
 * civil dawn and dusk — so its width is that fixed set of six boundaries
 * rather than a budget to hold down.
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
    maximumBreadth: 12,
    maximumDepth: 16,
  },
};
