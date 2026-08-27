import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "12 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/packages/conformetry-typescript/**/*.js"],
    },
  ],
};
