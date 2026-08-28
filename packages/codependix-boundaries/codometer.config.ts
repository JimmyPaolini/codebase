import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

/**
 * 32 KB, two rungs above the 16 KB this package declared when it was written.
 *
 * That 16 KB was itself a deliberate raise from 9 KB rather than a breach
 * worked around: the number was calibrated for a package that judged a graph
 * somebody else built, and it now holds the four graph adapters and the
 * per-level orchestration in `src/modules/boundary-check/` as well, which is
 * roughly twice the code. The two-rung raise every project in the workspace
 * took is applied on top of that, not instead of it.
 */
export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "32 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
};
