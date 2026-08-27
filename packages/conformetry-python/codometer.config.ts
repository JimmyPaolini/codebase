import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "6 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/packages/conformetry-python/**/*.js"],
    },
  ],
};
