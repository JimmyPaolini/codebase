import { readdir } from "node:fs/promises";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { DrawRenderingService } from "../draw/draw-rendering.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { LatticeIdentificationModule } from "../lattice-identification/lattice-identification.module";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { isMotifDrawnType } from "../meander-generation/meander-generation.utilities";
import { MosaicNamingModule } from "../mosaic-naming/mosaic-naming.module";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";

import { OutputPathService } from "./output-path.service";
import { FILENAME_ADDRESS_CONVENTION } from "./svg-rendering.constants";

import type { MotifDrawnType } from "../meander-generation/meander-generation.types";
import type { FilenameAddressConvention } from "./svg-rendering.types";

// 🔧 Configuration

/**
 * How long rendering the whole named-type sweep and addressing every
 * document is given.
 *
 * All 1,104 combinations are really generated and really read back through
 * `MeanderLatticeService`, and the whole file measures at about 0.8 seconds
 * of test time on a development machine. This is a stall guard with an order
 * of magnitude of headroom for a loaded CI runner, not a budget anything
 * approaches — the two minutes it used to declare said the opposite about
 * work that never took a fifth of it.
 */
const FULL_SWEEP_TIMEOUT_MILLISECONDS = 15_000;

/** A `shape-only` filename's own suffix: the row count, then the column span, and nothing else. */
const SHAPE_ONLY_SUFFIX_PATTERN = /-(\d+)r(\d+)c\.svg$/u;

/** A `full-address` filename's own suffix: the row count, the column span, then the hexadecimal identifier. */
const FULL_ADDRESS_SUFFIX_PATTERN = /-(\d+)r(\d+)c-([0-9a-f]+)\.svg$/u;

/**
 * The widest filename each family would carry **if every one of them were
 * spelled `full-address`**, in bytes, measured over the whole named-type
 * sweep.
 *
 * It is the figure `FILENAME_ADDRESS_CONVENTION`'s own prose quotes, and
 * asserting it is what keeps that prose from going stale: for the six
 * `shape-only` families the 255-byte assertion below is vacuous — their real
 * names top out at 68 bytes, `parallel`'s `plied-strands-12` at twelve rows —
 * so a span that widens again would move the reason those families are
 * `shape-only` without moving anything that is checked.
 *
 * The three `full-address` families here are their real emitted widths, so
 * their rows are the same measurement read twice: once here and once against
 * the limit. `mosaic` is the fourth family declared `full-address` and is
 * absent from this table, because it draws no motif and so never reaches
 * this sweep at all.
 */
const WIDEST_FULL_ADDRESS_BYTES: readonly {
  readonly bytes: number;
  readonly family: MotifDrawnType;
}[] = [
  { bytes: 515, family: "boxes" },
  { bytes: 94, family: "branch" },
  { bytes: 295, family: "chain" },
  { bytes: 54, family: "cross" },
  { bytes: 58, family: "negative" },
  { bytes: 566, family: "parallel" },
  { bytes: 295, family: "snake" },
  { bytes: 488, family: "swirl" },
  { bytes: 290, family: "whirl" },
];

/** The committed corpus, read rather than redrawn — the only source of a filename this suite has that is not the code under test. */
const OUTPUT_DIRECTORY = path.join(import.meta.dirname, "../../../output");

/** One combination of the named-type sweep, rendered and named exactly as `DrawCommand` names it. */
interface AddressedCombination {
  readonly filePath: string;
  readonly type: MotifDrawnType;
}

/**
 * Every committed filename of one family's named drawings, read off disk.
 *
 * The enumerated halves are skipped: they sit in `<span>-columns`
 * subdirectories beneath a row count and are named by
 * `DrawPermutationsService` rather than addressed by `OutputPathService`.
 */
