// 🏷️ Types

/**
 * Specification for a publishable package to be verified.
 */
export interface PublishSetPackage {
  /** Optional binary command name for CLI packages. */
  readonly binary?: string;
  /** Scoped npm package name, e.g. `@conformetry/cli`. */
  readonly name: string;
  /** Tarball base filename without extension or version, e.g. `conformetry-cli`. */
  readonly tarball: string;
}

/**
 * Result of running the publish set tarball verification.
 */
export interface PublishSetVerificationResult {
  /** Detail or failure messages logged during verification. */
  readonly messages: readonly string[];
  /** Whether all 28 tarballs installed, typechecked, and ran CLI binaries cleanly. */
  readonly succeeded: boolean;
}
