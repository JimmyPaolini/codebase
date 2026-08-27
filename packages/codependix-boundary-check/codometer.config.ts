import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  limits: [{ metric: "Compiled JavaScript.size", value: "8 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/packages/codependix-boundary-check/**/*.js"],
    },
  ],
};
