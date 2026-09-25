// ♟️ Constants

/**
 * Generates the success message logged when all tarballs and CLI binaries pass verification.
 */
export const formatPublishSetSuccessMessage = (
  packageCount: number,
  binaryCount: number,
): string =>
  `✔ Verified all ${String(packageCount)} publish set package tarballs and ${String(binaryCount)} CLI binaries cleanly`;

/**
 * Message logged when tarballs directory is missing.
 */
export const TARBALLS_DIRECTORY_MISSING_MESSAGE =
  "❌ Tarballs directory dist/tarballs does not exist. Run 'nx run-many -t pack' first.";
