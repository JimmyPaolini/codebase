import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  EXPECTED_ADDRESS_COLLISIONS,
  TABLE_PATH,
  USAGE_MESSAGE,
} from "./address-table/constants";
import { addressCorpus, createCorpusServices } from "./address-table/corpus";
import { reconcileCollisions } from "./address-table/duplicates";
import { run, selectMode } from "./address-table/run";
import { renderDocument } from "./address-table/table";

import type { AddressedDrawing } from "./address-table/types";

// 🔧 Configuration

/** One drawing's worth of columns, so a test naming two of them says only what it is about. */
const drawing = (
  overrides: Partial<AddressedDrawing> & Pick<AddressedDrawing, "path">,
): AddressedDrawing => ({
  address: "3r2c-56a9",
  canonicalIdentifier: "56a9",
  family: "parallel",
  rows: 3,
  span: 2,
  variant: "plain",
  ...overrides,
});

/** Whether a drawing comes from a family's enumerated half rather than from a named mode, read off the directory it is filed under. */
const isEnumerated = ({ path: drawingPath }: AddressedDrawing): boolean =>
  /\/\d+-columns\//u.test(drawingPath);

/** A table nobody generated, so a run has something stale to disagree with. */
const staleTable = "# 🗺️ Lattice Addresses\n\nnothing yet\n";

/** A path under a throwaway directory, with `contents` already written there when there are any. */
const temporaryTable = async (contents?: string): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), "meanderaw-table-"));
  const tablePath = path.join(directory, "lattice-addresses.md");

  if (contents !== undefined) await writeFile(tablePath, contents, "utf8");

  return tablePath;
};

/**
 * How long booting the application context and addressing the whole
 * committed corpus is given: the same two minutes the charter sweep's own
 * `CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS` allows, and for the same
 * reason. 9,863 drawings, each read off disk and really identified, sits
 * well past vitest's ten-second default on its own, and beside this
 * project's other full-sweep files on a cold cache it passed thirty
 * seconds — so the headroom is what stops a green suite failing for load
 * rather than for a wrong address.
 */
const CORPUS_ADDRESSING_TIMEOUT_MILLISECONDS = 120_000;

// 🧪 Tests

