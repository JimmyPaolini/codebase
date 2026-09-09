import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { OutputPathService } from "./output-path.service";
import { FILENAME_ADDRESS_SUFFIX_PATTERN } from "./svg-rendering.constants";

import type { LatticeAddress } from "../lattice-identification/lattice-identification.types";

/** A stand-in lattice address, exactly as `LatticeIdentificationService.identifyDocument` would return one. */
const ADDRESS: LatticeAddress = {
  address: "6r5c-63335c635ccc69ccca399a333",
  canonicalIdentifier: "63335c635ccc69ccca399a333",
  identifier: "63335c635ccc69ccca399a333",
  rows: 6,
  span: 5,
};

describe(OutputPathService, () => {
  let service: OutputPathService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OutputPathService],
    }).compile();

    service = await module.resolve(OutputPathService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("build", () => {
    it("files an unmodified drawing under its family and row count, named for the repeat count it was drawn at", () => {
      expect(service.build({ repeatCount: 8, rows: 5, type: "boxes" })).toBe(
        "boxes/5-rows/plain-8-repeats.svg",
      );
    });

    it("names the file after a modifier that has no extra parameters", () => {
      expect(
        service.build({
          modifier: { name: "spin" },
          repeatCount: 4,
          rows: 5,
          type: "boxes",
        }),
      ).toBe("boxes/5-rows/spin-4-repeats.svg");
    });

    it("uses edge-flip's name unchanged", () => {
      expect(
        service.build({
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 4,
          type: "chain",
        }),
      ).toBe("chain/4-rows/edge-flip-6-repeats.svg");
    });

    it("names the file after the sub-family, so a named region of the unit space is legible in it", () => {
      expect(
        service.build({
          repeatCount: 6,
          rows: 6,
          subFamily: "dots",
          type: "mosaic",
        }),
      ).toBe("mosaic/6-rows/dots-6-repeats.svg");
    });

    it("carries a sub-family's own repeat count into the filename", () => {
      expect(
        service.build({
          repeatCount: 12,
          rows: 5,
          subFamily: "diamond",
          type: "mosaic",
        }),
      ).toBe("mosaic/5-rows/diamond-12-repeats.svg");
    });

    // 🎯 A direction reads on its own, so it follows the modifier's name
    // the way `dot`'s shape does — and both values are spelled out rather
    // than one being the unmarked case, so neither direction is the one you
    // have to know the default to identify.
    it.each([
      { direction: "northeast" as const, variant: "rung-northeast" },
      { direction: "northwest" as const, variant: "rung-northwest" },
      { direction: "southeast" as const, variant: "rung-southeast" },
      { direction: "southwest" as const, variant: "rung-southwest" },
    ])("names a rung drawing $variant", ({ direction, variant }) => {
      expect(
        service.build({
          modifier: { direction, name: "rung" },
          repeatCount: 6,
          rows: 5,
          type: "branch",
        }),
      ).toBe(`branch/5-rows/${variant}-6-repeats.svg`);
    });

    // 🎯 A bare number would say nothing, so the parameter is named before
    // it — the spelling `alternated` and `plied` already use.
    it("carries stagger's branch count into the filename", () => {
      expect(
        service.build({
          modifier: { branches: 4, name: "stagger" },
          repeatCount: 6,
          rows: 5,
          type: "branch",
        }),
      ).toBe("branch/5-rows/stagger-branches-4-6-repeats.svg");
    });

    describe("given a lattice address", () => {
      // 🎯 `FILENAME_ADDRESS_CONVENTION` declares `branch` full-address:
      // its own worst-case address holds comfortably under 255 bytes, so
      // nothing stands between a reader and the literal address.
      it("appends the full address for a family whose addresses fit", () => {
        expect(
          service.build({ repeatCount: 6, rows: 5, type: "branch" }, ADDRESS),
        ).toBe(
          "branch/5-rows/plain-6-repeats-6r5c-63335c635ccc69ccca399a333.svg",
        );
      });

      // 🎯 `boxes` is declared shape-only: its `spin-flip` mode alone
      // breaches 255 bytes at deep row counts, so every one of its
      // filenames carries the shape rather than the literal address, with
      // no hexadecimal identifier at all.
      it("appends the shape alone for a family whose addresses do not fit", () => {
        expect(
          service.build({ repeatCount: 8, rows: 5, type: "boxes" }, ADDRESS),
        ).toBe("boxes/5-rows/plain-8-repeats-6r5c.svg");
      });

      it("appends nothing when no address is given, so mosaic's own filenames stay exactly as committed", () => {
        expect(
          service.build({
            repeatCount: 6,
            rows: 6,
            subFamily: "dots",
            type: "mosaic",
          }),
        ).toBe("mosaic/6-rows/dots-6-repeats.svg");
      });
    });
  });

  // 🎯 The property every reader of the committed corpus depends on: taking
  // the suffix back off a path returns the path parameters alone would have
  // built, whichever convention wrote it. A reader holding only a path
  // cannot rebuild the suffix — that needs the ink — so this is the one
  // direction available to it, and it has to be exact rather than close.
  describe("taking a filename's address back off", () => {
    it.each([
      { case: "the full address", type: "branch" },
      { case: "the shape alone", type: "boxes" },
    ] as const)("undoes $case", ({ type }) => {
      const parameters = { repeatCount: 6, rows: 5, type } as const;

      expect(
        service
          .build(parameters, ADDRESS)
          .replace(FILENAME_ADDRESS_SUFFIX_PATTERN, ""),
      ).toBe(service.build(parameters));
    });

    it("leaves a filename no address was appended to exactly as mosaic committed it", () => {
      const committed = "mosaic/6-rows/dots-6-repeats.svg";

      expect(committed.replace(FILENAME_ADDRESS_SUFFIX_PATTERN, "")).toBe(
        committed,
      );
    });

    it("leaves a variant that merely ends in something shaped like a shape alone", () => {
      const named = "boxes/5-rows/plain-12r42c.svg";

      expect(named.replace(FILENAME_ADDRESS_SUFFIX_PATTERN, "")).toBe(named);
    });
  });

  describe("familyDirectory", () => {
    it("indexes a family's drawings by the row count they were drawn at", () => {
      expect(service.familyDirectory("mosaic", 7)).toBe("mosaic/7-rows");
    });
  });
});
