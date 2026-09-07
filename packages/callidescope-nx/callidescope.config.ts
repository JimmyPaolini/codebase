/**
 * What callidescope-nx is held to, measured rather than assumed.
 *
 * Seventeen is the workspace's own number, and two of the three stacks pinning
 * it are this project's `depthExecutor` and `breadthExecutor`. So this override
 * changes nothing today and is written down anyway: the workspace number is
 * going to come down, and this is where the reason it cannot come down past
 * seventeen yet is recorded.
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
    maximumDepth: 17,
  },
};
