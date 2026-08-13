import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  DiscoveryModule,
  DiscoveryService,
} from "@jimmypaolini/conformetry-configuration";
import { ErrorsModule } from "@jimmypaolini/conformetry-core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { FilesService } from "./files.service";

import type {
  MatchedInstance,
  TemplateDefinition,
} from "@jimmypaolini/conformetry-configuration";

/** Writes a flat two-file template and returns its folder. */
async function createTemplatePath(): Promise<string> {
  const templatePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-files-templates-")),
    "widget",
  );

  await mkdir(path.join(templatePath, "nested"), { recursive: true });
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}.service.ts"),
    "",
    "utf8",
  );
  await writeFile(path.join(templatePath, "nested", ".gitignore"), "", "utf8");

  return templatePath;
}

describe(FilesService, () => {
  let discoveryService: DiscoveryService;
  let service: FilesService;
  let template: TemplateDefinition;

  /** Matches an instance path against the single `widget` template. */
  function matchInstance(instancePath: string): MatchedInstance[] {
    const { matched } = discoveryService.resolveInstances({
      candidates: [{ instancePath, nameStem: "my-widget" }],
      templates: [template],
    });

    return matched;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DiscoveryModule, ErrorsModule],
      providers: [FilesService],
    }).compile();

    service = await module.resolve(FilesService);
    discoveryService = await module.resolve(DiscoveryService);
    template = discoveryService.collectTemplate({
      name: "widget",
      templatePath: await createTemplatePath(),
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports nothing when the instance has every template file", async () => {
    const instancePath = await mkdtemp(
      path.join(tmpdir(), "conformetry-files-complete-"),
    );

    await mkdir(path.join(instancePath, "nested"), { recursive: true });
    await writeFile(
      path.join(instancePath, "my-widget.service.ts"),
      "",
      "utf8",
    );
    await writeFile(
      path.join(instancePath, "nested", ".gitignore"),
      "",
      "utf8",
    );

    expect(
      service.checkInstanceFiles({ instances: matchInstance(instancePath) }),
    ).toStrictEqual([]);
  });

  it("reports nothing when no instance matched", () => {
    expect(service.checkInstanceFiles({ instances: [] })).toStrictEqual([]);
  });

  it("reports an extension-less file the template requires", async () => {
    const instancePath = await mkdtemp(
      path.join(tmpdir(), "conformetry-files-partial-"),
    );

    await mkdir(path.join(instancePath, "nested"), { recursive: true });
    await writeFile(
      path.join(instancePath, "my-widget.service.ts"),
      "",
      "utf8",
    );

    const results = service.checkInstanceFiles({
      instances: matchInstance(instancePath),
    });

    expect(results.map((result) => result.filename)).toStrictEqual([
      ".gitignore",
    ]);
    expect(results[0]?.errors[0]?.errorType).toBe("file");
    expect(results[0]?.errors[0]?.fix).toContain("Create the");
  });

  it("collapses a missing directory into one finding", async () => {
    const instancePath = await mkdtemp(
      path.join(tmpdir(), "conformetry-files-missing-"),
    );

    await writeFile(
      path.join(instancePath, "my-widget.service.ts"),
      "",
      "utf8",
    );

    const results = service.checkInstanceFiles({
      instances: matchInstance(instancePath),
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.errors[0]?.errorType).toBe("directory");
  });
});
