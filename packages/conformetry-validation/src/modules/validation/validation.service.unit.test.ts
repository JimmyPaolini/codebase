import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { DiscoveryService } from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationModule } from "./validation.module";
import { ValidationService } from "./validation.service";

import type { TemplateDefinition } from "@conformetry/configuration";

/** Writes an instance directory, optionally dropping the markdown file. */
async function createInstance(args: {
  configuration: string;
  withNotes: boolean;
}): Promise<string> {
  const instancePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-validate-instance-")),
    "my-widget",
  );

  await mkdir(instancePath, { recursive: true });
  await writeFile(
    path.join(instancePath, "my-widget.config.json"),
    args.configuration,
    "utf8",
  );

  if (args.withNotes) {
    await writeFile(
      path.join(instancePath, "my-widget.notes.md"),
      "# MyWidget\n",
      "utf8",
    );
  }

  return instancePath;
}
/**
 * Writes a one-template root: a JSON file whose shape the instance must match,
 * plus a file the instance is required to have.
 */
async function createTemplatePath(): Promise<string> {
  const templatePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-validate-templates-")),
    "widget",
  );

  await mkdir(templatePath, { recursive: true });
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}.config.json"),
    '{\n  "kind": "widget",\n  "name": "{{nameKebabCase}}"\n}\n',
    "utf8",
  );
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}.notes.md"),
    "# {{namePascalCase}}\n",
    "utf8",
  );

  return templatePath;
}

describe(ValidationService, () => {
  let service: ValidationService;
  let templates: TemplateDefinition[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ValidationModule],
      providers: [ValidationService],
    }).compile();

    service = await module.resolve(ValidationService);
    const discoveryService = await module.resolve(DiscoveryService);

    templates = [
      discoveryService.collectTemplate({
        name: "widget",
        templatePath: await createTemplatePath(),
      }),
    ];
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("validate", () => {
    it("passes an instance that matches its template", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "kind": "widget",\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });

      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "my-widget" }],
        templates,
      });

      expect(result.fileResults).toStrictEqual([]);
      expect(result.ok).toBe(true);
      expect(result.checkedPaths).toStrictEqual([instancePath]);
    });

    it("reports a key the template requires and the instance lacks", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });

      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "my-widget" }],
        templates,
      });

      expect(result.ok).toBe(false);
      expect(result.fileResults[0]?.filename).toBe("my-widget.config.json");
    });

    it("reports a file the template requires and the instance lacks", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "kind": "widget",\n  "name": "my-widget"\n}\n',
        withNotes: false,
      });

      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "my-widget" }],
        templates,
      });

      expect(result.ok).toBe(false);
      expect(result.fileResults[0]?.errors[0]?.errorType).toBe("file");
    });

    it("runs only the languages it was asked for", async () => {
      const instancePath = await createInstance({
        configuration: '{\n  "name": "my-widget"\n}\n',
        withNotes: true,
      });

      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "my-widget" }],
        languageNames: ["markdown"],
        templates,
      });

      expect(result.fileResults).toStrictEqual([]);
      expect(result.ok).toBe(true);
    });

    it("fails a candidate no template explains", async () => {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-validate-empty-"),
      );

      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "nothing" }],
        templates,
      });

      expect(result.ok).toBe(false);
      expect(result.unmatched[0]?.reason).toBe("no-match");
      expect(result.checkedPaths).toStrictEqual([]);
    });
  });

  describe("caller-supplied options", () => {
    it("runs only the languages the caller named", async () => {
      const instancePath = await createInstance({
        configuration: "{}\n",
        withNotes: true,
      });
      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "my-widget" }],
        languageNames: ["markdown"],
        templates,
      });

      expect(result.ok).toBe(true);
    });

    it("runs every language when the filter is empty", async () => {
      const instancePath = await createInstance({
        configuration: "{}\n",
        withNotes: true,
      });
      const candidates = [{ instancePath, nameStem: "my-widget" }];
      const filtered = await service.validate({
        candidates,
        languageNames: [],
        templates,
      });
      const unfiltered = await service.validate({ candidates, templates });

      // An empty filter means "everything", not "nothing" — the two calls
      // must reach the same verdict.
      expect(filtered.fileResults).toStrictEqual(unfiltered.fileResults);
    });

    it("imports language packages through a loader the caller supplies", async () => {
      const instancePath = await createInstance({
        configuration: "{}\n",
        withNotes: true,
      });
      const loaded: string[] = [];
      const result = await service.validate({
        candidates: [{ instancePath, nameStem: "my-widget" }],
        loadLanguageModule: async (specifier) => {
          loaded.push(specifier);

          return import(specifier);
        },
        templates,
      });

      expect(loaded.length).toBeGreaterThan(0);
      expect(result.checkedPaths.length).toBeGreaterThan(0);
    });
  });
});
