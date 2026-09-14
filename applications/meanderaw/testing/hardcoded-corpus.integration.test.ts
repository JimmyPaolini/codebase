import { beforeAll, describe, expect, it } from "vitest";

import { HARDCODED_MEANDERS_BY_FAMILY } from "../src/modules/hardcoded-meanders/hardcoded-meanders.constants";

import {
  collectNamedCorpus,
  createCorpusServices,
} from "./hardcoded-corpus/corpus";

import type { CollectedHardcodedMeander } from "./hardcoded-corpus/types";

/**
 * Verifies ticket #818's own acceptance criterion — "the ingested set is
 * verified to match the existing corpus (same coverage, no missing or
 * duplicate entries)" — by re-walking the committed corpus's named-type
 * half and comparing it against the checked-in hardcoded constants
 * `scripts/generate-hardcoded-corpus.ts` produced from that same walk.
 *
 * It reads the corpus rather than redrawing it, the same choice the retired
 * `address-table.integration.test.ts` made, so a run over the full corpus
 * stays fast enough to gate on: booting the real container and reading
 * every committed drawing is real work rather than a hang, hence the
 * generous timeout below rather than vitest's five-second default.
 */
describe("the hardcoded corpus's coverage of the committed corpus", () => {
  let collected: CollectedHardcodedMeander[];

  const CORPUS_COVERAGE_TIMEOUT_MILLISECONDS = 120_000;

  beforeAll(async () => {
    const services = await createCorpusServices();

    try {
      collected = await collectNamedCorpus(services);
    } finally {
      await services.close();
    }
  }, CORPUS_COVERAGE_TIMEOUT_MILLISECONDS);

  /** Every Code the committed `*.constants.ts` files carry, across every family. */
  const committedCodes = (): string[] =>
    Object.values(HARDCODED_MEANDERS_BY_FAMILY).flatMap((entries) =>
      entries.map((entry) => entry.code),
    );

  /** Every distinct Code the corpus's named-type half resolves to. */
  const distinctCorpusCodes = (): Set<string> =>
    new Set(collected.map((drawing) => drawing.code));

  /**
   * One field of the corpus's first drawing to resolve to each Code,
   * matching `scripts/generate-hardcoded-corpus.ts`'s own dedupe: the walk
   * is a path-sorted, deterministic order, so "first" always names the same
   * drawing here as it did when the committed constants were generated. A
   * plain `Map` construction would instead keep whichever drawing sorts
   * last, since a later `.set()` for one Code overwrites an earlier one.
   */
  const firstByCode = <Field extends keyof CollectedHardcodedMeander>(
    field: Field,
  ): Map<string, CollectedHardcodedMeander[Field]> => {
    const byCode = new Map<string, CollectedHardcodedMeander[Field]>();

    for (const drawing of collected) {
      if (!byCode.has(drawing.code)) byCode.set(drawing.code, drawing[field]);
    }

    return byCode;
  };

  it("reads a non-empty corpus, so an empty result cannot pass every assertion below vacuously", () => {
    expect(collected.length).toBeGreaterThan(0);
  });

  it("commits no duplicate Code across any family's constants", () => {
    const codes = committedCodes();

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("carries exactly as many distinct entries as the corpus has distinct Codes", () => {
    expect(new Set(committedCodes()).size).toBe(distinctCorpusCodes().size);
  });

  it("misses no Code the committed corpus resolves to", () => {
    const committed = new Set(committedCodes());
    const missing = [...distinctCorpusCodes()].filter(
      (code) => !committed.has(code),
    );

    expect(missing).toStrictEqual([]);
  });

  it("commits no Code beyond what the committed corpus resolves to", () => {
    const corpusCodes = distinctCorpusCodes();
    const extra = committedCodes().filter((code) => !corpusCodes.has(code));

    expect(extra).toStrictEqual([]);
  });

  it("files every entry under the family the corpus itself recorded it under", () => {
    const familyByCode = firstByCode("family");
    const misfiled = Object.entries(HARDCODED_MEANDERS_BY_FAMILY).flatMap(
      ([family, entries]) =>
        entries
          .filter((entry) => familyByCode.get(entry.code) !== family)
          .map((entry) => `${family}: ${entry.code}`),
    );

    expect(misfiled).toStrictEqual([]);
  });

  it("carries over the subFamily the corpus recorded, where it recorded one", () => {
    const subFamilyByCode = firstByCode("subFamily");
    const mismatched = Object.values(HARDCODED_MEANDERS_BY_FAMILY)
      .flat()
      .filter((entry) => entry.subFamily !== subFamilyByCode.get(entry.code))
      .map((entry) => entry.code);

    expect(mismatched).toStrictEqual([]);
  });
});
