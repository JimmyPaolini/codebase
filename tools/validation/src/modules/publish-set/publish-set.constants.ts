// ♟️ Constants

import type { PublishSetPackage } from "./publish-set.types";

/**
 * Success message logged when all tarballs and CLI binaries pass verification.
 */
export const PUBLISH_SET_SUCCESS_MESSAGE =
  "✔ Verified all 28 publish set package tarballs and 4 CLI binaries cleanly";

/**
 * Message logged when tarballs directory is missing.
 */
export const TARBALLS_DIRECTORY_MISSING_MESSAGE =
  "❌ Tarballs directory dist/tarballs does not exist. Run 'nx run-many -t pack' first.";

/**
 * The 28 publishable packages across the 4 toolchains in the ic-suite.
 */
export const PUBLISH_SET_PACKAGES: readonly PublishSetPackage[] = [
  // Conformetry (8)
  {
    binary: "conformetry",
    name: "@conformetry/cli",
    tarball: "conformetry-cli",
  },
  {
    name: "@conformetry/configuration",
    tarball: "conformetry-configuration",
  },
  {
    name: "@conformetry/core",
    tarball: "conformetry-core",
  },
  {
    name: "@conformetry/generation",
    tarball: "conformetry-generation",
  },
  {
    name: "@conformetry/languages",
    tarball: "conformetry-languages",
  },
  {
    name: "@conformetry/nx",
    tarball: "conformetry-nx",
  },
  {
    name: "@conformetry/output",
    tarball: "conformetry-output",
  },
  {
    name: "@conformetry/validation",
    tarball: "conformetry-validation",
  },

  // Codometer (6)
  {
    binary: "codometer",
    name: "@codometer/cli",
    tarball: "codometer-cli",
  },
  {
    name: "@codometer/configuration",
    tarball: "codometer-configuration",
  },
  {
    name: "@codometer/core",
    tarball: "codometer-core",
  },
  {
    name: "@codometer/languages",
    tarball: "codometer-languages",
  },
  {
    name: "@codometer/measurement",
    tarball: "codometer-measurement",
  },
  {
    name: "@codometer/output",
    tarball: "codometer-output",
  },

  // Callidescope (6)
  {
    binary: "callidescope",
    name: "@callidescope/cli",
    tarball: "callidescope-cli",
  },
  {
    name: "@callidescope/configuration",
    tarball: "callidescope-configuration",
  },
  {
    name: "@callidescope/core",
    tarball: "callidescope-core",
  },
  {
    name: "@callidescope/graph",
    tarball: "callidescope-graph",
  },
  {
    name: "@callidescope/nx",
    tarball: "callidescope-nx",
  },
  {
    name: "@callidescope/output",
    tarball: "callidescope-output",
  },

  // Codependix (8)
  {
    name: "@codependix/boundaries",
    tarball: "codependix-boundaries",
  },
  {
    binary: "codependix",
    name: "@codependix/cli",
    tarball: "codependix-cli",
  },
  {
    name: "@codependix/configuration",
    tarball: "codependix-configuration",
  },
  {
    name: "@codependix/core",
    tarball: "codependix-core",
  },
  {
    name: "@codependix/file-imports",
    tarball: "codependix-file-imports",
  },
  {
    name: "@codependix/nestjs-modules",
    tarball: "codependix-nestjs-modules",
  },
  {
    name: "@codependix/nx-projects",
    tarball: "codependix-nx-projects",
  },
  {
    name: "@codependix/output",
    tarball: "codependix-output",
  },
] as const;
