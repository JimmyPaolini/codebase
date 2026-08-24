import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AnchorNotFoundError } from "../anchors/anchors.errors";
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
          mode: "write",
          project: { absoluteRoot: projectRoot, name: "logger" },
          resolvedOutput,
        }),
      ).toThrow(AnchorNotFoundError);
    });

    it("throws when an anchor destination names a file with no such anchor", async () => {
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
          mode: "write",
          project: { absoluteRoot: projectRoot, name: "logger" },
          resolvedOutput,
        }),
      ).toThrow(AnchorNotFoundError);
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
