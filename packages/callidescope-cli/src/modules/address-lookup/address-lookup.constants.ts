// ♟️ Constants

import {
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "@callidescope/configuration";

/**
 * Whether an error thrown out of a lookup is a project's own configuration
 * being refused, rather than a fault in callidescope itself.
 *
 * A lookup traces before it matches, and tracing loads the configuration of
 * every project it reaches — so `depth` and `breadth` can earn the same two
 * refusals a whole-workspace trace has always been able to. Both commands ask
 * this one question so they answer it the same way, and a free function rather
 * than a method on `AddressLookupService` because the commands mock that
 * service: a predicate reached through a mock decides nothing.
 *
 * Deliberately narrow. Anything else is callidescope's own fault and must keep
 * its stack rather than be reported as a file somebody wrote.
 */
export const isRefusedProjectConfiguration = (
  error: unknown,
): error is
  | ProjectConfigurationError
  | ProjectConfigurationFieldNotPermittedError =>
  error instanceof ProjectConfigurationError ||
  error instanceof ProjectConfigurationFieldNotPermittedError;
