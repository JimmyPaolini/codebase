import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PythonModule } from "@codependix/imports";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { resolveFixture } from "../../constants";

import {
  PYTHON_FIXTURES_SEGMENT,
  SCANNER_FIXTURE,
} from "./python-imports.constants";
import { PythonImportsService } from "./python-imports.service";

describe(PythonImportsService, () => {
  let service: PythonImportsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PythonModule],
      providers: [PythonImportsService],
    }).compile();

    service = await module.resolve(PythonImportsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the cases the scanner walks", () => {
    it.each([
      ["main.py", "shared/constants.py"],
      ["main.py", "shared/helpers.py"],
      ["main.py", "catalog.py"],
      ["main.py", "__init__.py"],
      ["parenthesized.py", "shared/constants.py"],
      ["continued.py", "shared/helpers.py"],
      ["shared/deep/cousin.py", "shared/constants.py"],
      ["shared/deep/cousin.py", "shared/deep/__init__.py"],
    ])("draws %s → %s", (source, target) => {
      expect.hasAssertions();
      expect(service.buildFixtureGraph(SCANNER_FIXTURE).edges).toContainEqual({
        source,
        target,
      });
    });
  });

  describe("the cases the scanner deliberately refuses", () => {
    it("walks no import that does not start at column zero", () => {
      expect.hasAssertions();
      expect(
        service.buildFixtureGraph(SCANNER_FIXTURE).isolatedFileNames,
      ).toContain("nested.py");
    });

    it("resolves a bare relative import to the package, never to the name it binds", () => {
      expect.hasAssertions();

      const edges = service
        .buildFixtureGraph(SCANNER_FIXTURE)
        .edges.filter((edge) => edge.source === "main.py");

      expect(edges.map((edge) => edge.target)).toContain("__init__.py");
      expect(edges.map((edge) => edge.target)).not.toContain("sibling.py");
    });

    it("draws no edge for a module this project does not own", () => {
      expect.hasAssertions();
      expect(
        service
          .buildFixtureGraph(SCANNER_FIXTURE)
          .edges.map((edge) => edge.target),
      ).not.toContain("third_party_package.py");
    });
  });

  describe("excluded directories", () => {
    const cacheDirectory = resolveFixture(
      PYTHON_FIXTURES_SEGMENT,
      SCANNER_FIXTURE,
      "__pycache__",
    );

    beforeAll(() => {
      mkdirSync(cacheDirectory, { recursive: true });
      writeFileSync(
        path.join(cacheDirectory, "ghost.py"),
        "import shared\n",
        "utf8",
      );
    });

    afterAll(() => {
      writeFileSync(path.join(cacheDirectory, "ghost.py"), "", "utf8");
    });

    it("never walks into a __pycache__ directory", () => {
      expect.hasAssertions();
      expect(
        service.buildFixtureGraph(SCANNER_FIXTURE).fileNames,
      ).not.toContain("__pycache__/ghost.py");
    });
  });

  describe("describeProjectAt", () => {
    it("refuses a project the tag gate never discovers", () => {
      expect.hasAssertions();

      vi.spyOn(service, "buildTaggedGraph").mockReturnValueOnce({
        dependencies: {},
        nodes: {},
      });

      expect(() => service.describeProjectAt("/nowhere")).toThrow(
        "language:python",
      );
    });
  });

  describe("build", () => {
    it("builds the scanner document", () => {
      expect.hasAssertions();
      expect(service.build().map((document) => document.id)).toStrictEqual([
        "07-python-scanner",
      ]);
    });
  });
});
