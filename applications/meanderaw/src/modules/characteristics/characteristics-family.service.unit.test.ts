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

    it("returns an empty array for unclassified codes", () => {
      expect(service.classify(code("2569a1", 3, 2))).toStrictEqual([]);
    });
  });
});
