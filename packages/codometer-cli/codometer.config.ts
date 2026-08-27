import { defineProject } from "../../configuration/codometer.config.js";

/**
 * What this command-line host is measured by.
 *
 * The `configuration` command took the compiled output past the 32 KB rung it
 * used to clear, at 34 KB. 48 KB is the next rung on the ladder the workspace
 * configuration describes, and the ladder is coarse at this size — read the
 * headroom as the gap between rungs rather than as a budget anyone intended.
 */
export default defineProject({
  limits: [{ metric: "Compiled JavaScript.size", value: "48 KB" }],
});
