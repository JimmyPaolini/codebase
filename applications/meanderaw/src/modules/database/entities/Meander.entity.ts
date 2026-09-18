import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { SUPPORTED_TYPES } from "../../classification/classification.constants";
import { SUPPORTED_SUB_FAMILIES } from "../../classification/sub-family.constants";
import { MEANDER_PROVENANCES } from "../database.constants";

import type { MeanderType } from "../../classification/classification.types";
import type { SubFamily } from "../../classification/sub-family.types";
import type { MeanderProvenance } from "../database.types";

/**
 * One row of the committed `output/meanders.sqlite` database: a single
 * meander addressed by its Code, decoded and rendered by the generic,
 * family-agnostic pipeline rather than by any per-family procedural motif
 * service.
 *
 * `code` is a hexadecimal string, one character per interior lattice point,
 * in the same `8`/`4`/`2`/`1` north/south/east/west encoding
 * `AddressService.identify` already spells filenames in, and
 * is declared unbounded, which is the whole reason this migration exists: a
 * filesystem path component caps out at 255 bytes and several families' full
 * Codes do not, so a database row replaces the file a Code could not always
 * be a name for.
 *
 * **A meander's identity is that Code together with its `rows` and
 * `columns`, and the unique index says so.** It was `code` alone until the
 * generalized enumeration swept more than one shape, and the sweep found the
 * collision immediately: `identify` names a tile by its points and
 * deliberately does not name the shape — its own doc comment says "two tiles
 * of different shapes may share a string" — so the four characters `0000`
 * are two inked dots over two columns of a three-row band and also four down
 * one column of a five-row band. Those are different drawings. The triple is
 * what CONTEXT.md already calls a **lattice address**, and it is also
 * exactly what spec #813's sixteenth user story says reproduces an SVG, so
 * indexing it rather than the Code alone makes the key the identity the
 * domain already had. A second row at the same address is still refused, so
 * that spec's thirty-second story — a duplicate is a build failure rather
 * than a convention nobody checks — holds unchanged.
 *
 * `columns` and `pitch` are held separately even though this ticket's own
 * single-drawing path always writes them equal: a Code named directly by
 * `--rows`/`--columns`/`--code` has no repeat structure of its own, so its
 * whole grid is one pitch wide — but a later Enumerated or Hardcoded row
 * drawn from a family with a real repeating motif will not agree, and the
 * column exists now so that row does not need a migration to state it.
 *
 * `provenance` distinguishes a row produced by the generalized enumerator
 * from one ingested from the historical corpus's hardcoded constants. This
 * ticket's own single-drawing rows are recorded `"hardcoded"` too: a Code
 * typed at the command line is authored the same way a corpus constant is,
 * named by a person rather than found by a search.
 *
 * `family` and `subFamily` are both nullable: an Enumerated row leaves them
 * null when no family's Characteristic combination matches its structure,
 * and a Hardcoded row carries whichever of the two the historical corpus
 * already recorded for it, trusted rather than re-derived — see
 * `CorpusService`'s own doc comment for why a Hardcoded row's
 * metadata is trusted rather than classified.
 *
 * `family` and `subFamily` are both nullable, and for opposite reasons.
 * A `family` is null where a meander's structure satisfies no family's
 * defining combination — most of the enumerated space is like that, and
 * spec #813 asks for exactly that rather than for the tile to be excluded
 * from the sweep. A `subFamily` is null where the structure sits in none of
 * the named regions of the unit space, which is a separate question with a
 * separate answer: `docs/adr/0007-address-every-meander-by-its-lattice.md`
 * measured 85 drawings earning a region's name from outside `mosaic`, so
 * the two columns are filled in independently and a row may carry either,
 * both, or neither. `ClassificationService` decides both.
 *
 * `components`, `cycles`, and `freeEnds` are the three counts that say what
 * shape a repeat's ink is as a graph — how many pieces it falls into, how
 * many loops it closes, and how many of its points terminate. No charter
 * invariant fixes any of them, which is why they are Characteristics rather
 * than gates, and they are what most of the family definitions are stated
 * in: the junction counts alone read a `snake` repeat, a `boxes` repeat and
 * a `parallel` repeat identically.
 *
 * `inkTJunctions`, `inkXJunctions`, `negativeTJunctions`, and
 * `negativeXJunctions` are the raw junction counts
 * `CharacteristicsService.compute` derives directly from the row's
 * Code, and `hasBranching`/`hasCrossing` are the first two of a
 * growing set of boolean Characteristic columns built from them — see that
 * service's own doc comment for what each one means.
 */
@Entity({ name: "meanders" })
@Index(["code", "rows", "columns"], { unique: true })
export class Meander {
  @Column({ type: "text" })
  code!: string;

  @Column({ type: "int" })
  columns!: number;

  @Column({ type: "int" })
  components!: number;

  @Column({ type: "int" })
  cycles!: number;

  @Column({ enum: SUPPORTED_TYPES, nullable: true, type: "simple-enum" })
  family!: MeanderType | null;

  @Column({ type: "int" })
  freeEnds!: number;

  @Column({ type: "boolean" })
  hasBranching!: boolean;

  @Column({ type: "boolean" })
  hasCrossing!: boolean;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  inkTJunctions!: number;

  @Column({ type: "int" })
  inkXJunctions!: number;

  @Column({ type: "int" })
  negativeTJunctions!: number;

  @Column({ type: "int" })
  negativeXJunctions!: number;

  @Column({ type: "int" })
  pitch!: number;

  @Column({ enum: MEANDER_PROVENANCES, type: "simple-enum" })
  provenance!: MeanderProvenance;

  @Column({ type: "int" })
  rows!: number;

  @Column({ enum: SUPPORTED_SUB_FAMILIES, nullable: true, type: "simple-enum" })
  subFamily!: null | SubFamily;

  @Column({ type: "text" })
  svg!: string;
}
