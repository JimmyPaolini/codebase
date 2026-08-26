import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The `defaultTarget` case the codometer README calls out by name.
 *
 * A target here is called `typescript`, and the codebase carries a metric group
 * called `typescript` too. With `defaultTarget: "codebase"`, an unprefixed path
 * is read as the default target's whenever no target name competes for it — so
 * `typescript.interfaces` is the **codebase's** six interfaces, because the
 * `typescript` target has no `interfaces` metric of its own to disagree with.
 *
 * `typescript.files` under this same configuration is the opposite case: both
 * readings exist, so it is refused rather than chosen between. That one is
 * [ambiguous.config.ts](./ambiguous.config.ts), written against `markdown` for
 * the same reason.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/limits/default-target.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  defaultTarget: "codebase",
  limits: [{ label: "Interfaces", metric: "typescript.interfaces", value: 10 }],
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["size"],
      include: ["typescript/**/*.ts"],
      name: "typescript",
    },
  ],
};

export default codometerConfiguration;
