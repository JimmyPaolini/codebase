import { SUPPORTED_TYPES } from "../../src/modules/meander-generation/meander-generation.constants";

import { WRITE_COMMAND } from "./constants";

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
 * The whole generated file, exactly as it is committed.
 *
 * It is generated end to end rather than spliced into a hand-written page, so
 * it carries its own title and says in one line what it is and what rewrites
 * it. Nothing here is hand-editable, which is why there are no markers to
 * hold a boundary: a `write` replaces the file.
 *
 * The prose explaining the seven columns is deliberately *not* here. It sits
 * in the README's `## 🗺️ Lattice Addresses` section, where a reader meets it
 * beside the rest of the project rather than at the top of nine thousand
 * rows, and where a human can edit it.
 *
 * `cspell` needs no directive across the table. Ten thousand hexadecimal
 * addresses are unknown words to every dictionary and always will be, and
 * `configuration/cspell.config.yaml` already excludes `output/` wholesale,
 * which is part of why the table is filed there — see `TABLE_PATH` for the
 * rest.
 */
export const renderDocument = (
  drawings: readonly AddressedDrawing[],
): string => {
  const ordered = orderDrawings(drawings);

  return `${[
    "# 🗺️ Lattice Addresses",
    "",
    `All ${ordered.length.toLocaleString("en-US")} committed drawings under \`output/\`, addressed on the lattice every family is drawn on and explained in [the project README](../README.md) — generated, so run \`${WRITE_COMMAND}\` to rewrite it and edit nothing here by hand.`,
    "",
    ...TABLE_HEADER,
    ...ordered.map((drawing) => renderRow(drawing)),
  ].join("\n")}\n`;
};
