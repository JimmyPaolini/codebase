import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

/**
 * 16 KB rather than the 9 KB this package carried while it only evaluated
 * rules.
 *
 * A deliberate raise rather than a breach worked around. The number was
 * calibrated for a package that judged a graph somebody else built; it now
 * holds the four graph adapters and the per-level orchestration in
 * `src/modules/boundary-check/` as well, which is roughly twice the code.
 */
export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "16 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/packages/codependix-boundaries/**/*.js"],
    },
  ],
};
