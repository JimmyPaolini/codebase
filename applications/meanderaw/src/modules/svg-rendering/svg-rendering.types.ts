// 🏷️ Types

/**
 * How a family's filename carries its lattice address: the literal address,
 * or the row-and-column shape alone.
 *
 * A path component cannot exceed 255 bytes, and a family's own worst-case
 * address can exceed that on its own — `FILENAME_ADDRESS_CONVENTION` records
 * which of the two every family measures under. There is no third option: a
 * shape a family cannot even name in fewer than 255 bytes is a family too
 * deep for this scheme, not a case this type has to represent.
 */
export type FilenameAddressConvention = "full-address" | "shape-only";

/** Every field here is already formatted for direct interpolation into SVG markup. */
export interface RenderOptions {
  readonly height: string;
  readonly paths: readonly string[];
  readonly strokeWidth: string;
  readonly width: string;
}
