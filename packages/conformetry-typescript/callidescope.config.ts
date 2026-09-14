import {
  projectDefaults,
  workspaceLimits,
} from "../../configuration/callidescope.config.js";

/**
 * What conformetry-typescript is held to: the workspace's own depth, and a
 * breadth measured here.
 *
 * A leaf analyzer. Its forty callables are real code, but every one of them
 * is reached from `conformetry-generation` above rather than entered directly,
 * so nothing here roots a stack and this project measures zero depth however
 * much it does. A depth limit set at what it measures would be zero, which
 * fails on the first stack of any length this package ever grows — a landmine
 * rather than a ratchet — so the workspace default stands until there is a
 * stack to measure.
 *
 * Breadth does not have that problem: a callable counts its own direct
 * callees whether or not anything ever calls it, so this leaf still has a
 * real widest to gate. Six direct callees at the widest — ordinary fan-out
 * rather than a closed enumeration, so the next helper anybody extracts here
 * is what moves the number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for every field this file does not override
 * @see docs/adr/0007-complete-project-configurations.md — why a traced project
 * with no file is a refusal
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 6,
    maximumDepth: workspaceLimits.maximumDepth,
  },
};
