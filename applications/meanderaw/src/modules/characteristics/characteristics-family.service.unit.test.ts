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
    levels: rows - 1,
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
    it("recognizes 1-column vertical bars across 3 rows, 4 rows, and 5 rows", () => {
      expect(service.isBars(code("48", 3, 1))).toBe(true);
      expect(service.isBars(code("4c8", 4, 1))).toBe(true);
      expect(service.isBars(code("4cc8", 5, 1))).toBe(true);
    });

    it("recognizes multi-column vertical bars", () => {
      expect(service.isBars(code("4488", 3, 2))).toBe(true);
      expect(service.isBars(code("444888", 3, 3))).toBe(true);
      expect(service.isBars(code("44cc88", 4, 2))).toBe(true);
      expect(service.isBars(code("44cccc88", 5, 2))).toBe(true);
    });

    it("rejects codes with insufficient levels or horizontal connections", () => {
      expect(service.isBars(code("33", 2, 2))).toBe(false);
      expect(service.isBars(code("4588", 3, 2))).toBe(false);
      expect(service.isBars(code("00", 3, 1))).toBe(false);
    });
  });

  describe("isDots", () => {
    it("recognizes codes with zero connections across various shapes", () => {
      expect(service.isDots(code("0", 2, 1))).toBe(true);
      expect(service.isDots(code("00", 3, 1))).toBe(true);
      expect(service.isDots(code("0000", 3, 2))).toBe(true);
      expect(service.isDots(code("000000", 4, 2))).toBe(true);
    });

    it("rejects codes that contain any non-zero digits", () => {
      expect(service.isDots(code("03", 3, 1))).toBe(false);
      expect(service.isDots(code("0004", 3, 2))).toBe(false);
      expect(service.isDots(code("3333", 3, 2))).toBe(false);
    });
  });

  describe("isLines", () => {
    it("recognizes parallel horizontal lines across various shapes", () => {
      expect(service.isLines(code("3", 2, 1))).toBe(true);
      expect(service.isLines(code("33", 3, 1))).toBe(true);
      expect(service.isLines(code("3333", 3, 2))).toBe(true);
      expect(service.isLines(code("333333", 4, 2))).toBe(true);
    });

    it("rejects codes that contain non-3 digits", () => {
      expect(service.isLines(code("30", 3, 1))).toBe(false);
      expect(service.isLines(code("3337", 3, 2))).toBe(false);
      expect(service.isLines(code("4488", 3, 2))).toBe(false);
    });
  });

  describe("isMesh", () => {
    it("recognizes full lattice mesh across 3 rows, 4 rows, and 5 rows", () => {
      expect(service.isMesh(code("7b", 3, 1))).toBe(true);
      expect(service.isMesh(code("7fb", 4, 1))).toBe(true);
      expect(service.isMesh(code("7ffb", 5, 1))).toBe(true);
    });

    it("recognizes multi-column full lattice mesh", () => {
      expect(service.isMesh(code("77bb", 3, 2))).toBe(true);
      expect(service.isMesh(code("777bbb", 3, 3))).toBe(true);
      expect(service.isMesh(code("77ffbb", 4, 2))).toBe(true);
      expect(service.isMesh(code("77ffffbb", 5, 2))).toBe(true);
    });

    it("rejects codes with insufficient levels or missing edges", () => {
      expect(service.isMesh(code("33", 2, 2))).toBe(false);
      expect(service.isMesh(code("77bf", 3, 2))).toBe(false);
      expect(service.isMesh(code("3333", 3, 2))).toBe(false);
    });
  });

  describe("classify", () => {
    it("classifies bars correctly", () => {
      expect(service.classify(code("4488", 3, 2))).toStrictEqual(["bars"]);
    });

    it("classifies dots correctly", () => {
      expect(service.classify(code("0000", 3, 2))).toStrictEqual(["dots"]);
    });

    it("classifies lines correctly", () => {
      expect(service.classify(code("3333", 3, 2))).toStrictEqual(["lines"]);
    });

    it("classifies mesh correctly", () => {
      expect(service.classify(code("77bb", 3, 2))).toStrictEqual(["mesh"]);
    });

    it("returns an empty array for unclassified codes", () => {
      expect(service.classify(code("2569a1", 4, 2))).toStrictEqual([]);
    });
  });
});
