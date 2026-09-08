// ♟️ Constants

import path from "node:path";

/** Where `DrawCommand` writes the corpus, and where it is committed. */
export const OUTPUT_DIRECTORY = path.join(import.meta.dirname, "../../output");

/** The project README the table is spliced into. */
export const README_PATH = path.join(import.meta.dirname, "../../README.md");

/** The repeat count a swept filename ends with, dropped to leave the variant the drawing is filed under. */
export const REPEAT_COUNT_SUFFIX_PATTERN = /-\d+-repeats$/u;

/** Opens the generated block. Everything outside the two markers is hand-written, and a write never touches it. */
export const BLOCK_START_MARKER = "<!-- LATTICE_ADDRESSES_START -->";

/** Closes the generated block. */
export const BLOCK_END_MARKER = "<!-- LATTICE_ADDRESSES_END -->";

/** Printed when the command line names neither mode or both. */
export const USAGE_MESSAGE =
  "💡 Usage: address-table --check (or address-table --write)";

/** What to run to make a stale block current again. */
export const WRITE_COMMAND = "nx run meanderaw:address-table:write";

/**
 * Which addresses more than one drawing of a family already carries, and so
 * the only collisions the duplicate check permits.
 *
 * It is asserted in both directions: an address here that no longer collides
 * fails exactly as an undeclared collision does, so the list cannot rot into
 * a blanket permission. Adding a row to it is a decision about the corpus
 * rather than a way past a red check.
 *
 * Two things put an entry here, and neither is duplicate art:
 *
 * A **two-row band** has one interior level and no addressable vertical edge
 * at all — `MosaicTileService.blankEdges` gives a tile `rows - 2` vertical
 * levels — so its address is a single row of horizontal bits. `branch`'s two
 * `rung` directions and `parallel`'s two two-strand `serpentine` rotations
 * differ only in ink that rises out of a border rule, which at two rows is
 * every vertical edge the drawing has.
 *
 * **`negative`'s enumerated half** files a drawing under the canonical
 * identifier of the tile it inverts, and inverting a source of `rows + 1`
 * levels leaves a drawing whose address spells out `rows - 1` of them. The
 * space it is addressed in is therefore smaller than the space it enumerates,
 * so sources that differ only where the negative meets its border rules come
 * back as one address — at three rows and one column the address holds three
 * free bits, so eight addresses for the sixteen drawings committed there.
 * Twenty-two of the forty-six entries below are that, entirely inside the
 * enumerated half.
 *
 * The other twenty-four hold a **named mode** beside an enumerated source, and
 * that is the same collapse seen from the other side rather than a second
 * fault: the enumerated half sweeps every admissible one-column source up to
 * six rows, so a named mode drawn inside that window inverts a source the
 * enumeration already commits. Exactly the 28 of the 100 named drawings that
 * sit inside it collide, and no others —
 * `meander-topology.service.integration.test.ts` names the committed `mosaic`
 * tile each of those sources is.
 */
export const EXPECTED_ADDRESS_COLLISIONS: Readonly<
  Record<string, readonly string[]>
> = {
  // 🎯 Hexadecimal lattice addresses rather than words, so the dictionaries
  // are turned off across them the way they are across the generated table
  // in the README.
  /* cspell:disable */
  branch: ["2r2c-21"],
  negative: [
    "3r1c-33",
    "3r1c-4b",
    "3r1c-78",
    "3r1c-7b",
    "4r1c-333",
    "4r1c-37b",
    "4r1c-4f8",
    "4r1c-7b3",
    "4r1c-7cb",
    "4r1c-7fb",
    "5r1c-3333",
    "5r1c-337b",
    "5r1c-37b3",
    "5r1c-4fcb",
    "5r1c-7b33",
    "5r1c-7b7b",
    "5r1c-7cb3",
    "5r1c-7ccb",
    "5r1c-7fb3",
    "5r1c-7fcb",
    "5r1c-7ffb",
    "6r1c-33333",
    "6r1c-337b3",
    "6r1c-37b33",
    "6r1c-37b7b",
    "6r1c-37cb3",
    "6r1c-37fb3",
    "6r1c-4fcf8",
    "6r1c-7b333",
    "6r1c-7b37b",
    "6r1c-7b7b3",
    "6r1c-7b7cb",
    "6r1c-7cb33",
    "6r1c-7cb78",
    "6r1c-7ccb3",
    "6r1c-7cccb",
    "6r1c-7cfb3",
    "6r1c-7cfcb",
    "6r1c-7fb33",
    "6r1c-7fb7b",
    "6r1c-7fccb",
    "6r1c-7fcb3",
    "6r1c-7fcfb",
    "6r1c-7ffb3",
    "6r1c-7ffcb",
    "6r1c-7fffb",
  ],
  parallel: ["2r2c-21"],
  /* cspell:enable */
};
