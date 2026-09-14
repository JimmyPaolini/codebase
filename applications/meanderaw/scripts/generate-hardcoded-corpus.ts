import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  collectNamedCorpus,
  createCorpusServices,
} from "../testing/hardcoded-corpus/corpus";

import type { CollectedHardcodedMeander } from "../testing/hardcoded-corpus/types";

/**
 * One-time generation step for ticket #818: reads the committed corpus's
 * named-type half (`testing/hardcoded-corpus/corpus.ts`, which draws the
 * same boundary `DrawCombinationsService.enumerate()` already draws between
 * per-family procedural motifs and the two exhaustively enumerated halves,
 * `mosaic` and `negative`'s `permutations/` subtree), deduplicates it by
 * Code, and writes one `<family>.constants.ts` file per family under
 * `src/modules/hardcoded-meanders/`.
 *
 * Run once, by hand, with the same loader the retired `address-table`
 * target used — Conformetry's own doc comments and this project's own
 * `MEMORY.md` both warn that `tsx`/`esbuild` silently break the NestJS
 * constructor injection this script's container needs:
 *
 * ```sh
 * node --import @swc-node/register/esm-register scripts/generate-hardcoded-corpus.ts
 * ```
 *
 * Its output is committed and read from then on — see
 * `HardcodedMeandersService` and `DrawCommand.sweep` — so this script is not
 * wired to any Nx target and does not need to run again unless the
 * historical corpus itself changes.
 */

const OUTPUT_MODULE_DIRECTORY = path.join(
  import.meta.dirname,
  "../src/modules/hardcoded-meanders",
);

/** One field of a `HardcodedMeanderEntry` object literal, `undefined` omitted. */
const field = (name: string, value: number | string | undefined): string =>
  value === undefined
    ? ""
    : `${name}: ${typeof value === "number" ? value : JSON.stringify(value)}`;

/** One hardcoded entry, printed as a single-line object literal — oxfmt decides whether a long Code forces it onto several. */
const entryLiteral = (drawing: CollectedHardcodedMeander): string => {
  const fields = [
    field("code", drawing.code),
    field("columns", drawing.columns),
    field("rows", drawing.rows),
    field("subFamily", drawing.subFamily),
  ].filter((printed) => printed !== "");

  return `  { ${fields.join(", ")} },`;
};

/**
 * The most entries one chunk file holds before it is split into several.
 *
 * A conservative bound rather than a measured one: oxfmt breaks a long Code
 * onto several lines, and how much one entry expands varies by family. Only
 * `parallel`'s 774 entries cross it today — every other family's committed
 * corpus already fits one file comfortably under the 512-line cap even after
 * formatting.
 */
const MAXIMUM_ENTRIES_PER_CHUNK = 150;

/** `drawings` split into groups of at most {@link MAXIMUM_ENTRIES_PER_CHUNK}. */
const chunk = (
  drawings: readonly CollectedHardcodedMeander[],
): CollectedHardcodedMeander[][] => {
  const chunks: CollectedHardcodedMeander[][] = [];

  for (
    let start = 0;
    start < drawings.length;
    start += MAXIMUM_ENTRIES_PER_CHUNK
  ) {
    chunks.push(drawings.slice(start, start + MAXIMUM_ENTRIES_PER_CHUNK));
  }

  return chunks;
};

/** The full source of one family chunk's `*.constants.ts` file. */
const chunkFileSource = (
  family: string,
  identifier: string,
  drawings: readonly CollectedHardcodedMeander[],
): string => {
  const entries = drawings.map((drawing) => entryLiteral(drawing)).join("\n");

  return `// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of \`${family}\`'s committed corpus, extracted once by
 * \`scripts/generate-hardcoded-corpus.ts\` from \`output/${family}/**\\/*.svg\`
 * through \`LatticeIdentificationService.identifyDocument\` — see that
 * script's own doc comment for the extraction this file's contents were
 * generated from, and \`HardcodedMeandersService\` for how it is ingested.
 * Split across several files the same way, at
 * \`MAXIMUM_ENTRIES_PER_CHUNK\`, to stay under the 512-line-per-file cap
 * once oxfmt has broken every long Code onto its own lines.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const ${identifier}: readonly HardcodedMeanderEntry[] = [
${entries}
];
/* cspell:enable */
`;
};

/** Deduplicates `drawings` by Code, keeping the first occurrence and reporting every dropped path. */
const deduplicateByCode = (
  drawings: readonly CollectedHardcodedMeander[],
): {
  duplicates: { code: string; droppedPath: string; keptPath: string }[];
  entries: CollectedHardcodedMeander[];
} => {
  const seen = new Map<string, CollectedHardcodedMeander>();
  const duplicates: { code: string; droppedPath: string; keptPath: string }[] =
    [];

  for (const drawing of drawings) {
    const existing = seen.get(drawing.code);

    if (existing) {
      duplicates.push({
        code: drawing.code,
        droppedPath: drawing.path,
        keptPath: existing.path,
      });
      continue;
    }

    seen.set(drawing.code, drawing);
  }

  return { duplicates, entries: [...seen.values()] };
};

