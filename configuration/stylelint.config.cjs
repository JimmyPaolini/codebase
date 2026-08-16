/**
 * Stylelint Configuration
 * Purpose: CSS linting with Tailwind CSS v3 support for all projects in the codebase
 * Usage (Check): nx run <project>:stylelint
 * Usage (Fix): nx run <project>:stylelint --configuration=write
 * CI Workflow: .github/workflows/lint-codebase.yml
 * @see https://stylelint.io/
 */

module.exports = {
  extends: [
    "stylelint-config-standard", // Standard CSS rules
    "stylelint-config-tailwindcss", // Tailwind CSS support
  ],
  rules: {
    // Allow Tailwind CSS v3 directives (@tailwind, @apply, @layer, etc.)
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "config",
          "screen",
          "variants",
          "responsive",
          "utility",
        ],
      },
    ],
    // Allow component-specific class naming (e.g., .Button, .card-hover)
    "selector-class-pattern": null,
    // Allow Tailwind custom properties (e.g., --tw-ring-offset-shadow)
    "custom-property-pattern": null,
    // Allow shorthand properties for Tailwind utilities
    "declaration-block-no-redundant-longhand-properties": null,
  },
};
