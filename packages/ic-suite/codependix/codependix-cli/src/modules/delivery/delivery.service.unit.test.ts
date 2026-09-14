import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AnchorNotFoundError } from "../anchors/anchors.constants";
import { AnchorsService } from "../anchors/anchors.service";

import { DeliveryService } from "./delivery.service";

import type { ResolvedCodependixGraphOutput } from "@codependix/configuration";

describe(DeliveryService, () => {
  let service: DeliveryService;
  let projectRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AnchorsService, DeliveryService],
    }).compile();

    service = await module.resolve(DeliveryService);
  });

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "codependix-delivery-"));
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("renderJson", () => {
    it("renders a value as indented JSON with a trailing newline", () => {
      expect(service.renderJson({ name: "logger" })).toBe(
        '{\n  "name": "logger"\n}\n',
      );
    });
  });

  describe("deliverGraphOutput", () => {
    it("writes a project's JSON export", async () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: { path: "logger.json" },
        markdown: undefined,
        target: "json",
      };

      const result = service.deliverGraphOutput({
        jsonContent: '{"name":"logger"}\n',
        markdownContent: undefined,
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "logger",
        stalePaths: [],
      });
      await expect(
        readFile(path.join(projectRoot, "logger.json"), "utf8"),
      ).resolves.toBe('{"name":"logger"}\n');
    });

    it("reports a missing JSON export as stale in check mode", () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: { path: "logger.json" },
        markdown: undefined,
        target: "json",
      };

      const result = service.deliverGraphOutput({
        jsonContent: '{"name":"logger"}\n',
        markdownContent: undefined,
        markdownSection: undefined,
        mode: "check",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: false,
        projectName: "logger",
        stalePaths: ["logger.json"],
      });
    });

    it("writes a standalone markdown export", async () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: undefined, path: "docs/graph.md" },
        target: "markdown",
      };

      service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      await expect(
        readFile(path.join(projectRoot, "docs/graph.md"), "utf8"),
      ).resolves.toBe("```mermaid\ngraph LR\n```\n");
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# logger",
          '<!-- codependix:start name="nx" -->',
          "stale",
          '<!-- codependix:end name="nx" -->',
        ].join("\n"),
        "utf8",
      );

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\ngraph LR\n```");
      expect(written).not.toContain("stale");
    });

    it("checks an anchor destination without writing anything", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          '<!-- codependix:start name="nx" -->',
          "stale",
          '<!-- codependix:end name="nx" -->',
        ].join("\n"),
        "utf8",
      );

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: undefined,
        mode: "check",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: false,
        projectName: "logger",
        stalePaths: ["README.md"],
      });
      await expect(readFile(readmePath, "utf8")).resolves.toContain("stale");
    });

    it("does not rewrite the file when the anchor already holds the fresh content", async () => {
      const readmePath = path.join(projectRoot, "README.md");
      const fileContent = [
        "# logger",
        '<!-- codependix:start name="nx" -->',
        "```mermaid\ngraph LR\n```",
        '<!-- codependix:end name="nx" -->',
      ].join("\n");

      await writeFile(readmePath, fileContent, "utf8");

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result.isCurrent).toBe(true);
      await expect(readFile(readmePath, "utf8")).resolves.toBe(fileContent);
    });

    it("skips a markdown destination when no content was rendered for it", () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: undefined, path: "graph.md" },
        target: "markdown",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: undefined,
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "logger",
        stalePaths: [],
      });
    });

    it("throws when an anchor destination names a file that does not exist", () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      };

      expect(() =>
        service.deliverGraphOutput({
          jsonContent: undefined,
          markdownContent: "```mermaid\ngraph LR\n```",
          markdownSection: undefined,
          mode: "write",
          project: { absoluteRoot: projectRoot, name: "logger" },
          resolvedOutput,
        }),
      ).toThrow(AnchorNotFoundError);
    });

    it("throws when an anchor destination names a file with no such anchor and no markdownSection was given", async () => {
      await writeFile(path.join(projectRoot, "README.md"), "# empty", "utf8");

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      };

      expect(() =>
        service.deliverGraphOutput({
          jsonContent: undefined,
          markdownContent: "```mermaid\ngraph LR\n```",
          markdownSection: undefined,
          mode: "write",
          project: { absoluteRoot: projectRoot, name: "logger" },
          resolvedOutput,
        }),
      ).toThrow(AnchorNotFoundError);
    });

    it("auto-creates a missing anchor's Codependix section when writing", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        "# logger\n\nSome existing content.\n",
        "utf8",
      );

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "codependix-nx", path: "README.md" },
        target: "markdown",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: {
          introLine: "Dependency graphs exported by codependix.",
          subheading: "Nx Neighborhood",
        },
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("## 🕸️ Codependix");
      expect(written).toContain("### Nx Neighborhood");
      expect(written).toContain(
        '<!-- codependix:start name="codependix-nx" -->\n```mermaid\ngraph LR\n```\n<!-- codependix:end name="codependix-nx" -->',
      );
    });

    it("inserts a new subheading under an existing Codependix section when writing", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# logger",
          "",
          "## 🕸️ Codependix",
          "",
          "Dependency graphs exported by codependix.",
          "",
          "### Nx Neighborhood",
          "",
          '<!-- codependix:start name="codependix-nx" -->',
          "graph",
          '<!-- codependix:end name="codependix-nx" -->',
        ].join("\n"),
        "utf8",
      );

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "codependix-imports", path: "README.md" },
        target: "markdown",
      };

      service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: {
          introLine: "Dependency graphs exported by codependix.",
          subheading: "File Imports",
        },
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      const written = await readFile(readmePath, "utf8");

      expect(written.match(/## 🕸️ Codependix/gu)).toHaveLength(1);
      expect(written).toContain("### Nx Neighborhood");
      expect(written).toContain("### File Imports");
    });

    it("reports a missing anchor as stale in check mode instead of throwing", async () => {
      await writeFile(path.join(projectRoot, "README.md"), "# empty", "utf8");

      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: { anchor: "codependix-nx", path: "README.md" },
        target: "markdown",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: {
          introLine: "Dependency graphs exported by codependix.",
          subheading: "Nx Neighborhood",
        },
        mode: "check",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: false,
        projectName: "logger",
        stalePaths: ["README.md"],
      });
      await expect(
        readFile(path.join(projectRoot, "README.md"), "utf8"),
      ).resolves.toBe("# empty");
    });

    it("writes both a JSON and a markdown export for a both target", async () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: { path: "logger.json" },
        markdown: { anchor: undefined, path: "graph.md" },
        target: "both",
      };

      service.deliverGraphOutput({
        jsonContent: '{"name":"logger"}\n',
        markdownContent: "```mermaid\ngraph LR\n```",
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      await expect(
        readFile(path.join(projectRoot, "logger.json"), "utf8"),
      ).resolves.toContain("logger");
      await expect(
        readFile(path.join(projectRoot, "graph.md"), "utf8"),
      ).resolves.toContain("mermaid");
    });

    it("delivers nothing when the resolved target is none", () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: undefined,
        markdown: undefined,
        target: "none",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: undefined,
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "logger",
        stalePaths: [],
      });
    });

    it("skips a json destination when no content was rendered for it", () => {
      const resolvedOutput: ResolvedCodependixGraphOutput = {
        json: { path: "logger.json" },
        markdown: undefined,
        target: "json",
      };

      const result = service.deliverGraphOutput({
        jsonContent: undefined,
        markdownContent: undefined,
        markdownSection: undefined,
        mode: "write",
        project: { absoluteRoot: projectRoot, name: "logger" },
        resolvedOutput,
      });

      expect(result).toStrictEqual({
        isCurrent: true,
        projectName: "logger",
        stalePaths: [],
      });
    });
  });
});