/** `entries`, grouped by the family each one was collected under. */
const groupByFamily = (
  entries: readonly CollectedHardcodedMeander[],
): Map<string, CollectedHardcodedMeander[]> => {
  const byFamily = new Map<string, CollectedHardcodedMeander[]>();

  for (const drawing of entries) {
    const family = byFamily.get(drawing.family) ?? [];

    family.push(drawing);
    byFamily.set(drawing.family, family);
  }

  return byFamily;
};

/** Writes one family's committed corpus as a single, unsplit `*.constants.ts` file. */
const writeSingleFile = async (
  family: string,
  identifier: string,
  drawings: readonly CollectedHardcodedMeander[],
): Promise<void> => {
  const filePath = path.join(OUTPUT_MODULE_DIRECTORY, `${family}.constants.ts`);

  await writeFile(filePath, chunkFileSource(family, identifier, drawings));
  console.log(`${family}: ${drawings.length} entries -> ${filePath}`);
};

/**
 * Writes one family's committed corpus as several numbered chunk files, plus
 * an index file of the family's own name re-exporting all of them
 * concatenated — see {@link MAXIMUM_ENTRIES_PER_CHUNK}.
 */
const writeChunkedFiles = async (
  family: string,
  identifier: string,
  chunks: readonly CollectedHardcodedMeander[][],
): Promise<void> => {
  const chunkIdentifiers = chunks.map(
    (_chunkDrawings, index) => `${identifier}_${index + 1}`,
  );

  await Promise.all(
    chunks.map(async (chunkDrawings, index) => {
      const filePath = path.join(
        OUTPUT_MODULE_DIRECTORY,
        `${family}-${index + 1}.constants.ts`,
      );

      await writeFile(
        filePath,
        chunkFileSource(family, chunkIdentifiers[index] ?? "", chunkDrawings),
      );
    }),
  );

  const indexFilePath = path.join(
    OUTPUT_MODULE_DIRECTORY,
    `${family}.constants.ts`,
  );
  const indexImports = chunkIdentifiers
    .map(
      (chunkIdentifier, index) =>
        `import { ${chunkIdentifier} } from "./${family}-${index + 1}.constants";`,
    )
    .join("\n");
  const reassembled = chunkIdentifiers
    .map((chunkIdentifier) => `  ...${chunkIdentifier},`)
    .join("\n");

  await writeFile(
    indexFilePath,
    `// ♟️ Constants

${indexImports}

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * \`${family}\`'s committed corpus, reassembled from the chunk files
 * \`scripts/generate-hardcoded-corpus.ts\` split it across — see
 * \`MAXIMUM_ENTRIES_PER_CHUNK\` there for why this family alone needed more
 * than one.
 */
export const ${identifier}: readonly HardcodedMeanderEntry[] = [
${reassembled}
];
`,
  );
  const total = chunks.reduce(
    (count, chunkDrawings) => count + chunkDrawings.length,
    0,
  );

  console.log(
    `${family}: ${total} entries across ${chunks.length} chunk files -> ${indexFilePath}`,
  );
};

/** Writes every family's `*.constants.ts` file(s), chunked where {@link chunk} says it needs to be — all in parallel, since each family writes its own distinct files. */
const writeFamilyFiles = async (
  byFamily: ReadonlyMap<string, readonly CollectedHardcodedMeander[]>,
): Promise<void> => {
  await Promise.all(
    [...byFamily].map(async ([family, drawings]) => {
      const identifier = `${family.toUpperCase()}_HARDCODED_MEANDERS`;
      const chunks = chunk(drawings);

      await (chunks.length === 1
        ? writeSingleFile(family, identifier, drawings)
        : writeChunkedFiles(family, identifier, chunks));
    }),
  );
};

/** Logs how many drawings were collected, kept, and dropped, and which Code each dropped duplicate collided on. */
const logSummary = (
  collectedCount: number,
  entries: readonly CollectedHardcodedMeander[],
  duplicates: readonly {
    code: string;
    droppedPath: string;
    keptPath: string;
  }[],
): void => {
  console.log(
    `\nCollected ${collectedCount} named-type drawings, ${entries.length} distinct after deduplication, ${duplicates.length} dropped as duplicate Codes.`,
  );

  for (const duplicate of duplicates) {
    console.log(
      `  duplicate ${duplicate.code}: kept ${duplicate.keptPath}, dropped ${duplicate.droppedPath}`,
    );
  }
};

const main = async (): Promise<void> => {
  const services = await createCorpusServices();
  let collected: CollectedHardcodedMeander[];

  try {
    collected = await collectNamedCorpus(services);
  } finally {
    await services.close();
  }

  const { duplicates, entries } = deduplicateByCode(collected);

  await writeFamilyFiles(groupByFamily(entries));
  logSummary(collected.length, entries, duplicates);
};

await main();
