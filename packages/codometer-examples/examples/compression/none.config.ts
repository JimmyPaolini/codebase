import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same files uncompressed — the bytes on disk.
 *
 * Useful as the denominator: it is what the gzip and brotli numbers are a
 * fraction of, and it is what a limit should be written against when the files
 * are not served over a network at all.
 *
 * ```bash
 * codometer --directory corpus --config examples/compression/none.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  python: { command: "uv run python" },
  targets: [
    {
      analyses: ["size"],
      compression: "none",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
  ],
};

export default codometerConfiguration;
