/**
 * What callidescope-output is held to, measured rather than assumed.
 *
 * Ten frames from a finding to the markdown that states it.
 *
 * No `maximumBreadth`. The project's widest callable is
 * `MarkdownReportService.renderRun`, and its width is one callee per section
 * of the report it assembles — the subsection prefix, the scoreboard rows,
 * then the summary, project index, headroom, stacks, spread, breadth, and
 * misplaced sections in turn. That is a width that grows by one every time a
 * report gains a section rather than a budget to hold down, and it grew by
 * three that way while this file was being written: the workspace project
 * index and depth-headroom scoreboard arrived and took it from six to nine.
 * Gating it would have fired on exactly that addition and said nothing about
 * the shape of the code. The measurement is deliberately not quoted as a
 * figure to rely on, because nothing would check it — a sentence naming a
 * number no gate enforces goes false the first time somebody adds a section,
 * which is the decay this whole arrangement exists to end. Run `breadth`
 * against this project to read it. Breadth is left out of this gate until
 * there is a number worth holding.
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
    maximumDepth: 10,
  },
};
