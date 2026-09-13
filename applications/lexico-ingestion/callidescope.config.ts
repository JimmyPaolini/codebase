import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What lexico-ingestion is held to, measured rather than assumed.
 *
 * Seventeen is the workspace's own number, and `LexicoIngestionCommand.run`
 * is one of the three stacks pinning it — the workspace configuration names
 * this one alongside callidescope-nx's `depthExecutor` and `breadthExecutor`.
 * So this override changes nothing today and is written down anyway: the
 * workspace number is going to come down, and lowering this one is ordinary
 * follow-up work this task does not do — spec #589 puts it out of scope.
 *
 * No `maximumBreadth`. Two callables tie at the project's widest, eight, and
 * they are not the same shape.
 * `PronunciationEcclesiasticalService.processEcclesiasticalCharacter` switches
 * on one branch per Latin letter it re-classifies for ecclesiastical
 * pronunciation — a fixed alphabet. `LatinLibraryProvider.ingest` is ordinary
 * sequential orchestration: read the cached index, build and expand authors,
 * sort and filter them, process each author's page, write each author's
 * texts, clean up metadata — a width that grows by one every time a step is
 * added to that pipeline, rather than a budget. A tie decides against
 * gating: holding the fixed alphabet down would also hold down the
 * orchestrator sitting beside it at the same number, and gating it would
 * fire on the next ordinary step and say nothing about the shape of the
 * code. The measurement is deliberately not quoted here, because nothing
 * would check it — a sentence naming a number no gate enforces goes false
 * the first time somebody adds a step, which is the decay this whole
 * arrangement exists to end. Run `breadth` against this project to read it.
 * Breadth is left out of this gate until there is a number worth holding.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack at the limit passes, so
 * this gate is green the day it arrives and the number is a starting point to
 * ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: undefined,
    maximumDepth: 17,
  },
};
