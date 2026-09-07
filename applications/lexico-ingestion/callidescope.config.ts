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
 * Eight is the widest callable:
 * `PronunciationEcclesiasticalService.processEcclesiasticalCharacter`
 * switches on one branch per Latin letter it re-classifies for ecclesiastical
 * pronunciation, so its width is that fixed alphabet rather than a budget to
 * hold down.
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
    maximumDepth: 17,
  },
};
