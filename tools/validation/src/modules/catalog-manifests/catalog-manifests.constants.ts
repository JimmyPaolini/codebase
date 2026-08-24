// ♟️ Constants

import type { DependencySectionName } from "./catalog-manifests.types";

/**
 * The dependency sections the catalog policy covers.
 *
 * All four rather than the two most manifests use: a version pinned in
 * `peerDependencies` or `optionalDependencies` drifts from the catalog exactly
 * as easily as one pinned in `dependencies`.
 */
export const DEPENDENCY_SECTION_NAMES: DependencySectionName[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

/** The directories a workspace project may live in. */
export const WORKSPACE_SCOPES = ["applications", "packages", "tools"];

/**
 * The scopes a package name carries when it is one of this workspace's own.
 *
 * A name under one of them must be pinned `workspace:*`; anything else must be
 * pinned `catalog:`.
 */
export const INTERNAL_PACKAGE_SCOPES = [
  "@callidescope/",
  "@codebase/",
  "@codependix/",
  "@codometer/",
  "@conformetry/",
  "@jimmypaolini/",
];

/** How an internal dependency must be pinned. */
export const WORKSPACE_PROTOCOL_PREFIX = "workspace:";

/** How an external dependency must be pinned, exactly. */
export const CATALOG_PROTOCOL = "catalog:";
