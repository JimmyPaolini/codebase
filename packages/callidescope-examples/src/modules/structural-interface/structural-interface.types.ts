// 🏷️ Types

/**
 * A provider declared with arrow-typed properties and satisfied structurally.
 *
 * Every member is a property holding an arrow, not a method signature, and no
 * class in this package writes `implements StructuralProvider`. A nominal-only
 * index finds nothing here; the checker finds the class anyway.
 */
export interface StructuralProvider {
  ingest: (document: string) => number;
}
