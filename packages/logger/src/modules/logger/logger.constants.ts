// ♟️ Constants

/**
 * A leading emoji, optionally a ZWJ sequence, followed by whitespace.
 *
 * `Extended_Pictographic` rather than an explicit codepoint range so newly
 * assigned emoji keep working without touching this file. The variation
 * selector is optional because `⚠️` carries one and `📥` does not.
 */
export const LEADING_EMOJI_PATTERN =
  /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s+/u;

/** The first run of letters in a message, once its emoji has been removed. */
export const FIRST_WORD_PATTERN = /^([A-Za-z]+)/;

/**
 * Past tenses that regular morphology cannot derive.
 *
 * Deliberately *only* the irregulars. Every regular verb — including domain
 * coinages like `upserting` or `transpiled` that no dictionary carries — is
 * matched by the `-ing`/`-ed` rules, so this set never grows with the
 * codebase's vocabulary. English has not minted a new irregular past in
 * centuries, so it does not grow with the language either.
 *
 * Measured against three npm alternatives before settling here: part-of-speech
 * taggers mis-tag a capitalised sentence-initial verb as a proper noun, and
 * lemmatizers reject any verb absent from their dictionary. Both scored worse
 * on this repository's own log corpus than suffix rules plus this set.
 */
export const IRREGULAR_PAST_VERBS = new Set([
  "built",
  "cut",
  "found",
  "got",
  "kept",
  "left",
  "lost",
  "made",
  "put",
  "ran",
  "read",
  "rebuilt",
  "sent",
  "set",
  "split",
  "took",
  "wrote",
]);

/**
 * Contexts whose messages the convention does not govern.
 *
 * NestJS and `nest-commander` log through the very `LoggerService` an
 * application hands them, and their messages are not ours to rephrase —
 * `CommanderError: (outputHelp)` arrives on the error path, which is the last
 * place a logger should throw.
 */
export const UNVALIDATED_LOG_CONTEXTS = new Set([
  "CommandFactory",
  "InstanceLoader",
  "NestApplication",
  "NestFactory",
  "RouterExplorer",
  "RoutesResolver",
]);
