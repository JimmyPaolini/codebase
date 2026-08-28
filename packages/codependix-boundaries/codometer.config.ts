import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

/**
 * 16 KB rather than the 9 KB this package carried while it only evaluated
 * rules.
 *
 * A deliberate raise rather than a breach worked around: the package absorbed
 * `codependix-boundary-check` — the four graph adapters and the per-level
 * orchestration — so it now holds roughly twice the code it was measured for.
 * The number was calibrated for a package that judged a graph somebody else
 * built; it now builds them too.
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
