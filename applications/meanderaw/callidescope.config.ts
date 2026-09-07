/**
 * What meanderaw is held to, measured rather than assumed.
 *
 * Sixteen frames down `DrawCommand.run`, not the fourteen a run pointed at
 * this project alone reports. The gate widens its trace along the Nx
 * dependency graph, and the wider program resolves two more frames behind
 * that command — so the gate's number is the one written down here, because
 * the gate is the thing that enforces it.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * No `maximumBreadth`. The widest callable is `MeanderGenerationService.generate`,
 * which walks eight validators in sequence before building and rendering a
 * pattern — ordinary fan-out that grows by one every time a new validation
 * rule is added, rather than a budget. Gating it would fire on the next such
 * rule and say nothing about the shape of the code. The measurement is
 * deliberately not quoted here, because nothing would check it — a sentence
 * naming a number no gate enforces goes false the first time somebody adds a
 * rule, which is the decay this whole arrangement exists to end. Run
 * `breadth` against this project to read it. Breadth is left out of this
 * gate until there is a number worth holding.
 *
 * @see configuration/callidescope.config.ts — the limits this file falls back
 * to for everything it does not name, and why it neither spreads nor imports
 * them
 */
export default {
  limits: {
    maximumDepth: 16,
  },
};
