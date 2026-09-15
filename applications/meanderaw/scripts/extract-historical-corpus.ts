import "reflect-metadata";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { NestFactory } from "@nestjs/core";

import { MainModule } from "../src/main.module";
import { CORPUS_FAMILIES } from "../src/modules/corpus/corpus.constants";
import { AddressService } from "../src/modules/drawing/address.service";

import type {
  CorpusEntry,
  CorpusFamily,
} from "../src/modules/corpus/corpus.types";

/**
 * Archaeology, run once: reads every drawing this repository used to commit
 * under `applications/meanderaw/output` back onto the lattice, and writes
 * the result out as `historical-corpus-*.constants.ts`.
 *
 * It reads the drawings out of git rather than off disk, at the fixed commit
 * {@link HISTORICAL_COMMIT} — the parent of the one that deleted the tree.
 * That commit cannot change, so neither can this script's output, which is
 * why the output is committed and this script is deleted rather than wired
 * to a target.
 *
 * Run with the same loader every other entry point here uses — `tsx` and
 * `esbuild` both silently break the NestJS constructor injection the
 * container needs:
 *
 * ```sh
 * node --import @swc-node/register/esm-register scripts/extract-historical-corpus.ts
 * ```
 *
 * **What a drawing has to be handed before it can be read.** A rendered band
 * is addressed at a span — how far apart two identical repeat units sit —
 * and at a pitch, the width of the band's own termination artifacts and so
 * the margin the addressed window clears at either end. Both were facts
 * about the retired per-family generator rather than about the document, so
 * both are recovered from the path: the span from the `NrMc` suffix the
 * renderer appended, or from the `N-rows/M-columns` directories the
 * exhaustively enumerated subtrees were filed under; the pitch from the
 * modifier slug, through {@link MODIFIER_REPEAT_PITCHES}, which is the one
 * table the retired generator held that the drawings do not spell out.
 *
 * **`mosaic` is read and checked, not emitted.** Every `mosaic` filename is
 * its own Code, so the whole subtree is a free 8,551-drawing check on the
 * parser and is used as one. None of it is emitted: `mosaic` names no family
 * — it is the enumerated unit space itself, which `EnumerationService`
 * reproduces in full — so committing it would multiply the corpus sevenfold
 * for no label.
 */
const HISTORICAL_COMMIT = "ab3c4526b^";

const REPOSITORY_ROOT = path.join(import.meta.dirname, "../../..");

const OUTPUT_DIRECTORY = path.join(
  import.meta.dirname,
  "../src/modules/corpus",
);

const DRAWING_TREE = "applications/meanderaw/output";

/**
 * How many repeat units a modifier needs before its own variation returns to
 * where it started, which is how many pitches one true repeat spans.
 *
 * Recovered from the retired `MODIFIER_REPEAT_PITCHES`. A modifier that is
 * not named here does not vary its unit, so its span is one pitch.
 */
const MODIFIER_REPEAT_PITCHES: Readonly<Record<string, number>> = {
  "edge-flip": 2,
  plied: 2,
  spin: 4,
  "spin-flip": 4,
  stagger: 2,
};

/**
 * The most lines a generated chunk file may carry before the next entry
 * starts a new one, kept well under the 512-line cap so that oxfmt breaking
 * a long Code's entry across six lines cannot push a chunk over it.
 *
 * A line budget rather than an entry count, because how many lines an entry
 * costs depends entirely on how long its Code is: the `negative`
 * permutations fit one to a line, and a forty-column `boxes` spiral does
 * not.
 */
const MAXIMUM_LINES_PER_CHUNK = 460;

/** The width oxfmt keeps a line within, past which an entry is broken across several. */
const PRINT_WIDTH = 80;

/** How many lines oxfmt spends on an entry it has to break: an opening brace, four fields, and a closing brace. */
const LINES_PER_BROKEN_ENTRY = 6;

/** One drawing, read back onto the lattice, with the path it was read from. */
interface ReadDrawing {
  readonly code: string;
  readonly columns: number;
  readonly family: CorpusFamily;
  readonly path: string;
  readonly rows: number;
}

