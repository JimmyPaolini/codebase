import codometerConfiguration, {
  compiledJavaScriptTarget,
} from "../../configuration/codometer.config.js";

export default {
  ...codometerConfiguration,
  // 🎯 One rung up from 128 KB, where the `mosaic` family's move onto a
  // lattice put it: `meander-lattice`, `mosaic-tile`, and `mosaic-naming`
  // are three modules where there were none, and the compiled output
  // measured 130,749 bytes against the old ceiling. The ladder these limits
  // sit on is roughly doubling — 6, 12, 32, 128, 256, 384 — and 192 is the
  // next step that leaves real headroom without skipping to twice the
  // measurement.
  limits: [{ metric: "Compiled JavaScript.size", value: "192 KB" }],
  targets: [
    {
      ...compiledJavaScriptTarget,
      include: ["dist/**/*.js"],
    },
  ],
};
