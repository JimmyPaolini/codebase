import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a documented declaration's comment may run.
 *
 * Opt-in like every other check: a configuration naming no `documentation`
 * block measures and reports nothing extra. Once configured, **every**
 * declaration carrying a `/**` comment is measured and reported — breached or
 * not — so the report shows the headroom rather than only the failures. A
 * declaration with no doc comment at all is never measured and never appears.
 *
 * `kinds` is what stops one repository-wide number having to be either loose
 * enough to permit a property essay or tight enough to forbid a class overview
 * that should exist. The corpus measures 26 documented declarations under this
 * configuration and two of them breach: `CatalogService`, whose eight-line
 * overview is longer than a class's 4, and `Receipt.blank`, whose seven-line
 * note is longer than a method's 2. Every other declaration is reported too,
 * with its headroom.
 *
 * What is **not** here is as informative: a module-level `const`, including one
 * holding an arrow function, is not a documented declaration and is never
 * measured — so `priceLine` and `DEFAULT_CURRENCY` are absent from the report
 * whatever comments they carry.
 *
 * A documentation breach is gated by the same `--check limits` flag as every
 * other limit; there is no separate flag for it, and no `metric` path to write
 * — the declarations are found rather than addressed.
 *
 * ```bash
 * codometer --directory examples/corpus --config examples/documentation/codometer.config.ts --check limits
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  documentation: {
    default: 3,
    kinds: { class: 4, interface: 3, method: 2, property: 2 },
    severity: "fail",
    unit: "lines",
  },
  python: { command: "uv run python" },
};

export default codometerConfiguration;
