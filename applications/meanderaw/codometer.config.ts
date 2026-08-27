import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "64 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/applications/meanderaw/**/*.js"],
    },
  ],
};
