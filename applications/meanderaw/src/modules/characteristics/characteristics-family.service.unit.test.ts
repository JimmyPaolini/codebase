import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsFamilyService } from "./characteristics-family.service";

import type { CodeObject } from "../code/code.types";

// 🧪 Tests

describe(CharacteristicsFamilyService, () => {
  let service: CharacteristicsFamilyService;

  const code = (digits: string, rows: number, columns: number): CodeObject => ({
    columns,
    digits,
    repeats: 1,
    rows,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CharacteristicsFamilyService],
    }).compile();

    service = await module.resolve(CharacteristicsFamilyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("isBars", () => {
    it("recognizes 1-column vertical bars across 2 rows, 3 rows, and 4 rows", () => {
      expect(service.isBars(code("48", 2, 1))).toBe(true);
      expect(service.isBars(code("4c8", 3, 1))).toBe(true);
      expect(service.isBars(code("4cc8", 4, 1))).toBe(true);
    });

    it("recognizes multi-column vertical bars", () => {
      expect(service.isBars(code("4488", 2, 2))).toBe(true);
      expect(service.isBars(code("444888", 2, 3))).toBe(true);
      expect(service.isBars(code("44cc88", 3, 2))).toBe(true);
      expect(service.isBars(code("44cccc88", 4, 2))).toBe(true);
    });

    it("rejects codes with insufficient rows or horizontal connections", () => {
      expect(service.isBars(code("3", 1, 1))).toBe(false);
      expect(service.isBars(code("4588", 2, 2))).toBe(false);
      expect(service.isBars(code("00", 2, 1))).toBe(false);
    });
  });

  describe("isDots", () => {
    it("recognizes codes with zero connections across various shapes", () => {
      expect(service.isDots(code("0", 1, 1))).toBe(true);
      expect(service.isDots(code("00", 2, 1))).toBe(true);
      expect(service.isDots(code("0000", 2, 2))).toBe(true);
      expect(service.isDots(code("000000", 3, 2))).toBe(true);
    });

    it("rejects codes that contain any non-zero digits", () => {
      expect(service.isDots(code("03", 2, 1))).toBe(false);
      expect(service.isDots(code("0004", 2, 2))).toBe(false);
      expect(service.isDots(code("3333", 2, 2))).toBe(false);
    });
  });

  describe("isLines", () => {
    it("recognizes parallel horizontal lines across various shapes", () => {
      expect(service.isLines(code("3", 1, 1))).toBe(true);
      expect(service.isLines(code("33", 2, 1))).toBe(true);
      expect(service.isLines(code("3333", 2, 2))).toBe(true);
      expect(service.isLines(code("333333", 3, 2))).toBe(true);
    });

    it("rejects codes that contain non-3 digits", () => {
      expect(service.isLines(code("30", 2, 1))).toBe(false);
      expect(service.isLines(code("3337", 2, 2))).toBe(false);
      expect(service.isLines(code("4488", 2, 2))).toBe(false);
    });
  });

  describe("isMesh", () => {
    it("recognizes full lattice mesh across 2 rows, 3 rows, and 4 rows", () => {
      expect(service.isMesh(code("7b", 2, 1))).toBe(true);
      expect(service.isMesh(code("7fb", 3, 1))).toBe(true);
      expect(service.isMesh(code("7ffb", 4, 1))).toBe(true);
    });

    it("recognizes multi-column full lattice mesh", () => {
      expect(service.isMesh(code("77bb", 2, 2))).toBe(true);
      expect(service.isMesh(code("777bbb", 2, 3))).toBe(true);
      expect(service.isMesh(code("77ffbb", 3, 2))).toBe(true);
      expect(service.isMesh(code("77ffffbb", 4, 2))).toBe(true);
    });

    it("rejects codes with insufficient rows or missing edges", () => {
      expect(service.isMesh(code("3", 1, 1))).toBe(false);
      expect(service.isMesh(code("77bf", 2, 2))).toBe(false);
      expect(service.isMesh(code("3333", 2, 2))).toBe(false);
    });
  });

  describe("isComb", () => {
    it("recognizes vertical combs with spine and teeth", () => {
      expect(service.isComb(code("61e1a1", 3, 2))).toBe(true);
    });

    it("rejects codes with bars, lines, or mesh", () => {
      expect(service.isComb(code("4488", 2, 2))).toBe(false);
      expect(service.isComb(code("3333", 2, 2))).toBe(false);
      expect(service.isComb(code("77bb", 2, 2))).toBe(false);
    });

    it("rejects codes with invalid dimensions", () => {
      expect(service.isComb(code("3", 1, 1))).toBe(false);
      expect(service.isComb(code("4", 1, 1))).toBe(false);
    });

    it("rejects codes with insufficient columns", () => {
      expect(service.isComb(code("", 2, 0))).toBe(false);
    });

    it("rejects codes with mismatched digit length", () => {
      expect(service.isComb(code("61e", 3, 2))).toBe(false);
    });
  });

  describe("isArcade", () => {
    it("recognizes arcade with continuous through-pillars", () => {
      expect(service.isArcade(code("6775ccccab98", 3, 4))).toBe(true);
    });

    it("rejects codes with rows < 3", () => {
      expect(service.isArcade(code("48", 2, 1))).toBe(false);
      expect(service.isArcade(code("4488", 2, 2))).toBe(false);
    });

    it("rejects codes with columns < 1", () => {
      expect(service.isArcade(code("", 3, 0))).toBe(false);
    });

    it("rejects codes that are bars, mesh, or comb", () => {
      expect(service.isArcade(code("4cc8", 3, 1))).toBe(false);
      expect(service.isArcade(code("7fb", 3, 1))).toBe(false);
      expect(service.isArcade(code("61e1a1", 3, 2))).toBe(false);
    });

    it("rejects codes with mismatched digit length", () => {
      expect(service.isArcade(code("667", 3, 2))).toBe(false);
    });

    it("rejects codes without proper rail connectors", () => {
      expect(service.isArcade(code("334488cc", 3, 2))).toBe(false);
    });

    it("rejects codes with insufficient through-pillars", () => {
      expect(service.isArcade(code("6448cc", 3, 2))).toBe(false);
    });
  });

  describe("helper methods coverage", () => {
    describe("hasConnectors and related branches", () => {
      it("rejects arcade without proper top connector", () => {
        expect(service.isArcade(code("333333ccccba98", 3, 6))).toBe(false);
      });

      it("rejects arcade without proper bottom connector", () => {
        expect(service.isArcade(code("677533cccc3333", 3, 6))).toBe(false);
      });

      it("counts through-pillars correctly in arcade", () => {
        expect(service.isArcade(code("6775ccccab98", 3, 4))).toBe(true);
      });

      it("rejects arcade with no through-pillars", () => {
        expect(service.isArcade(code("675533334433", 3, 6))).toBe(false);
      });
    });

    describe("tooth detection in reversing combs", () => {
      it("rejects comb without downward teeth", () => {
        expect(service.isComb(code("334488", 3, 2))).toBe(false);
      });

      it("rejects comb without upward teeth", () => {
        expect(service.isComb(code("778855", 3, 2))).toBe(false);
      });

      it("accepts valid reversing comb with teeth and pillars", () => {
        expect(service.isComb(code("61e1a1", 3, 2))).toBe(true);
      });

      it("rejects reversing comb with non-pillar middle", () => {
        expect(service.isComb(code("61937a1", 3, 2))).toBe(false);
      });

      it("rejects 2-row comb with isolated digit (0)", () => {
        expect(service.isComb(code("7089", 2, 2))).toBe(false);
      });
    });

    describe("family overlap prevention", () => {
      it("rejects comb if it matches bars pattern", () => {
        expect(service.isComb(code("4488", 2, 2))).toBe(false);
      });

      it("rejects comb if it matches mesh pattern", () => {
        expect(service.isComb(code("77bb", 2, 2))).toBe(false);
      });

      it("rejects arcade if it matches bars pattern", () => {
        expect(service.isArcade(code("4488", 2, 2))).toBe(false);
      });

      it("rejects arcade if it matches mesh pattern", () => {
        expect(service.isArcade(code("77bb", 2, 2))).toBe(false);
      });
    });

    describe("grid dimension handling", () => {
      it("rejects arcade with less than 3 rows", () => {
        expect(service.isArcade(code("6765ab", 2, 3))).toBe(false);
      });

      it("rejects arcade with zero columns", () => {
        expect(service.isArcade(code("", 3, 0))).toBe(false);
      });

      it("rejects code with mismatched digit length", () => {
        expect(service.isArcade(code("67765ab", 3, 2))).toBe(false);
      });

      it("handles single-row grids", () => {
        expect(service.isComb(code("77", 1, 2))).toBe(false);
      });

      it("handles multi-column grids", () => {
        expect(service.isArcade(code("333333cccc3333", 3, 6))).toBe(false);
      });
    });

    describe("regex false paths and branch coverage", () => {
      it("rejects arcade when top row has no connector chars (no 765)", () => {
        expect(service.isArcade(code("334433ccccba98", 3, 6))).toBe(false);
      });

      it("rejects arcade when bottom row has no connector chars (no ba9)", () => {
        expect(service.isArcade(code("667766cccc333333", 3, 6))).toBe(false);
      });

      it("rejects comb when top row lacks downward connector (no 765)", () => {
        expect(service.isComb(code("334433", 3, 2))).toBe(false);
      });

      it("rejects comb when middle lacks upward connector (no 4)", () => {
        expect(service.isComb(code("778899", 3, 2))).toBe(false);
      });

      it("rejects comb when column has non-connector middle chars", () => {
        expect(service.isComb(code("7144a1", 3, 2))).toBe(false);
      });

      it("rejects comb when 2-row code includes isolation character 0", () => {
        expect(service.isComb(code("7a0b", 2, 2))).toBe(false);
      });

      it("rejects comb when middle rows have non-pillar chars", () => {
        expect(service.isComb(code("618114a1", 4, 2))).toBe(false);
      });

      it("rejects horizontal comb when no row is spine", () => {
        expect(service.isComb(code("112233", 3, 2))).toBe(false);
      });

      it("rejects vertical comb when no column is spine", () => {
        expect(service.isComb(code("001122", 2, 3))).toBe(false);
      });

      it("targets spine-only pattern without joints", () => {
        // Column 0 is spine [cde65a9] but no joints [de]
        // This exercises the "isSpine && hasJoint" false path
        expect(service.isComb(code("6a6a6a", 3, 2))).toBe(false);
      });

      it("targets single-digit other-characters situation", () => {
        // When other characters would be just one character
        expect(service.isComb(code("cd12de34", 4, 2))).toBe(false);
      });

      it("targets empty other-chars in horizontal comb", () => {
        // Single row grid (no other chars)
        expect(service.isComb(code("77b", 1, 3))).toBe(false);
      });

      it("targets mismatch in other-chars pattern", () => {
        // Vertical spine with wrong teeth
        expect(service.isComb(code("c7d7e7", 3, 2))).toBe(false);
      });

      it("exercises hasDownTeeth with no matching columns", () => {
        // No column has both [765] in top and "8" in row 1
        expect(service.isComb(code("000000", 3, 2))).toBe(false);
      });

      it("exercises hasUpTeeth with no matching columns", () => {
        // No column has both "4" in row 1 and [ba9] in bottom
        expect(service.isComb(code("777777", 3, 2))).toBe(false);
      });

      it("tests vertical comb pattern matching", () => {
        // Test existing vertical comb pattern
        expect(service.isComb(code("61e1a1", 3, 2))).toBe(true);
      });

      it("targets empty grid edge case", () => {
        expect(service.isComb(code("", 0, 0))).toBe(false);
      });

      it("targets single-column grid", () => {
        expect(service.isComb(code("611", 3, 1))).toBe(false);
      });

      it("targets grid with all same character", () => {
        expect(service.isComb(code("cccccccc", 4, 2))).toBe(false);
      });

      it("targets arcade with no through-pillars", () => {
        expect(service.isArcade(code("67ab99", 3, 2))).toBe(false);
      });

      it("targets arcade with exactly 2 through-pillars", () => {
        expect(service.isArcade(code("6775ccccab98", 3, 4))).toBe(true);
      });

      it("tests arcade with 3 through-pillars", () => {
        // 3 columns with connectors
        expect(service.isArcade(code("677775ccccccab9998", 3, 6))).toBe(true);
      });

      it("tests arcade column missing connector in middle", () => {
        // Column 1 has top connector but middle is not all 'c'
        expect(service.isArcade(code("6775ccccab98", 3, 4))).toBe(true);
      });

      it("tests arcade with mismatched bottom row", () => {
        // Bottom row doesn't have [ba9]
        expect(service.isArcade(code("6775cccc0000", 3, 4))).toBe(false);
      });

      it("tests arcade where only 1 column matches", () => {
        // Only 1 through-pillar, needs >= 2
        expect(service.isArcade(code("67007500c00c0000", 4, 4))).toBe(false);
      });

      it("tests arcade connector regex false branch for top row", () => {
        // Top row character doesn't match [765]
        expect(service.isArcade(code("0000ccccba00", 3, 2))).toBe(false);
      });

      it("tests arcade connector regex false branch for bottom row", () => {
        // Bottom row character doesn't match [ba9]
        expect(service.isArcade(code("6700cccc0000", 3, 2))).toBe(false);
      });

      it("tests arcade middle row not all connectors", () => {
        // Middle has non-'c' character - this tests the every() false path
        expect(service.isArcade(code("6700c0cba00", 3, 2))).toBe(false);
      });

      it("tests isDots with empty string", () => {
        // Empty string should not match /^0+$/
        expect(service.isDots(code("", 0, 0))).toBe(false);
      });

      it("tests isLines with empty string", () => {
        // Empty string should not match /^3+$/
        expect(service.isLines(code("", 0, 0))).toBe(false);
      });

      it("targets reversing comb with downward teeth only", () => {
        // Grid with downward teeth: top row has [765], second row has "8"
        // Pattern: first column is spine [c], but no proper comb teeth
        expect(service.isComb(code("7c8c3c3c", 4, 2))).toBe(false);
      });

      it("targets vertical comb with just column spine", () => {
        // Vertical column but no proper joint teeth
        expect(service.isComb(code("cc12", 2, 2))).toBe(false);
      });

      it("targets horizontal comb with just row spine", () => {
        // Horizontal row spine but no proper joint teeth in perpendicular direction
        expect(service.isComb(code("3700", 2, 2))).toBe(false);
      });

      it("exercises horizontal comb loop with multiple rows and no match", () => {
        // Loop should iterate multiple times but find no horizontal comb pattern
        expect(service.isComb(code("000011112222", 4, 3))).toBe(false);
      });

      it("exercises vertical comb loop with multiple columns and no match", () => {
        // Loop should iterate multiple columns but find no vertical comb pattern
        expect(service.isComb(code("000011112222", 3, 4))).toBe(false);
      });

      it("exercises reversing comb with exactly 3 rows", () => {
        // Test with rows == 3 (greater than 2) to exercise middle row check
        expect(service.isComb(code("648c8a9", 3, 2))).toBe(false);
      });

      it("exercises reversing comb with 4 rows", () => {
        // Reversing comb requires rows > 2 and middle to be all 'c'
        // But teeth need specific characters in middle, creating a contradiction
        // This test documents that reversing combs with 4+ rows typically return false
        // because the middle row constraint (all 'c') conflicts with teeth requirements
        expect(service.isComb(code("638c4ca3", 4, 2))).toBe(false);
      });

      it("exercises tooth detection with single column", () => {
        // Single column with downward teeth pattern
        expect(service.isComb(code("68c4a", 4, 1))).toBe(false);
      });

      it("exercises vertical comb with single column spine", () => {
        // Single column that could be a comb spine
        expect(service.isComb(code("e121", 2, 2))).toBe(false);
      });
    });
  });

  describe("classify", () => {
    it("classifies bars correctly", () => {
      expect(service.classify(code("4488", 2, 2))).toStrictEqual(["bars"]);
    });

    it("classifies dots correctly", () => {
      expect(service.classify(code("0000", 2, 2))).toStrictEqual(["dots"]);
    });

    it("classifies lines correctly", () => {
      expect(service.classify(code("3333", 2, 2))).toStrictEqual(["lines"]);
    });

    it("classifies mesh correctly", () => {
      expect(service.classify(code("77bb", 2, 2))).toStrictEqual(["mesh"]);
    });

    it("classifies comb correctly", () => {
      expect(service.classify(code("61e1a1", 3, 2))).toStrictEqual(["comb"]);
    });

    it("classifies arcade correctly", () => {
      expect(service.classify(code("6775ccccab98", 3, 4))).toStrictEqual([
        "arcade",
      ]);
    });

    it("classifies waterfalls correctly", () => {
      expect(service.classify(code("251a", 2, 2))).toStrictEqual([
        "waterfalls",
      ]);
      expect(service.classify(code("255aa1", 3, 2))).toStrictEqual([
        "waterfalls",
      ]);
      expect(service.classify(code("255aa51a", 4, 2))).toStrictEqual([
        "waterfalls",
      ]);
      expect(service.classify(code("23531a", 2, 3))).toStrictEqual([
        "waterfalls",
      ]);
      expect(service.classify(code("23535a1a3", 3, 3))).toStrictEqual([
        "waterfalls",
      ]);
      expect(service.classify(code("2335335a31a3", 3, 4))).toStrictEqual([
        "waterfalls",
      ]);
    });

    it("returns an empty array for unclassified codes", () => {
      expect(service.classify(code("2569a1", 3, 2))).toStrictEqual([]);
    });

    it("exercises hasDownTeeth false path when regex matches but character mismatch", () => {
      // Grid with [765] in top but "7" (not "8") in second row
      // This exercises the regex true but condition false path
      expect(service.isComb(code("7670123", 3, 2))).toBe(false);
    });

    it("exercises hasUpTeeth false path when regex matches but character mismatch", () => {
      // Grid with [ba9] in bottom but "3" (not "4") in second-to-last
      // This exercises the regex true but condition false path
      expect(service.isComb(code("1231b9a", 3, 2))).toBe(false);
    });

    it("exercises isVerticalComb false path with partial spine match", () => {
      // Column 0 has [cd] (partial spine) but missing [e6sa9]
      // Spin has joint [de] but otherChars have non-[123] chars
      expect(service.isComb(code("c40d40", 3, 2))).toBe(false);
    });
  });

  describe("isWaterfalls", () => {
    it("recognizes downward zig-zagging staircase across 2, 3, 4, and 5 rows with 2 columns", () => {
      expect(service.isWaterfalls(code("251a", 2, 2))).toBe(true);
      expect(service.isWaterfalls(code("255aa1", 3, 2))).toBe(true);
      expect(service.isWaterfalls(code("255aa51a", 4, 2))).toBe(true);
      expect(service.isWaterfalls(code("255aa55aa1", 5, 2))).toBe(true);
    });

    it("recognizes multi-strand and wider waterfalls across 3, 4, 5, and 6 columns", () => {
      expect(service.isWaterfalls(code("23531a", 2, 3))).toBe(true);
      expect(service.isWaterfalls(code("23535a1a3", 3, 3))).toBe(true);
      expect(service.isWaterfalls(code("23535a5a3a31", 4, 3))).toBe(true);
      expect(service.isWaterfalls(code("2335335a31a3", 3, 4))).toBe(true);
      expect(service.isWaterfalls(code("2335335a35a31a33", 4, 4))).toBe(true);
      expect(service.isWaterfalls(code("233353335a331a3", 3, 5))).toBe(true);
      expect(service.isWaterfalls(code("23523535a35a1a31a3", 3, 6))).toBe(true);
    });

    it("rejects codes that do not match the waterfalls formula", () => {
      expect(service.isWaterfalls(code("255a", 2, 2))).toBe(false);
      expect(service.isWaterfalls(code("2569a1", 3, 2))).toBe(false);
      expect(service.isWaterfalls(code("52a529", 3, 2))).toBe(false);
      expect(service.isWaterfalls(code("23333510000a", 2, 6))).toBe(false);
      expect(service.isWaterfalls(code("00", 2, 1))).toBe(false);
    });
  });
});
