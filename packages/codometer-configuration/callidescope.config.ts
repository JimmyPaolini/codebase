/**
 * What codometer-configuration is held to, measured rather than assumed.
 *
 * Eight frames to read a configuration and bind the limits it declares, and
 * seven callees in `resolveConfiguration`, which assembles the resolved object
 * a field at a time.
 *
 * Seven rather than the six a run pointed at this package alone reports. The
 * gate widens its trace along the Nx dependency graph, and the wider program
 * resolves one more callee of that resolver — so the gate's number is the one
 * written down here, because the gate is the thing that enforces it.
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
    maximumDepth: 8,
  },
};
