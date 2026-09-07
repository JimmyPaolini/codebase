/**
 * What codometer-output is held to, measured rather than assumed.
 *
 * Sixteen is the widest callable anywhere in this repository:
 * `MarkdownService.buildBadgeGroups`, which assembles a badge for every measure
 * a report holds. It is written down here so that narrowing it shows up as a
 * change to this line rather than as nothing at all.
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
    maximumBreadth: 16,
    maximumDepth: 11,
  },
};
