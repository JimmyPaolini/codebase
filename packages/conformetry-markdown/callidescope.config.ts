import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What conformetry-markdown is held to, measured rather than assumed.
 *
 * Three frames. A single-language analyzer, and shaped like one.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * No `maximumBreadth`. The widest callable here is ordinary fan-out rather
 * than a budget: gating it would fire on the next helper anybody extracts and
 * say nothing about the shape of the code. The measurement is deliberately not
 * quoted here, because nothing would check it — a sentence naming a number no
 * gate enforces goes false the first time somebody splits a callable, which is
 * the decay this whole arrangement exists to end. Run `breadth` against this
 * project to read it. Breadth is left out of this gate until there is a number
 * worth holding.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: undefined,
    maximumDepth: 3,
  },
};
