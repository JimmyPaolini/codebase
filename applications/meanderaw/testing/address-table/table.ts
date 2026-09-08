import { SUPPORTED_TYPES } from "../../src/modules/meander-generation/meander-generation.constants";

import {
  BLOCK_END_MARKER,
  BLOCK_START_MARKER,
  WRITE_COMMAND,
} from "./constants";

import type { AddressedDrawing } from "./types";

// ♟️ Constants

/** Stands in for a column a drawing has no value for, so every row has seven cells. */
const EMPTY_CELL = "—";

/** The table's own header, and the alignment row markdown needs beneath it. */
const TABLE_HEADER = [
  "| Family | Modifier | Rows | Span | Address | Canonical class | Sub-family |",
  "| --- | --- | --- | --- | --- | --- | --- |",
];

/** Orders row counts and column spans the way a reader reads them, so `10-rows` follows `9-rows`. */
const collator = new Intl.Collator("en", { numeric: true });

/** Where each family sits in the table, read off the order `SUPPORTED_TYPES` declares them in. */
const familyRanks = new Map<string, number>(
  SUPPORTED_TYPES.map((type, index) => [type, index]),
);

// 📄 Rendering

/** Ranks a drawing by its family, so anything the families do not name sorts after all of them. */
const familyRank = (drawing: AddressedDrawing): number =>
  familyRanks.get(drawing.family) ?? SUPPORTED_TYPES.length;

/**
 * The corpus in reading order: families in the order they are declared in,
 * and each family's drawings in the order its own directory tree lists them.
 *
 * Declaration order rather than alphabetical, for the reason the index page
 * gives: sorting by name alone would put `mosaic`'s eight thousand tiles in
 * the middle of the table rather than after every family that has a motif.
 */
export const orderDrawings = (
  drawings: readonly AddressedDrawing[],
): AddressedDrawing[] =>
  drawings.toSorted(
    (left, right) =>
      familyRank(left) - familyRank(right) ||
      collator.compare(left.path, right.path),
  );

/** One drawing's row: the seven columns, with an em dash where a drawing has no value. */
export const renderRow = (drawing: AddressedDrawing): string => {
  const cells = [
    drawing.family,
    drawing.variant,
    String(drawing.rows),
    String(drawing.span),
    drawing.address,
    drawing.canonicalIdentifier,
    drawing.subFamily ?? EMPTY_CELL,
  ];

  return `| ${cells.join(" | ")} |`;
};

/**
 * The whole generated block, markers included, exactly as it is committed.
 *
 * The heading and the paragraphs beneath it are generated with the table
 * rather than written above it, the way `## ⏲️ Codometer` and
 * `## 🔭 Callidescope` already are in this README: a caption that counts the
 * rows underneath it has to be rewritten when they change, and a caption
 * outside the markers could not be.
 *
 * `cspell` is turned off across the block. Ten thousand hexadecimal addresses
 * are unknown words to every dictionary and always will be, and a pattern
 * narrow enough to admit them and nothing else would have to spell out where
 * each column sits — a second description of the table's shape, kept in step
 * with this one by nothing.
 */
export const renderBlock = (drawings: readonly AddressedDrawing[]): string => {
  const ordered = orderDrawings(drawings);

  return [
    BLOCK_START_MARKER,
    "",
    "<!-- cspell:disable -->",
    "",
    "## 🗺️ Lattice Addresses",
    "",
    `Every one of the ${ordered.length.toLocaleString("en-US")} committed drawings, addressed on the lattice`,
    "every family is drawn on. **Family** is the directory it is filed under and **Modifier**",
    "the variant within it — the modifier's slug for a family drawn from a motif, and the",
    "tile's own name in the two enumerated halves, all of `mosaic` and `negative`'s",
    "`permutations/` subtree, whose drawings have no modifier at all. **Rows** is the",
    "band's depth and **Span** the column span of the true repeat the",
    "address is read over. **Address** is the name; **Canonical class** is the one string a",
    "whole symmetry class shares, and is never substituted for it; **Sub-family** is the name",
    "the ink earns where it earns one.",
    "",
    "A class shared across two families is the discovery rather than a collision:",
    "`parallel`'s `serpentine-strands-3-offset-1` at three rows is the `mosaic` `zigzag` tile",
    "`56a9`, and its four-strand, two-offset sibling is `56a933`.",
    "",
    `Generated — run \`${WRITE_COMMAND}\` to rewrite it, and nothing else.`,
    "",
    ...TABLE_HEADER,
    ...ordered.map((drawing) => renderRow(drawing)),
    "",
    "<!-- cspell:enable -->",
    "",
    BLOCK_END_MARKER,
  ].join("\n");
};
