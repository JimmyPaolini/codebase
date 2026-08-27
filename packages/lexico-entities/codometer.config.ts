import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "32 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/packages/lexico-entities/**/*.js"],
    },
  ],
};
