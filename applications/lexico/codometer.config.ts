import { defineProject } from "../../configuration/codometer.config.js";

// 🎯 Targets

/** How each target reaches the tree the build is written to, two levels up. */
const directory = "../..";

/** What every target below measures, and how. */
const analyses = ["size"] as const;

/** Compression every measured size is reported after. */
const compression = "gzip";

/**
 * What this application is measured by.
 *
 * It overrides `targets` because its build does not compile to one tree: the
 * four below partition it rather than overlapping, so the totals in the pull
 * request report add up. The entry chunk is what every visitor downloads, the
 * route chunks are what they download on navigation, and the server output
 * never reaches the browser at all but still shows cold-start cost. Measuring
 * only the entry chunk — as this configuration once did — reported 120 KB of a
 * 372 KB build. A single derived `**\/*.js` target would also miss the CSS
 * entirely.
 *
 * Everything else — the convention counters, the Python command — is inherited
 * rather than restated. Before this file called `defineProject` it replaced the
 * shared configuration outright, and silently reported none of them.
 *
 * Every limit is a rung on the ladder `configuration/codometer.config.ts`
 * describes. The ladder is coarse this far up, so two of these sit well clear
 * of what they gate: the entry chunk measures 124 KB against 192, and the CSS
 * measures 16 KB against 24, because 128 KB and 16 KB are the rungs below and
 * both fall inside a twentieth of the measured size. Read them as the ladder
 * being wide here rather than as a budget anyone intended.
 */
export default defineProject({
  limits: [
    { metric: "Client entry JavaScript.size", value: "192 KB" },
    { metric: "Client route JavaScript.size", value: "96 KB" },
    { metric: "Client CSS.size", value: "24 KB" },
    { metric: "Server JavaScript.size", value: "192 KB" },
  ],
  targets: [
    {
      analyses: [...analyses],
      compression,
      directory,
      include: ["dist/applications/lexico/client/assets/index-*.js"],
      name: "Client entry JavaScript",
    },
    {
      analyses: [...analyses],
      compression,
      directory,
      include: [
        "dist/applications/lexico/client/**/*.js",
        "!dist/applications/lexico/client/assets/index-*.js",
      ],
      name: "Client route JavaScript",
    },
    {
      analyses: [...analyses],
      compression,
      directory,
      include: ["dist/applications/lexico/client/**/*.css"],
      name: "Client CSS",
    },
    {
      analyses: [...analyses],
      compression,
      directory,
      include: ["dist/applications/lexico/server/**/*.js"],
      name: "Server JavaScript",
    },
  ],
});