const committedFileNames = async (type: MotifDrawnType): Promise<string[]> => {
  const rowDirectories = await readdir(path.join(OUTPUT_DIRECTORY, type));
  const listings = await Promise.all(
    rowDirectories.map(async (rowDirectory) =>
      readdir(path.join(OUTPUT_DIRECTORY, type, rowDirectory), {
        withFileTypes: true,
      }),
    ),
  );

  return listings
    .flat()
    .filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
    .map((entry) => entry.name);
};

/**
 * The row count, span, and identifier a filename's own suffix spells out,
 * beside which of the two conventions spelled it — `undefined` for a
 * filename that matches neither, which is a breach rather than a case to
 * skip.
 */
interface DetectedAddress {
  readonly convention: FilenameAddressConvention;
  readonly identifierLength: number;
  readonly rows: number;
  readonly span: number;
}

/** Reads a filename's address suffix back off it, or `undefined` when it carries neither convention's. */
const detect = (fileName: string): DetectedAddress | undefined => {
  const [, fullRows, fullSpan, identifier] =
    FULL_ADDRESS_SUFFIX_PATTERN.exec(fileName) ?? [];

  if (fullRows && fullSpan && identifier) {
    return {
      convention: "full-address",
      identifierLength: identifier.length,
      rows: Number(fullRows),
      span: Number(fullSpan),
    };
  }

  const [, shapeRows, shapeSpan] =
    SHAPE_ONLY_SUFFIX_PATTERN.exec(fileName) ?? [];

  if (shapeRows && shapeSpan) {
    return {
      convention: "shape-only",
      identifierLength: 0,
      rows: Number(shapeRows),
      span: Number(shapeSpan),
    };
  }

  return undefined;
};

// 🧪 Tests

