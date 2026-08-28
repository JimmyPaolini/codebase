import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  // Raised from 16 KB deliberately: `generate` gained template resolution and
  // a picker, and `validate` gained the template filter and the two reports
  // that tell "nothing matched" apart from "everything conforms". The breach
  // was 102 bytes, which is the gate doing its job on a package that really
  // grew rather than one that got sloppy. Kept tight for the same reason as
  // its sibling in conformetry-configuration.
  limits: [{ metric: "Compiled JavaScript.size", value: "17 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
};
