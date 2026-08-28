import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "96 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
};
