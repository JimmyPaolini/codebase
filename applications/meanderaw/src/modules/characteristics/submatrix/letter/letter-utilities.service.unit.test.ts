import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { LetterUtilitiesService } from "./letter-utilities.service";

import type { LetterOrientation, LetterScript } from "./letter.types";

/** An L: a stem down three points with a foot east, 2 columns by 3 rows, unchanged by no flip or turn. */
const L: readonly string[] = ["4.", "c.", "a1"];

/** A hook turning south at its east end, 3 columns by 2 rows, a second asymmetric shape so the laws are not tuned to one template. */
const HOOK: readonly string[] = ["235", "..8"];

/** The orientation named `name`, or undefined — which no expected template or window equals — when the enumeration lacks it. */
function named(
  orientations: readonly LetterOrientation[],
  name: string,
): LetterOrientation | undefined {
  return orientations.find((entry) => entry.name === name);
}

describe(LetterUtilitiesService, () => {
  let service: LetterUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LetterUtilitiesService, SubmatrixUtilitiesService],
    }).compile();

    service = await module.resolve(LetterUtilitiesService);
  });

  it("is exported by LetterCharacteristicsModule for letter services to inject", async () => {
    const shared = Symbol("shared");
    const module = await Test.createTestingModule({
      imports: [LetterCharacteristicsModule],
      providers: [
        {
          inject: [LetterUtilitiesService],
          provide: shared,
          useFactory: (
            utilities: LetterUtilitiesService,
          ): LetterUtilitiesService => utilities,
        },
      ],
    }).compile();

    expect(module.get(shared)).toBeInstanceOf(LetterUtilitiesService);
  });

  it("mirrors a template east to west, swapping east and west arms", () => {
    expect(service.flipHorizontally(L)).toStrictEqual([".4", ".c", "29"]);
  });

  it("mirrors a template north to south, swapping north and south arms", () => {
    expect(service.flipVertically(L)).toStrictEqual(["61", "c.", "8."]);
  });

  it("turns a template a quarter clockwise, carrying each arm round", () => {
    expect(service.turnClockwise(L, "Quarter")).toStrictEqual(["631", "8.."]);
  });

  it("leaves a template unturned under no rotation", () => {
    expect(service.turnClockwise(L, "None")).toStrictEqual(L);
  });

  describe.each([{ template: L }, { template: HOOK }])(
    "composition laws on $template",
    ({ template }) => {
      it("turns a half as flipping both ways", () => {
        expect(service.turnClockwise(template, "Half")).toStrictEqual(
          service.flipVertically(service.flipHorizontally(template)),
        );
      });

      it("returns to the base after four quarter turns", () => {
        let turned = template;
        for (let turn = 0; turn < 4; turn += 1) {
          turned = service.turnClockwise(turned, "Quarter");
        }

        expect(turned).toStrictEqual(template);
      });

      it("undoes a quarter turn with a three-quarter turn", () => {
        expect(
          service.turnClockwise(
            service.turnClockwise(template, "Quarter"),
            "ThreeQuarter",
          ),
        ).toStrictEqual(template);
      });

      it("undoes each flip by flipping again", () => {
        expect(
          service.flipHorizontally(service.flipHorizontally(template)),
        ).toStrictEqual(template);
        expect(
          service.flipVertically(service.flipVertically(template)),
        ).toStrictEqual(template);
      });
    },
  );

  it.each<{ corner: string; script: LetterScript }>([
    { corner: "Southeast", script: "Greek" },
    { corner: "Southeast", script: "Hangul" },
    { corner: "Southeast", script: "Hanzi" },
    { corner: "Southeast", script: "Katakana" },
    { corner: "Southeast", script: "Latin" },
    { corner: "Southwest", script: "Hebrew" },
  ])("reads $script from the $corner corner", ({ corner, script }) => {
    expect(service.baseCorner(script)).toBe(corner);
  });

  it("names sixteen distinct corner and rotation orientations", () => {
    const names = service.orientationNames();

    expect(names).toHaveLength(16);
    expect(new Set(names).size).toBe(16);
    expect(names).toContain("Southeast");
    expect(names).toContain("NorthwestThreeQuarter");
    expect(names).toContain("SouthwestHalf");
  });

  describe("orientations from a Southeast base", () => {
    let orientations: readonly LetterOrientation[];

    beforeAll(() => {
      orientations = service.orientations(L, "Latin");
    });

    it("pairs every orientation name with a template", () => {
      expect(orientations.map(({ name }) => name)).toStrictEqual(
        service.orientationNames(),
      );
    });

    it("keeps the base template as the Southeast orientation", () => {
      expect(named(orientations, "Southeast")?.template).toStrictEqual(L);
    });

    it("flips the base horizontally, vertically, and both ways for the other corners", () => {
      expect(named(orientations, "Southwest")?.template).toStrictEqual(
        service.flipHorizontally(L),
      );
      expect(named(orientations, "Northeast")?.template).toStrictEqual(
        service.flipVertically(L),
      );
      expect(named(orientations, "Northwest")?.template).toStrictEqual(
        service.flipVertically(service.flipHorizontally(L)),
      );
    });

    it("draws Southeast turned a half the same as Northwest", () => {
      expect(named(orientations, "SoutheastHalf")?.template).toStrictEqual(
        named(orientations, "Northwest")?.template,
      );
    });

    it("turns after flipping, not before", () => {
      expect(named(orientations, "SouthwestQuarter")?.template).toStrictEqual(
        service.turnClockwise(service.flipHorizontally(L), "Quarter"),
      );
      expect(
        named(orientations, "SouthwestQuarter")?.template,
      ).not.toStrictEqual(
        service.flipHorizontally(service.turnClockwise(L, "Quarter")),
      );
    });

    it("draws an asymmetric glyph in eight distinct orientations", () => {
      expect(
        new Set(orientations.map(({ template }) => template.join("/"))).size,
      ).toBe(8);
    });

    it("swaps the window's columns and rows on a quarter or three-quarter turn", () => {
      expect(named(orientations, "Southeast")?.window).toStrictEqual({
        columns: 2,
        rows: 3,
      });
      expect(named(orientations, "SoutheastHalf")?.window).toStrictEqual({
        columns: 2,
        rows: 3,
      });
      expect(named(orientations, "NortheastQuarter")?.window).toStrictEqual({
        columns: 3,
        rows: 2,
      });
      expect(
        named(orientations, "SouthwestThreeQuarter")?.window,
      ).toStrictEqual({ columns: 3, rows: 2 });
    });
  });

  describe("orientations from a Southwest base", () => {
    let orientations: readonly LetterOrientation[];

    beforeAll(() => {
      orientations = service.orientations(L, "Hebrew");
    });

    it("keeps the base template as the Southwest orientation", () => {
      expect(named(orientations, "Southwest")?.template).toStrictEqual(L);
    });

    it("flips the base horizontally, vertically, and both ways for the other corners", () => {
      expect(named(orientations, "Southeast")?.template).toStrictEqual(
        service.flipHorizontally(L),
      );
      expect(named(orientations, "Northwest")?.template).toStrictEqual(
        service.flipVertically(L),
      );
      expect(named(orientations, "Northeast")?.template).toStrictEqual(
        service.flipVertically(service.flipHorizontally(L)),
      );
    });

    it("draws Southwest turned a half the same as Northeast", () => {
      expect(named(orientations, "SouthwestHalf")?.template).toStrictEqual(
        named(orientations, "Northeast")?.template,
      );
    });
  });
});
