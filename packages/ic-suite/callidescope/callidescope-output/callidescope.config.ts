import { projectDefaults } from "../../../../configuration/callidescope.config.js";

/**
 * What callidescope-output is held to, measured rather than assumed.
 *
 * Thirteen frames from a destination to the last word written into it:
 * `WriteDestinationsService.syncDestinations` down through the project
 * section, the stacks, each stack, each frame, and the summary each frame
 * shortens. Ten was this package's shape before it took the write
 * destinations and the finding report over from the command-line host, and
 * the chain those two root is longer than anything the renderers root on
 * their own. The stack did not get deeper; this package acquired it whole.
 *
 * Seven direct callees at the widest, `MarkdownReportService.renderRun`,
 * roughly one callee per section of the report it assembles. The next
 * section this report gains is what moves the number now — exactly the
 * addition the ratchet exists to surface.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 7,
    maximumDepth: 13,
  },
};
