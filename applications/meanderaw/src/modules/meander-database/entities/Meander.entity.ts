import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { MEANDER_PROVENANCES } from "../meander-database.constants";

import type { MeanderProvenance } from "../meander-database.types";

/**
 * One row of the committed `output/meanders.sqlite` database: a single
 * meander addressed by its Code, decoded and rendered by the generic,
 * family-agnostic pipeline rather than by any per-family procedural motif
 * service.
 *
 * `code` is the meander's whole identity — a hexadecimal string, one
 * character per interior lattice point, in the same `8`/`4`/`2`/`1`
 * north/south/east/west encoding `LatticeIdentificationService.identify`
 * already spells filenames in — and is declared unique and unbounded, which
 * is the whole reason this migration exists: a filesystem path component
 * caps out at 255 bytes and several families' full Codes do not, so a
 * database row replaces the file a Code could not always be a name for.
 *
 * `columns` and `pitch` are held separately even though this ticket's own
 * single-drawing path always writes them equal: a Code named directly by
 * `--rows`/`--columns`/`--code` has no repeat structure of its own, so its
 * whole grid is one pitch wide — but a later Enumerated or Hardcoded row
 * drawn from a family with a real repeating motif will not agree, and the
 * column exists now so that row does not need a migration to state it.
 *
 * `provenance` distinguishes a row produced by the generalized enumerator
 * from one ingested from the historical corpus's hardcoded constants — both
 * added in later tickets. This ticket's own single-drawing rows are
 * recorded `"hardcoded"` too: a Code typed at the command line is authored
 * the same way a corpus constant is, named by a person rather than found by
 * a search.
 *
 * `inkTJunctions`, `inkXJunctions`, `negativeTJunctions`, and
 * `negativeXJunctions` are the raw junction counts
 * `MeanderCharacteristicsService.compute` derives directly from the row's
 * decoded grid, and `hasBranching`/`hasCrossing` are the first two of a
 * growing set of boolean Characteristic columns built from them — see that
 * service's own doc comment for what each one means.
 */
@Entity({ name: "meanders" })
export class Meander {
  @Column({ type: "text", unique: true })
  code!: string;

  @Column({ type: "int" })
  columns!: number;

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

  @Column({ type: "text" })
  svg!: string;
}
