import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import { PROJECT_ROOT_DIRECTORY } from "../../constants";
import { AnchorPlacementModule } from "../anchor-placement/anchor-placement.module";
import { ConfigurationResolutionModule } from "../configuration-resolution/configuration-resolution.module";
import { ExportDeliveryModule } from "../export-delivery/export-delivery.module";
import { GraphLevelsModule } from "../graph-levels/graph-levels.module";
import { NestjsGraphsModule } from "../nestjs-graphs/nestjs-graphs.module";
import { NxGraphsModule } from "../nx-graphs/nx-graphs.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { TypescriptImportsModule } from "../typescript-imports/typescript-imports.module";

import { EXAMPLES_OUTPUT_DIRECTORY } from "./examples.constants";
import { ExamplesService } from "./examples.service";

describe(ExamplesService, () => {
  let service: ExamplesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule,
        AnchorPlacementModule,
        ConfigurationResolutionModule,
        ExportDeliveryModule,
        GraphLevelsModule,
        NestjsGraphsModule,
        NxGraphsModule,
        PythonImportsModule,
        TypescriptImportsModule,
      ],
      providers: [ExamplesService],
    }).compile();

    service = await module.resolve(ExamplesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("collect", () => {
    it("collects all sixteen examples, in reading order", async () => {
      expect.hasAssertions();

      const documents = await service.collect();

      expect(documents.map((document) => document.id)).toStrictEqual([
        "01-graph-levels",
        "02-neighborhood-scope",
        "03-ambient-modules",
        "04-preview-mode",
        "05-container-rooting",
        "06-typescript-resolution",
        "07-python-scanner",
        "08-configuration-resolution",
        "09-embedding",
        "10-export-targets",
        "11-markdown-modes",
        "12-auto-created-sections",
        "13-check-and-write",
        "14-refusals",
        "15-json-exports",
        "16-workspace-drift",
      ]);
    });

    it("gives every section a heading, a note, and a body", async () => {
      expect.hasAssertions();

      for (const document of await service.collect()) {
        expect(document.sections.length).toBeGreaterThan(0);

        for (const section of document.sections) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.note.length).toBeGreaterThan(0);
          expect(section.body.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("renderDocument", () => {
    it("renders one top-level heading and a single trailing newline", () => {
      expect.hasAssertions();

      const rendered = service.renderDocument({
        id: "00-probe",
        jsonExports: [],
        sections: [{ body: "_body_", heading: "Section", note: "A note." }],
        summary: "A summary.",
        title: "A title",
      });

      expect(rendered).toBe(
        "# A title\n\nA summary.\n\n## Section\n\nA note.\n\n_body_\n",
      );
    });
  });

  describe("run", () => {
    it("reports the committed output as current", async () => {
      expect.hasAssertions();

      const outcome = await service.run(
        "check",
        path.join(PROJECT_ROOT_DIRECTORY, EXAMPLES_OUTPUT_DIRECTORY),
      );

      expect(outcome.stalePaths).toStrictEqual([]);
      expect(outcome.writtenCount).toBe(21);
    });

    it("reports every example as stale when nothing has been written", async () => {
      expect.hasAssertions();

      const outcome = await service.run(
        "check",
        mkdtempSync(path.join(tmpdir(), "codependix-examples-empty-")),
      );

      expect(outcome.stalePaths).toHaveLength(outcome.writtenCount);
    });

    it("writes every example into a directory that does not exist yet", async () => {
      expect.hasAssertions();

      const outputDirectory = path.join(
        mkdtempSync(path.join(tmpdir(), "codependix-examples-run-")),
        "nested",
      );
      const written = await service.run("write", outputDirectory);

      expect(written.stalePaths).toStrictEqual([]);
      expect(
        readFileSync(path.join(outputDirectory, "01-graph-levels.md"), "utf8"),
      ).toContain("# 1. The four graph levels, side by side");

      const rechecked = await service.run("check", outputDirectory);

      expect(rechecked.stalePaths).toStrictEqual([]);
    });
  });
});
