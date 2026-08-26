import { TypescriptModule } from "@codependix/imports";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  BROKEN_FIXTURE,
  RESOLUTION_FIXTURE,
} from "./typescript-imports.constants";
import { TypescriptImportsService } from "./typescript-imports.service";

describe(TypescriptImportsService, () => {
  let service: TypescriptImportsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TypescriptModule],
      providers: [TypescriptImportsService],
    }).compile();

    service = await module.resolve(TypescriptImportsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("module resolution", () => {
    it("lands a NodeNext `.js` specifier on the `.ts` file it names", () => {
      expect.hasAssertions();
      expect(
        service.buildFixtureGraph(RESOLUTION_FIXTURE).edges,
      ).toContainEqual({
        source: "src/index.ts",
        target: "src/catalog.ts",
      });
    });

    it("resolves a tsconfig path alias the way the compiler resolves it", () => {
      expect.hasAssertions();
      expect(
        service.buildFixtureGraph(RESOLUTION_FIXTURE).edges,
      ).toContainEqual({
        source: "src/catalog.ts",
        target: "src/settings.ts",
      });
    });

    it("leaves declaration files out of the graph", () => {
      expect.hasAssertions();
      expect(
        service.buildFixtureGraph(RESOLUTION_FIXTURE).fileNames,
      ).not.toContain("src/ambient.d.ts");
    });
  });

  describe("the statements that draw no edge", () => {
    it.each([
      ["src/re-exported.ts"],
      ["src/deferred.ts"],
      ["src/required.ts"],
      ["src/external.ts"],
    ])("draws nothing from %s", (fileName) => {
      expect.hasAssertions();
      expect(
        service
          .buildFixtureGraph(RESOLUTION_FIXTURE)
          .edges.filter((edge) => edge.source === fileName),
      ).toStrictEqual([]);
    });
  });

  describe("buildOutcome", () => {
    it("reports a tsconfig the compiler refuses to parse", () => {
      expect.hasAssertions();

      const outcome = service.buildOutcome(BROKEN_FIXTURE);

      expect(outcome.outcome).toBe("failed");
      expect(service.describeOutcome(outcome)).toContain(
        "TypescriptProjectConfigurationError",
      );
    });

    it("reports a project whose program builds", () => {
      expect.hasAssertions();

      const outcome = service.buildOutcome(RESOLUTION_FIXTURE);

      expect(outcome.outcome).toBe("built");
      expect(service.describeOutcome(outcome)).toContain("built");
    });
  });

  describe("describeProjectAt", () => {
    it("refuses a directory carrying no tsconfig.json", () => {
      expect.hasAssertions();
      expect(() => service.describeProjectAt("/nowhere")).toThrow(
        "tsconfig.json",
      );
    });
  });

  describe("describeError", () => {
    it("names the error class when an Error was raised", () => {
      expect.hasAssertions();
      expect(service.describeError(new TypeError("bad config"))).toBe(
        "TypeError: bad config",
      );
    });

    it("falls back to the raised value itself when it was not an Error", () => {
      expect.hasAssertions();
      expect(service.describeError("bad config")).toBe("bad config");
    });
  });

  describe("build", () => {
    it("builds the resolution document", () => {
      expect.hasAssertions();
      expect(service.build().map((document) => document.id)).toStrictEqual([
        "06-typescript-resolution",
      ]);
    });
  });
});
