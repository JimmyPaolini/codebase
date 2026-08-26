import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same files at brotli quality 11, so the difference against
 * [gzip](./gzip.config.ts) is visible rather than asserted.
 *
 * ```bash
 * codometer --directory corpus --config examples/compression/brotli.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["size"],
      compression: "brotli",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
  ],
};

export default codometerConfiguration;
