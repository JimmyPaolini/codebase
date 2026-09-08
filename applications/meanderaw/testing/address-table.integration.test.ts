import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  BLOCK_END_MARKER,
  BLOCK_START_MARKER,
  EXPECTED_ADDRESS_COLLISIONS,
  README_PATH,
  USAGE_MESSAGE,
} from "./address-table/constants";
import { addressCorpus, createCorpusServices } from "./address-table/corpus";
import {
  extractBlock,
  MissingBlockMarkersError,
  spliceBlock,
} from "./address-table/document";
import { reconcileCollisions } from "./address-table/duplicates";
import { run, selectMode } from "./address-table/run";
import { renderBlock } from "./address-table/table";

import type { AddressedDrawing } from "./address-table/types";

// 🔧 Configuration

/** One drawing's worth of columns, so a test naming two of them says only what it is about. */
const drawing = (
  overrides: Partial<AddressedDrawing> & Pick<AddressedDrawing, "path">,
): AddressedDrawing => ({
  address: "3r2c-56a9",
  canonicalIdentifier: "56a9",
  columns: 2,
  family: "parallel",
  rows: 3,
  variant: "plain",
  ...overrides,
});

/** Whether a drawing comes from a family's enumerated half rather than from a named mode, read off the directory it is filed under. */
const isEnumerated = ({ path: drawingPath }: AddressedDrawing): boolean =>
  /\/\d+-columns\//u.test(drawingPath);

/** A README holding nothing but the two markers, so a splice has somewhere to land. */
const emptyReadme = `# Above\n\n${BLOCK_START_MARKER}\n${BLOCK_END_MARKER}\n\n# Below\n`;

/** Writes `contents` into a throwaway README and returns its path. */
const temporaryReadme = async (contents: string): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), "meanderaw-table-"));
  const readmePath = path.join(directory, "README.md");

  await writeFile(readmePath, contents, "utf8");

  return readmePath;
};

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
  });

  describe("addressing the committed corpus", () => {
    it("addresses every committed drawing", () => {
      expect(corpus.length).toBeGreaterThan(0);
      expect(
        corpus.filter(({ address }) => !/^\d+r\d+c-[0-9a-f]*$/u.test(address)),
      ).toStrictEqual([]);
    });

    it("gives every drawing a repeat unit that is a whole number of columns", () => {
      const malformed = corpus.filter(
        ({ columns, rows }) =>
          !Number.isInteger(columns) || !Number.isInteger(rows),
      );

      expect(malformed).toStrictEqual([]);
    });

    it("reads a parallel serpentine at three rows as the mosaic zigzag tile", () => {
      const serpentine = corpus.find(
        ({ path: drawingPath }) =>
          drawingPath ===
          "parallel/3-rows/serpentine-strands-3-offset-1-6-repeats.svg",
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
        ({ path: drawingPath }) =>
          drawingPath ===
          "parallel/4-rows/serpentine-strands-4-offset-2-6-repeats.svg",
      );

      expect(serpentine?.address).toBe("4r2c-56a933");
    });
  });

  describe("the duplicate check", () => {
    it("passes over the committed corpus", () => {
      expect(reconcileCollisions(corpus)).toStrictEqual({
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
        drawing({ address: "2r2c-21", family: "branch", path: "branch/a.svg" }),
      ]);

      expect(vanished).toContain("branch 2r2c-21");
    });

    it("splits negative's declared collisions the way its doc comment says", () => {
      const declared = EXPECTED_ADDRESS_COLLISIONS["negative"] ?? [];
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
        named.filter(({ columns, rows }) => columns === 1 && rows <= 6),
      );
      expect(collidingNamed).toHaveLength(28);
    });

    it("declares a collision only where the corpus carries one", () => {
      const declared = Object.entries(EXPECTED_ADDRESS_COLLISIONS).flatMap(
        ([family, addresses]) =>
          addresses.map((address) => `${family} ${address}`),
      );

      expect(declared).toStrictEqual([...new Set(declared)]);
    });
  });

  describe("the generated block", () => {
    it("carries one row per drawing, plus the header and its alignment row", () => {
      const rows = renderBlock(corpus)
        .split("\n")
        .filter((line) => line.startsWith("|"));

      expect(rows).toHaveLength(corpus.length + 2);
    });

    it("gives every row all seven columns", () => {
      const widths = new Set(
        renderBlock(corpus)
          .split("\n")
          .filter((line) => line.startsWith("|"))
          .map((line) => line.split("|").length),
      );

      expect([...widths]).toStrictEqual([9]);
    });

    it("is what the README commits", async () => {
      expect(extractBlock(await readFile(README_PATH, "utf8"))).toBe(
        renderBlock(corpus),
      );
    });
  });

  describe("splicing", () => {
    it("leaves every byte outside the markers alone", () => {
      const spliced = spliceBlock(
        emptyReadme,
        `${BLOCK_START_MARKER}\nnew\n${BLOCK_END_MARKER}`,
      );

      expect(spliced).toBe(
        `# Above\n\n${BLOCK_START_MARKER}\nnew\n${BLOCK_END_MARKER}\n\n# Below\n`,
      );
    });

    it("refuses a document with no markers rather than appending to it", () => {
      expect(() => spliceBlock("# Nothing here\n", "block")).toThrow(
        MissingBlockMarkersError,
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

    it("reports a stale block rather than rewriting it under check", async () => {
      const readmePath = await temporaryReadme(emptyReadme);
      const outcome = await run(["--check"], { drawings: corpus, readmePath });

      expect(outcome.exitCode).toBe(1);
      await expect(readFile(readmePath, "utf8")).resolves.toBe(emptyReadme);
    });

    it("rewrites a stale block under write, and then agrees with it", async () => {
      const readmePath = await temporaryReadme(emptyReadme);

      await expect(
        run(["--write"], { drawings: corpus, readmePath }),
      ).resolves.toMatchObject({ exitCode: 0 });
      await expect(
        run(["--check"], { drawings: corpus, readmePath }),
      ).resolves.toMatchObject({ exitCode: 0 });
    });

    it("fails both modes on a duplicate, and writes nothing", async () => {
      const readmePath = await temporaryReadme(emptyReadme);
      const duplicated = [
        drawing({ path: "parallel/3-rows/one.svg" }),
        drawing({ path: "parallel/3-rows/two.svg" }),
      ];

      for (const mode of ["--check", "--write"]) {
        const outcome = await run([mode], { drawings: duplicated, readmePath });

        expect(outcome.exitCode).toBe(1);
        expect(outcome.lines.join("\n")).toContain("undeclared collision");
      }

      await expect(readFile(readmePath, "utf8")).resolves.toBe(emptyReadme);
    });
  });
});
