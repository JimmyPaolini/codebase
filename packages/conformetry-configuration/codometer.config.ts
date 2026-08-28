import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  // Raised from 24 KB deliberately, not to get one check to pass: this package
  // gained the template pickers, the reserved-name rule, and the rule deciding
  // which instance groups a host with no project graph can locate. There is no
  // dead code to trim behind the breach — the output grew because the package
  // did — so the number was simply wrong for what this package now holds. The
  // headroom is kept tight on purpose, so the next unplanned growth still
  // fails here rather than being absorbed silently.
  limits: [{ metric: "Compiled JavaScript.size", value: "26 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
};