/** Everything one run of the extraction read: the labelled drawings, and the `mosaic` subtree's own verdict on the parser. */
interface Reading {
  readonly drawings: ReadDrawing[];
  readonly mosaicChecked: number;
  readonly mosaicWrong: string[];
}

/** Runs one git command against the repository this script lives in. */
const git = (args: readonly string[]): string =>
  execFileSync("git", [...args], {
    cwd: REPOSITORY_ROOT,
    maxBuffer: 512 * 1024 * 1024,
  }).toString();

/** Every drawing the historical tree holds, in the tree's own order. */
const drawingPaths = (): string[] =>
  git(["ls-tree", "-r", "--name-only", HISTORICAL_COMMIT, "--", DRAWING_TREE])
    .split("\n")
    .filter((line) => line.endsWith(".svg"));

/** The variant slug a filename carries, with the repeat count and everything after it stripped. */
const variantSlug = (drawingPath: string): string =>
  (drawingPath.split("/").at(-1) ?? "")
    .replace(/\.svg$/, "")
    .replace(/-?\d+-repeats.*$/, "");

/** How many pitches one true repeat of a drawing spans, from its modifier slug. */
const repeatPitches = (drawingPath: string): number => {
  const slug = variantSlug(drawingPath);
  const named = Object.entries(MODIFIER_REPEAT_PITCHES).find(
    ([name]) => slug === name || slug.startsWith(`${name}-`),
  );

  return named?.[1] ?? 1;
};

/** The shape a drawing declares, either in its filename's address suffix or in the directories it is filed under. */
const declaredShape = (
  drawingPath: string,
): undefined | { columns: number; rows: number } => {
  const suffix = /(\d+)r(\d+)c/.exec(drawingPath);

  if (suffix?.[1] !== undefined && suffix[2] !== undefined) {
    return { columns: Number(suffix[2]), rows: Number(suffix[1]) };
  }

  const directories = /\/(\d+)-rows\/.*?(\d+)-columns\//.exec(drawingPath);

  if (directories?.[1] !== undefined && directories[2] !== undefined) {
    return { columns: Number(directories[2]), rows: Number(directories[1]) };
  }

  return undefined;
};

/** The Code a `mosaic` filename spells out, which is the whole of its name. */
const filenameCode = (drawingPath: string): string | undefined =>
  /^([0-9a-f]+)(?:-[a-z]+)?$/.exec(
    (drawingPath.split("/").at(-1) ?? "").replace(/\.svg$/, ""),
  )?.[1];

/** The family directory a drawing sat in, refusing a name the corpus does not know. */
const filedFamily = (drawingPath: string): CorpusFamily => {
  const directory = drawingPath.split("/")[3] ?? "";
  const family = CORPUS_FAMILIES.find((known) => known === directory);

  if (family === undefined) {
    throw new Error(`${drawingPath} is filed under the unknown "${directory}"`);
  }

  return family;
};

/** The Code one drawing spells out, read back off the rendered document at the unit its own path declares. */
const readOne = (
  address: AddressService,
  drawingPath: string,
): { code: string; columns: number; rows: number } => {
  const shape = declaredShape(drawingPath);

  if (shape === undefined) {
    throw new Error(`${drawingPath} declares no shape`);
  }

  const read = address.identifyDocument(
    git(["show", `${HISTORICAL_COMMIT}:${drawingPath}`]),
    {
      pitch: shape.columns / repeatPitches(drawingPath),
      span: shape.columns,
    },
  );

  return { code: read.identifier, columns: read.span, rows: read.rows };
};

