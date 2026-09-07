/**
 * What synchronization is held to, measured rather than assumed.
 *
 * Ten frames down `SynchronizationCommand.run`, the top-level command every
 * synchronizer runs beneath. Nine is the widest callable:
 * `SynchronizationCommand.synchronize` dispatches to one `synchronize` method
 * per registered synchronizer, so its width is that fixed roster rather than
 * a budget to hold down.
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
    maximumDepth: 10,
  },
};
