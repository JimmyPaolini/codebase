import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What conformetry-json is held to: the defaults, and nothing of its own.
 *
 * A leaf analyzer. Its twenty-three callables are real code, but every one of them
 * is reached from `conformetry-generation` above rather than entered directly,
 * so nothing here roots a stack and this project measures zero however much it
 * does. A limit set at what it measures would be zero, which fails on the first
 * stack of any length this package ever grows — a landmine rather than a
 * ratchet — so the workspace default stands until there is a stack to measure.
 *
 * The file exists all the same, because every traced project declares its own:
 * a project's configuration is the complete statement of how it is traced and
 * judged, and "this project overrides nothing" is a statement it has to make
 * rather than one a reader infers from a file that is not there. The spread is
 * that statement.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for every field this file does not override
 * @see docs/adr/0007-complete-project-configurations.md — why a traced project
 * with no file is a refusal
 */
export default {
  ...projectDefaults,
};