/** Every drawing read back onto the lattice, in the tree's own order, and the `mosaic` subtree's own verdict. */
const readDrawings = (address: AddressService): Reading => {
  const drawings: ReadDrawing[] = [];
  const mosaicWrong: string[] = [];
  let mosaicChecked = 0;

  for (const drawingPath of drawingPaths()) {
    const read = readOne(address, drawingPath);

    if (drawingPath.split("/")[3] === "mosaic") {
      mosaicChecked += 1;
      if (filenameCode(drawingPath) !== read.code) {
        mosaicWrong.push(drawingPath);
      }
      continue;
    }

    drawings.push({
      ...read,
      family: filedFamily(drawingPath),
      path: drawingPath,
    });
  }

  return { drawings, mosaicChecked, mosaicWrong };
};

/**
 * The drawings collapsed to one entry per Code, each carrying every family
 * the tree filed that Code under, first appearance first.
 *
 * A Code filed under two families is the thing this corpus exists to record
 * rather than resolve: the entry keeps both names as provenance, and nothing
 * here decides which of them the ink deserves.
 */
const collapseByCode = (
  drawings: readonly ReadDrawing[],
): Map<string, CorpusEntry & { paths: string[] }> => {
  const entries = new Map<string, CorpusEntry & { paths: string[] }>();

  for (const drawing of drawings) {
    const existing = entries.get(drawing.code);

    if (existing === undefined) {
      entries.set(drawing.code, {
        code: drawing.code,
        columns: drawing.columns,
        filedUnder: [drawing.family],
        paths: [drawing.path],
        rows: drawing.rows,
      });
      continue;
    }

    existing.paths.push(drawing.path);

    if (!existing.filedUnder.includes(drawing.family)) {
      entries.set(drawing.code, {
        ...existing,
        filedUnder: [...existing.filedUnder, drawing.family],
      });
    }
  }

  return entries;
};

/** One entry, printed as a single-line object literal — oxfmt decides whether a long Code forces it onto several. */
const entryLiteral = (entry: CorpusEntry): string =>
  `  { code: ${JSON.stringify(entry.code)}, columns: ${entry.columns}, filedUnder: [${entry.filedUnder.map((family) => JSON.stringify(family)).join(", ")}], rows: ${entry.rows} },`;

/** How many lines oxfmt will spend printing one entry: one, or {@link LINES_PER_BROKEN_ENTRY} once the literal outgrows {@link PRINT_WIDTH}. */
const printedLines = (entry: CorpusEntry): number =>
  entryLiteral(entry).length <= PRINT_WIDTH ? 1 : LINES_PER_BROKEN_ENTRY;

/** `entries` split into groups none of which prints past {@link MAXIMUM_LINES_PER_CHUNK}. */
const chunk = (entries: readonly CorpusEntry[]): CorpusEntry[][] => {
  const chunks: CorpusEntry[][] = [[]];
  let lines = 0;

  for (const entry of entries) {
    const cost = printedLines(entry);
    const current = chunks.at(-1);

    if (current === undefined) continue;

    if (lines + cost > MAXIMUM_LINES_PER_CHUNK && current.length > 0) {
      chunks.push([entry]);
      lines = cost;
      continue;
    }

    current.push(entry);
    lines += cost;
  }

  return chunks;
};

/** The full source of one generated chunk file. */
const chunkSource = (index: number, entries: readonly CorpusEntry[]): string =>
  `// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part ${index} of the historical corpus, extracted once by
 * \`scripts/extract-historical-corpus.ts\` from the \`output/\` drawing tree
 * this repository used to commit — see \`HISTORICAL_CORPUS\` for what the
 * whole set is and how \`filedUnder\` is to be read. Split at a fixed entry
 * line budget so no chunk crosses the 512-line cap once oxfmt has broken
 * every long Code's entry across several lines.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const HISTORICAL_CORPUS_${index}: readonly CorpusEntry[] = [
${entries.map((entry) => entryLiteral(entry)).join("\n")}
];
/* cspell:enable */
`;

