import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A limit that breaches at `severity: "warn"`.
 *
 * The breach is printed and the exit code is left alone, which is how a
 * repository watches a number approach a gate it has not reached yet. Compare
 * [fail.config.ts](./fail.config.ts), which is the same limit at the default
 * severity and exits 1.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/limits/warn.config.ts --check limits
 * echo $?   # 0
 * ```
 *
 * Note the `codebase.` prefix. A path with no target name on the front binds to
 * nothing at all unless `defaultTarget` names the target it belongs to — even
 * where, as here, only one target was measured and there is nothing it could
 * be confused with. See [default-target.config.ts](./default-target.config.ts).
 */
const codometerConfiguration: CodometerConfiguration = {
  limits: [{ metric: "codebase.linesOfCode", severity: "warn", value: 10 }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
