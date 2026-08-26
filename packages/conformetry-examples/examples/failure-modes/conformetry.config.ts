import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH = "packages/conformetry-examples/examples/failure-modes";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "Two things conformetry lets through, on purpose or not",
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    // `owner` is never supplied — not as an input, and not as a substitution
    // here. That is the pitfall this example reproduces: mustache renders an
    // unknown placeholder as an empty string rather than failing, so the hole
    // is silent on both sides of the loop.
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "pitfalls",
    templatePath: `${EXAMPLE_PATH}/templates/pitfalls`,
  },
];

export default conformetryConfiguration;
