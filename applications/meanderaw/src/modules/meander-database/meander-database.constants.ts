// ♟️ Constants

/**
 * The path the committed database opens at when the CLI runs for real,
 * relative to the project root every Nx target already runs from — the same
 * convention `DEFAULT_OUTPUT_DIRECTORY` follows for the SVG tree it sits
 * beside.
 */
export const DEFAULT_DATABASE_PATH = "output/meanders.sqlite";

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
