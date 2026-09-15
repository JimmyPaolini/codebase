// 🏷️ Types

import type {
  InventoriedInstance as ContractInventoriedInstance,
  InventoriedPairing as ContractInventoriedPairing,
  InventoriedTemplate as ContractInventoriedTemplate,
} from "@conformetry/core";

/**
 * One instance found on disk, paired with the templates that explain it.
 *
 * Declared in `@conformetry/core` and named again here, because discovery
 * produces it down in the configuration layer and nothing there may reach
 * upward into output to find it. The alias keeps the renderer and its tests
 * reading against this module rather than reaching past it.
 */
export type InventoriedInstance = ContractInventoriedInstance;

/** How well one template and one instance fit each other. */
export type InventoriedPairing = ContractInventoriedPairing;

/** One declared template, paired with the instances it explains. */
export type InventoriedTemplate = ContractInventoriedTemplate;
