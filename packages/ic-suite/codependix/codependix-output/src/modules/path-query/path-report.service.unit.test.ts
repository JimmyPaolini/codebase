import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildNoPathMessage } from "./path-query.constants";
import { PathReportService } from "./path-report.service";

import type { CombinedPathResults } from "./path-query.types";

describe(PathReportService, () => {
  let service: PathReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PathReportService],
    }).compile();

    service = await module.resolve(PathReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveFormat", () => {
    it("defaults to markdown when undefined", () => {
      expect(service.resolveFormat(undefined)).toStrictEqual({
        errors: [],
        format: "markdown",
      });
    });

    it("accepts json", () => {
      expect(service.resolveFormat("json")).toStrictEqual({
        errors: [],
        format: "json",
      });
    });

    it("accepts markdown", () => {
      expect(service.resolveFormat("markdown")).toStrictEqual({
        errors: [],
        format: "markdown",
      });
    });

    it("accepts mermaid", () => {
      expect(service.resolveFormat("mermaid")).toStrictEqual({
        errors: [],
        format: "mermaid",
      });
    });

    it("rejects unknown formats and defaults to markdown", () => {
      expect(service.resolveFormat("yaml")).toStrictEqual({
        errors: [
          '--format does not accept "yaml". It takes one of "json" and "markdown" and "mermaid", as in "--format markdown".',
        ],
        format: "markdown",
      });
    });
  });

  describe("render", () => {
    const resultsWithPath: CombinedPathResults = {
      fileImports: {
        from: "package-a/src/index.ts",
        path: ["package-a/src/index.ts", "package-b/src/lib.ts"],
        to: "package-b/src/lib.ts",
      },
      nxProjects: {
        from: "app",
        path: ["app", "lib-a", "lib-b"],
        to: "lib-b",
      },
    };

    const resultsWithoutPath: CombinedPathResults = {
      nxProjects: {
        from: "app",
        path: null,
        to: "isolated",
      },
    };

    it("renders JSON format", () => {
      const output = service.render({
        format: "json",
        results: resultsWithPath,
      });

      expect(JSON.parse(output)).toStrictEqual(resultsWithPath);
    });

    it("renders Markdown format with subheadings and arrows", () => {
      const output = service.render({
        format: "markdown",
        results: resultsWithPath,
      });

      expect(output).toContain("### Nx Neighborhood");
      expect(output).toContain("`app` → `lib-a` → `lib-b`");
      expect(output).toContain("### File Imports");
      expect(output).toContain(
        "`package-a/src/index.ts` → `package-b/src/lib.ts`",
      );
    });

    it("renders Markdown message when no path is found", () => {
      const output = service.render({
        format: "markdown",
        results: resultsWithoutPath,
      });

      expect(output).toContain("### Nx Neighborhood");
      expect(output).toContain(buildNoPathMessage("app", "isolated"));
    });

    it("renders Mermaid format for paths", () => {
      const output = service.render({
        format: "mermaid",
        results: resultsWithPath,
      });

      expect(output).toContain("```mermaid\ngraph LR");
      expect(output).toContain('app["app"]');
      expect(output).toContain('lib_a["lib-a"]');
      expect(output).toContain('lib_b["lib-b"]');
      expect(output).toContain("app --> lib_a");
      expect(output).toContain("lib_a --> lib_b");
      expect(output).toContain("```");
    });

    it("renders Mermaid message when no path is found", () => {
      const output = service.render({
        format: "mermaid",
        results: resultsWithoutPath,
      });

      expect(output).toBe(buildNoPathMessage("app", "isolated"));
    });
  });
});
