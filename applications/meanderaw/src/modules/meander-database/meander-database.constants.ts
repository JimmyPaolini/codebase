// ♟️ Constants

/**
 * The path the committed database opens at when the CLI runs for real,
 * relative to the project root every Nx target already runs from — the same
 * convention `DEFAULT_OUTPUT_DIRECTORY` follows for the SVG tree it sits
 * beside.
 */
export const DEFAULT_DATABASE_PATH = "output/meanders.sqlite";

/**
 * How many rows `MeanderDatabaseService.saveAll` writes per statement.
 *
 * A bound rather than a tuning knob. A row carries a dozen columns and one
 * statement's parameter count is limited, so a whole shape's worth of rows
 * in one statement would be reaching a limit nobody declared at some column
 * count nobody chose — the sweep's widest shape alone holds 16,512 of them.
 * Five hundred keeps the parameter count in the low thousands at every
 * shape, which is well inside what the driver admits and far enough from it
 * that adding a Characteristic column cannot move it there.
 */
export const MEANDER_INSERT_CHUNK_SIZE = 500;

/**
 * What a meander row's `provenance` column may hold: whether it was found by
 * the generalized enumerator (`"enumerated"`, added in a later ticket) or
 * ingested from the historical corpus's hardcoded constants (`"hardcoded"`,
 * likewise later).
 *
 * The source of truth for {@link MeanderProvenance} as well as for the
 * column's own `simple-enum` constraint, so the type and the schema can
 * never name a value the other refuses.
 */
export const MEANDER_PROVENANCES = ["enumerated", "hardcoded"] as const;