describe("the lattice address table", () => {
  let corpus: AddressedDrawing[];

  beforeAll(async () => {
    const services = await createCorpusServices();

    try {
      corpus = await addressCorpus(services);
    } finally {
      await services.close();
    }
  }, CORPUS_ADDRESSING_TIMEOUT_MILLISECONDS);

  describe("addressing the committed corpus", () => {
    it("addresses every committed drawing", () => {
      expect(corpus.length).toBeGreaterThan(0);
      expect(
        corpus.filter(({ address }) => !/^\d+r\d+c-[0-9a-f]*$/u.test(address)),
      ).toStrictEqual([]);
    });

    it("gives every drawing a repeat unit that is a whole number of columns", () => {
      const malformed = corpus.filter(
        ({ rows, span }) => !Number.isInteger(rows) || !Number.isInteger(span),
      );

      expect(malformed).toStrictEqual([]);
    });

    // 🎯 The drawing is found by the three columns that name it rather than
    // by its path, so a change to how a filename is spelled cannot make this
    // silently find nothing: `variant` is already the name stripped of both
    // the repeat count and the address.
    it("reads a parallel serpentine at three rows as the mosaic zigzag tile", () => {
      const serpentine = corpus.find(
        ({ family, rows, variant }) =>
          family === "parallel" &&
          rows === 3 &&
          variant === "serpentine-strands-3-offset-1",
      );
      const zigzag = corpus.find(
        ({ path: drawingPath }) =>
          drawingPath === "mosaic/3-rows/2-columns/56a9-zigzag.svg",
      );

      expect(serpentine?.address).toBe("3r2c-56a9");
      expect(serpentine?.subFamily).toBe("zigzag");
      expect(zigzag?.canonicalIdentifier).toBe(serpentine?.canonicalIdentifier);
    });

    it("reads a wider parallel serpentine as the mosaic tile of twice the depth", () => {
      const serpentine = corpus.find(
        ({ family, rows, variant }) =>
          family === "parallel" &&
          rows === 4 &&
          variant === "serpentine-strands-4-offset-2",
      );

      expect(serpentine?.address).toBe("4r2c-56a933");
    });
  });

  describe("the duplicate check", () => {
    it("passes over the committed corpus", () => {
      expect(reconcileCollisions(corpus)).toStrictEqual({
        miscounted: [],
        undeclared: [],
        vanished: [],
      });
    });

    it("fires when two drawings of one family share an undeclared address", () => {
      const { undeclared } = reconcileCollisions([
        drawing({ path: "parallel/3-rows/one.svg" }),
        drawing({ path: "parallel/3-rows/two.svg" }),
      ]);

      expect(undeclared).toStrictEqual([
        "parallel 3r2c-56a9: parallel/3-rows/one.svg, parallel/3-rows/two.svg",
      ]);
    });

    it("stays quiet when the two drawings sit in different families", () => {
      expect(
        reconcileCollisions([
          drawing({ family: "parallel", path: "parallel/3-rows/one.svg" }),
          drawing({
            family: "mosaic",
            path: "mosaic/3-rows/2-columns/one.svg",
          }),
        ]).undeclared,
      ).toStrictEqual([]);
    });

    it("fires when a declared collision has stopped happening", () => {
      const { vanished } = reconcileCollisions([
        drawing({ address: "2r2c-21", path: "parallel/2-rows/one.svg" }),
      ]);

      expect(vanished).toContain("parallel 2r2c-21");
    });

    it("splits negative's declared collisions the way its doc comment says", () => {
      const declared = Object.keys(
        EXPECTED_ADDRESS_COLLISIONS["negative"] ?? {},
      );
      const named = corpus.filter(
        (drawing) => drawing.family === "negative" && !isEnumerated(drawing),
      );
      const collidingNamed = named.filter(({ address }) =>
        declared.includes(address),
      );

      expect(declared).toHaveLength(46);
      expect(
        declared.filter((address) =>
          named.some((drawing) => drawing.address === address),
        ),
      ).toHaveLength(24);
      expect(collidingNamed).toStrictEqual(
        named.filter(({ rows, span }) => span === 1 && rows <= 6),
      );
      expect(collidingNamed).toHaveLength(28);
    });

    it("declares a collision only where the corpus carries one", () => {
      const declared = Object.entries(EXPECTED_ADDRESS_COLLISIONS).flatMap(
        ([family, addresses]) =>
          Object.keys(addresses).map((address) => `${family} ${address}`),
      );

      expect(declared).toStrictEqual([...new Set(declared)]);
    });

    it("counts every declared collision, and fires when one drawing more lands on it", () => {
      const census = Object.values(EXPECTED_ADDRESS_COLLISIONS).flatMap(
        (addresses) => Object.values(addresses),
      );

      expect(census).toHaveLength(67);
      expect(census.filter((count) => count < 2)).toStrictEqual([]);
      expect(census.reduce((total, count) => total + count, 0)).toBe(188);

      const { miscounted } = reconcileCollisions([
        ...corpus,
        drawing({
          address: "2r2c-21",
          path: "parallel/2-rows/third.svg",
        }),
      ]);

      expect(miscounted).toStrictEqual([
        "parallel 2r2c-21: 3 drawings share it, not the declared 2 — parallel/2-rows/serpentine-strands-2-flip-alternating-6-repeats-2r2c.svg, parallel/2-rows/serpentine-strands-2-offset-1-6-repeats-2r2c.svg, parallel/2-rows/third.svg",
      ]);
    });

    it("fires when a declared collision loses a drawing without losing the collision", () => {
      const [first, second, third] = corpus.filter(
        ({ address, family }) => family === "negative" && address === "3r1c-33",
      );

      expect([first, second, third].filter(Boolean)).toHaveLength(3);

      const { miscounted, undeclared, vanished } = reconcileCollisions(
        [first, second, third].filter(
          (candidate): candidate is AddressedDrawing => candidate !== undefined,
        ),
      );

      expect(undeclared).toStrictEqual([]);
      expect(vanished).not.toStrictEqual([]);
      expect(miscounted.join("\n")).toContain(
        "negative 3r1c-33: 3 drawings share it, not the declared 6",
      );
    });
  });

  /**
   * The figures `docs/adr/0007-address-every-meander-by-its-lattice.md`
   * states about the corpus as a whole.
   *
   * They are pinned here rather than only derived in prose, because a number
   * an ADR states and nothing measures rots silently: every one below is
   * read off the same addressed corpus the committed table is rendered from,
   * so a drawing that changes shape moves the number and fails here.
   */
  describe("the figures ADR 0007 states", () => {
    it("addresses the whole committed corpus", () => {
      expect(corpus).toHaveLength(9877);
    });

    it("counts the classes more than one family draws", () => {
      const drawnBy = new Map<string, Set<string>>();

      for (const { canonicalIdentifier, family, rows, span } of corpus) {
        const key = `${rows}r${span}c-${canonicalIdentifier}`;
        const families = drawnBy.get(key) ?? new Set<string>();

        drawnBy.set(key, families);
        families.add(family);
      }

      const shared = [...drawnBy.values()].filter(
        (families) => families.size > 1,
      );
      const byPair: Record<string, number> = {};

      for (const families of shared) {
        const pair = [...families].toSorted().join("+");

        byPair[pair] = (byPair[pair] ?? 0) + 1;
      }

      expect(shared).toHaveLength(149);
      expect(byPair).toMatchObject({
        "mosaic+negative": 92,
        "mosaic+parallel": 22,
        "snake+whirl": 18,
      });
    });

    it("counts the classes covering more than one address inside one family", () => {
      const addresses = new Map<string, Set<string>>();
      const drawings = new Map<string, number>();

      for (const drawing of corpus) {
        const key = `${drawing.family}|${drawing.rows}|${drawing.canonicalIdentifier}`;

        addresses.set(
          key,
          (addresses.get(key) ?? new Set<string>()).add(drawing.address),
        );
        drawings.set(key, (drawings.get(key) ?? 0) + 1);
      }

      const groups = [...addresses].filter(([, spelled]) => spelled.size > 1);
      const byFamily: Record<string, number> = {};

      for (const [key] of groups) {
        const family = key.split("|")[0] ?? "";

        byFamily[family] = (byFamily[family] ?? 0) + 1;
      }

      expect({
        drawings: groups.reduce(
          (total, [key]) => total + (drawings.get(key) ?? 0),
          0,
        ),
        groups: groups.length,
      }).toStrictEqual({ drawings: 689, groups: 283 });
      expect(byFamily).toStrictEqual({
        boxes: 10,
        branch: 10,
        negative: 55,
        parallel: 208,
      });
    });

    it("counts the drawings whose literal address is already the canonical member", () => {
      const canonical = corpus.filter(
        ({ address, canonicalIdentifier }) =>
          address.split("-")[1] === canonicalIdentifier,
      );

      expect(canonical).toHaveLength(9161);
    });
  });

  describe("the generated file", () => {
    it("carries one row per drawing, plus the header and its alignment row", () => {
      const rows = renderDocument(corpus)
        .split("\n")
        .filter((line) => line.startsWith("|"));

      expect(rows).toHaveLength(corpus.length + 2);
    });

    it("gives every row all seven columns", () => {
      const widths = new Set(
        renderDocument(corpus)
          .split("\n")
          .filter((line) => line.startsWith("|"))
          .map((line) => line.split("|").length),
      );

      expect([...widths]).toStrictEqual([9]);
    });

    it("titles itself and says what rewrites it", () => {
      const [title, blank, statement] = renderDocument(corpus).split("\n");

      expect(title).toBe("# 🗺️ Lattice Addresses");
      expect(blank).toBe("");
      expect(statement).toContain("9,877");
      expect(statement).toContain("nx run meanderaw:address-table:write");
    });

    it("is what the repository commits, byte for byte", async () => {
      await expect(readFile(TABLE_PATH, "utf8")).resolves.toBe(
        renderDocument(corpus),
      );
    });
  });

  describe("the run modes", () => {
    it("refuses a command line naming neither mode or both", async () => {
      expect(selectMode([])).toBeUndefined();
      expect(selectMode(["--check", "--write"])).toBeUndefined();
      await expect(run([])).resolves.toStrictEqual({
        exitCode: 1,
        lines: [USAGE_MESSAGE],
      });
    });

    it("reports a stale table rather than rewriting it under check", async () => {
      const tablePath = await temporaryTable(staleTable);
      const outcome = await run(["--check"], { drawings: corpus, tablePath });

      expect(outcome.exitCode).toBe(1);
      await expect(readFile(tablePath, "utf8")).resolves.toBe(staleTable);
    });

    it("reports a table that is missing altogether as stale", async () => {
      const tablePath = await temporaryTable();
      const outcome = await run(["--check"], { drawings: corpus, tablePath });

      expect(outcome).toStrictEqual({
        exitCode: 1,
        lines: [
          "🗺️ The committed lattice address table is stale.",
          "💡 Run `nx run meanderaw:address-table:write`.",
        ],
      });
    });

    it("writes the whole file under write, and then agrees with it", async () => {
      const tablePath = await temporaryTable(staleTable);

      await expect(
        run(["--write"], { drawings: corpus, tablePath }),
      ).resolves.toMatchObject({ exitCode: 0 });
      await expect(readFile(tablePath, "utf8")).resolves.toBe(
        renderDocument(corpus),
      );
      await expect(
        run(["--check"], { drawings: corpus, tablePath }),
      ).resolves.toMatchObject({ exitCode: 0 });
    });

    it("fails both modes on a duplicate, and writes nothing", async () => {
      const tablePath = await temporaryTable(staleTable);
      const duplicated = [
        drawing({ path: "parallel/3-rows/one.svg" }),
        drawing({ path: "parallel/3-rows/two.svg" }),
      ];

      for (const mode of ["--check", "--write"]) {
        const outcome = await run([mode], { drawings: duplicated, tablePath });

        expect(outcome.exitCode).toBe(1);
        expect(outcome.lines.join("\n")).toContain("undeclared collision");
      }

      await expect(readFile(tablePath, "utf8")).resolves.toBe(staleTable);
    });
  });
});