describe(OutputPathService, () => {
  describe("addressed filenames across the whole named-type sweep", () => {
    let addressed: AddressedCombination[];

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          LatticeIdentificationModule,
          MeanderGenerationModule,
          MosaicNamingModule,
        ],
        providers: [
          DrawCombinationsService,
          DrawRenderingService,
          GridGeometryService,
          ParallelSerpentineService,
          { provide: LoggerService, useValue: createMock<LoggerService>() },
        ],
      }).compile();

      const combinations = await module.resolve(DrawCombinationsService);
      const rendering = await module.resolve(DrawRenderingService);

      // 🎯 Through `DrawRenderingService` rather than beside it: this used
      // to re-derive the pitch, the span, the address and the path itself,
      // which passes just as happily when the command has stopped asking
      // for an address at all.
      addressed = combinations.enumerate().map((parameters) => {
        if (!isMotifDrawnType(parameters.type)) {
          throw new Error(
            `unexpected tile-drawn type in the named sweep: ${parameters.type}`,
          );
        }

        const { directory, fileName } = rendering.render(parameters);

        return {
          filePath: `${directory}/${fileName}`,
          type: parameters.type,
        };
      });
    }, FULL_SWEEP_TIMEOUT_MILLISECONDS);

    // 🎯 This is the sweep the two prior pull requests moved: `branch` and
    // `parallel` drawing changes, and `spin`, `spin-flip`, `edge-flip`, and
    // `plied` widened to their true multi-pitch repeats. A family that
    // newly breaches 255 bytes here is exactly the case
    // `FILENAME_ADDRESS_CONVENTION` exists to catch loudly — see `chain`
    // and `snake`, moved to `shape-only` for precisely this reason.
    it("keeps every addressed filename at or under 255 bytes, naming the offending family when one breaches", () => {
      const breaches = addressed
        .map(({ filePath, type }) => ({
          bytes: Buffer.byteLength(path.posix.basename(filePath), "utf8"),
          fileName: path.posix.basename(filePath),
          type,
        }))
        .filter(({ bytes }) => bytes > 255)
        .map(
          ({ bytes, fileName, type }) =>
            `${type}: ${fileName} (${bytes} bytes)`,
        );

      expect(breaches).toStrictEqual([]);
    });

    // 🎯 What each family's committed drawings actually spell, against what
    // `FILENAME_ADDRESS_CONVENTION` declares they spell. Detecting the
    // convention off the *emitted* filename instead could not fail:
    // `addressSuffix` reads that same record, so emitted and declared agree
    // by construction, and flipping a family's row would flip both halves
    // of the comparison together. Disk is the one source of a filename here
    // that the record does not decide, so a family whose whole directory is
    // spelled the other way — or spelled with no address at all — is caught
    // by comparing against it.
    it.each(WIDEST_FULL_ADDRESS_BYTES)(
      "files every committed $family drawing in the convention that family declares",
      async ({ family }) => {
        const declared = FILENAME_ADDRESS_CONVENTION[family];
        const fileNames = await committedFileNames(family);
        const breaches = fileNames
          .map((fileName) => ({
            emitted: detect(fileName)?.convention,
            fileName,
          }))
          .filter(({ emitted }) => emitted !== declared)
          .map(
            ({ emitted, fileName }) =>
              `${fileName} spells ${emitted ?? "no address"}, declared ${declared}`,
          );

        expect(fileNames.length).toBeGreaterThan(0);
        expect(breaches).toStrictEqual([]);
      },
    );

    // 🎯 The sweep writes the corpus this repository commits, so every
    // filename it renders is one that is already on disk. It is what makes
    // the assertion above bite in the other direction too: a renaming that
    // moved both the record and the committed tree would still have to move
    // this, and a renaming that moved neither cannot pass it.
    it("renders only filenames the committed corpus already carries", async () => {
      const committed = new Map<MotifDrawnType, Set<string>>();

      for (const { family } of WIDEST_FULL_ADDRESS_BYTES) {
        committed.set(family, new Set(await committedFileNames(family)));
      }

      const missing = addressed
        .filter(
          ({ filePath, type }) =>
            !committed.get(type)?.has(path.posix.basename(filePath)),
        )
        .map(({ filePath }) => filePath);

      expect(missing).toStrictEqual([]);
    });

    // 🎯 One hexadecimal character per tile point, and a tile spanning
    // `span` columns of a `rows`-row band has `span * (rows - 1)` of them —
    // the border rules are not addressed. Measured against the four
    // families that really emit an identifier, so the arithmetic the
    // worst-case widths below apply to the six that do not is pinned to
    // something real.
    it("spells one identifier character per addressed tile point", () => {
      const breaches = addressed
        .map(({ filePath, type }) => ({
          detected: detect(path.posix.basename(filePath)),
          type,
        }))
        .filter(({ detected }) => detected?.convention === "full-address")
        .filter(
          ({ detected }) =>
            detected?.identifierLength !==
            (detected?.span ?? 0) * ((detected?.rows ?? 0) - 1),
        );

      expect(breaches).toStrictEqual([]);
    });

    // 🎯 The figures `FILENAME_ADDRESS_CONVENTION`'s prose quotes as the
    // reason each family is spelled the way it is. A `shape-only` family's
    // own names are nowhere near the limit, so without this the sentence
    // that justifies its convention is unchecked prose.
    it("matches the widest full-address filename each family would carry", () => {
      const widest = new Map<MotifDrawnType, number>();

      for (const { filePath, type } of addressed) {
        const fileName = path.posix.basename(filePath);
        const detected = detect(fileName);
        const identifierBytes =
          detected?.convention === "shape-only"
            ? 1 + detected.span * (detected.rows - 1)
            : 0;
        const bytes = Buffer.byteLength(fileName, "utf8") + identifierBytes;

        widest.set(type, Math.max(widest.get(type) ?? 0, bytes));
      }

      const byFamily = ({ family }: { family: MotifDrawnType }): string =>
        family;
      const measured = [...widest.entries()]
        .map(([family, bytes]) => ({ bytes, family }))
        .toSorted((left, right) =>
          byFamily(left).localeCompare(byFamily(right)),
        );

      expect(measured).toStrictEqual(
        WIDEST_FULL_ADDRESS_BYTES.toSorted((left, right) =>
          byFamily(left).localeCompare(byFamily(right)),
        ),
      );
    });
  });
});
