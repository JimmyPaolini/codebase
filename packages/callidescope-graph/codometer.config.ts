import { defineProject } from "../../configuration/codometer.config.js";

export default defineProject({
  limits: [{ metric: "Compiled JavaScript.size", value: "64 KB" }],
});
