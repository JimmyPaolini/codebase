/**
 * What logger is held to, measured rather than assumed.
 *
 * Four frames, which is this package reaching its own transport. Every other
 * project's calls into it are ignored by the run — `ignoreCallees` in
 * `configuration/callidescope.config.ts` names `LoggerService.*` — so what is
 * gated here is the logger judged on its own rather than as the callee sitting
 * behind everything else.
 *
 * That ignore is also what makes it four rather than five: it cuts the edge
 * from `LoggerService.log` to the assertion beneath it. So a run configured
 * without it measures five and reports this package —
 * `packages/callidescope-examples` is the one that does, deliberately, and its
 * committed report carries the finding. Four is still the right number here,
 * because the gate is run with the workspace configuration and nothing else
 * is.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * No `maximumBreadth`. The widest callable here reaches 2, which is ordinary
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
    maximumDepth: 4,
  },
};
