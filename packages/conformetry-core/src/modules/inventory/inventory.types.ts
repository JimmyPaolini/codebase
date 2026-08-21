// 🏷️ Types

/**
 * One instance found on disk, paired with the templates that explain it.
 *
 * Lives in core for the same reason [[InstanceScore]] does: discovery produces
 * it and this module renders it, so the shape belongs to neither side.
 */
export interface InventoriedInstance {
  /** Where the instance is, including its name stem. */
  readonly path: string;
  /** Templates that explain this instance, best fit first. */
  readonly templates: InventoriedPairing[];
}

/**
 * How well one template and one instance fit each other.
 *
 * The ratio is file overlap, not conformance: it says how much of a template's
 * structure an instance has, never how faithfully those files honour it.
 */
export interface InventoriedPairing {
  readonly matchedFileCount: number;
  /** Share of the template's files the instance already has, 0 to 1. */
  readonly matchRatio: number;
  /** The other side of the pairing — a template name or an instance path. */
  readonly name: string;
  readonly templateFileCount: number;
}

/** One declared template, paired with the instances it explains. */
export interface InventoriedTemplate {
  readonly aliases: string[];
  readonly description: string;
  /** Instances this template explains, empty when nothing matched it. */
  readonly instances: InventoriedPairing[];
  readonly name: string;
  readonly templatePath: string;
}