/** The full source of the index file that reassembles every chunk. */
const indexSource = (count: number): string => {
  const parts = Array.from({ length: count }, (_unused, index) => index + 1);

  return `// ♟️ Constants

${parts.map((index) => `import { HISTORICAL_CORPUS_${index} } from "./historical-corpus-${index}.constants";`).join("\n")}

import type { CorpusEntry } from "./corpus.types";

/**
 * Every drawing this repository used to commit under \`output/\`, read back
 * onto the lattice once and collapsed to one entry per Code — the whole
 * historical corpus, and the labelled fixture set every family rule is
 * measured against.
 *
 * **\`filedUnder\` is provenance, never a fact about the ink.** It says
 * which \`output/<family>/\` directories a Code's drawings sat in, in the
 * order the tree gave them up, and nothing more. The tree is known to be
 * wrong in places — see
 * \`docs/adr/0013-hold-the-historical-corpus-as-a-test-set.md\` — so a
 * family rule that disagrees with one of these labels is a disagreement to
 * adjudicate by looking at the drawing, not a rule that has failed.
 *
 * **Which of these the sweep ingests is computed, not listed.** A meander
 * the enumeration already reaches is reproduced by \`EnumerationService\`
 * rather than preserved here, so \`CorpusService.ingest\` keeps only the
 * entries beyond that reach — see its own doc comment for the two bounds
 * that decide it.
 *
 * Reassembled from the chunk files
 * \`scripts/extract-historical-corpus.ts\` split it across; see
 * \`MAXIMUM_LINES_PER_CHUNK\` there for why it needed more than one.
 */
export const HISTORICAL_CORPUS: readonly CorpusEntry[] = [
${parts.map((index) => `  ...HISTORICAL_CORPUS_${index},`).join("\n")}
];
`;
};

/** Writes the generated chunk files and the index that reassembles them. */
const writeCorpus = async (entries: readonly CorpusEntry[]): Promise<void> => {
  const chunks = chunk(entries);

  await Promise.all(
    chunks.map(async (entriesInChunk, index) =>
      writeFile(
        path.join(
          OUTPUT_DIRECTORY,
          `historical-corpus-${index + 1}.constants.ts`,
        ),
        chunkSource(index + 1, entriesInChunk),
      ),
    ),
  );
  await writeFile(
    path.join(OUTPUT_DIRECTORY, "historical-corpus.constants.ts"),
    indexSource(chunks.length),
  );
  console.log(
    `${entries.length} entries across ${chunks.length} chunk files -> ${OUTPUT_DIRECTORY}`,
  );
};

/** Reports every Code the tree filed under more than one family, which is what the pull request asks a person to adjudicate. */
const reportContradictions = (
  entries: ReadonlyMap<string, CorpusEntry & { paths: string[] }>,
): void => {
  const contradictions = [...entries.values()].filter(
    (entry) => entry.filedUnder.length > 1,
  );

  console.log(
    `\n${contradictions.length} Codes filed under more than one family:`,
  );

  for (const entry of contradictions) {
    console.log(
      `  ${entry.filedUnder.join(" + ")} ${entry.rows}r${entry.columns}c ${entry.code}`,
    );
    for (const drawingPath of entry.paths) {
      console.log(`      ${drawingPath.replace(`${DRAWING_TREE}/`, "")}`);
    }
  }
};

const main = async (): Promise<void> => {
  const context = await NestFactory.createApplicationContext(MainModule, {
    logger: false,
  });
  let read: Reading;

  try {
    read = readDrawings(context.get(AddressService));
  } finally {
    await context.close();
  }

  const entries = collapseByCode(read.drawings);
  const ordered = CORPUS_FAMILIES.flatMap((family) =>
    [...entries.values()].filter((entry) => entry.filedUnder[0] === family),
  );

  console.log(
    `read ${read.drawings.length} labelled drawings into ${entries.size} distinct Codes`,
  );
  console.log(
    `checked ${read.mosaicChecked} mosaic drawings against their own filenames, ${read.mosaicWrong.length} disagreed`,
  );

  await writeCorpus(
    ordered.map((entry) => ({
      code: entry.code,
      columns: entry.columns,
      filedUnder: entry.filedUnder,
      rows: entry.rows,
    })),
  );
  reportContradictions(entries);
};

await main();
