import { readdirSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";

import type { TemplateDefinition } from "./discovery.types";

/** Reads every template folder directly under a root. */
function collectTemplates(
  templatesService: DiscoveryTemplatesService,
  templatesRootPath: string,
): TemplateDefinition[] {
  return readdirSync(templatesRootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      return templatesService.collectTemplate({
        name: entry.name,
        templatePath: path.join(templatesRootPath, entry.name),
      });
    });
}

/**
 * Creates a module directory holding the five service-module files, and
 * returns its *parent* — the instance path a template's tree is laid over.
 */
async function createServiceModule(stem: string): Promise<string> {
  const instancePath = await mkdtemp(
    path.join(tmpdir(), "conformetry-instance-"),
  );
  const modulePath = path.join(instancePath, stem);

  await mkdir(modulePath, { recursive: true });

  for (const suffix of [
    ".constants.ts",
    ".module.ts",
    ".service.ts",
    ".service.unit.test.ts",
    ".types.ts",
  ]) {
    await writeFile(path.join(modulePath, `${stem}${suffix}`), "", "utf8");
  }

  return instancePath;
}

/**
 * Builds a templates root mirroring this workspace's real shapes, so the
 * ranking is exercised against the cases it actually has to discriminate.
 */
async function createTemplates(): Promise<{
  templates: TemplateDefinition[];
  templatesRootPath: string;
}> {
  const templatesRootPath = await mkdtemp(
    path.join(tmpdir(), "conformetry-templates-"),
  );
  const layout: Record<string, string[]> = {
    "nestjs-graphql-module": [
      "{{nameKebabCase}}/{{nameKebabCase}}.constants.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.entities.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.factories.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.resolver.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.resolver.unit.test.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.types.ts",
    ],
    "nestjs-service-file": [
      "{{nameKebabCase}}.service.ts",
      "{{nameKebabCase}}.service.unit.test.ts",
    ],
    "nestjs-service-module": [
      "{{nameKebabCase}}/{{nameKebabCase}}.constants.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.service.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.service.unit.test.ts",
      "{{nameKebabCase}}/{{nameKebabCase}}.types.ts",
    ],
  };

  for (const [name, filenames] of Object.entries(layout)) {
    for (const filename of filenames) {
      const filePath = path.join(templatesRootPath, name, filename);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "", "utf8");
    }
  }

  return { templates: [], templatesRootPath };
}

describe(DiscoveryMatchingService, () => {
  let service: DiscoveryMatchingService;
  let templatesService: DiscoveryTemplatesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscoveryMatchingService,
        DiscoveryTemplatesService,
        RenderingService,
      ],
    }).compile();

    service = await module.resolve(DiscoveryMatchingService);
    templatesService = await module.resolve(DiscoveryTemplatesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildSubstitutions", () => {
    it("derives name variants from the candidate stem", () => {
      expect(
        service.buildSubstitutions({
          instancePath: "/w/packages/x",
          nameStem: "my-widget",
        }),
      ).toStrictEqual({
        name: "my-widget",
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
      });
    });

    it("lets caller-supplied substitutions win", () => {
      expect(
        service.buildSubstitutions({
          instancePath: "/w/packages/x",
          nameStem: "my-widget",
          substitutions: { name: "overridden", type: "packages" },
        }),
      ).toMatchObject({ name: "overridden", type: "packages" });
    });
  });

  describe("resolveInstances", () => {
    it("prefers the larger template when both match completely", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await createServiceModule("errors");

      const { matched } = service.resolveInstances({
        candidates: [{ instancePath, nameStem: "errors" }],
        templates,
      });

      expect(matched[0]?.template.name).toBe("nestjs-service-module");
      expect(matched[0]?.matchedFileCount).toBe(5);
    });

    it("rejects a partially matching larger template on ratio", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await createServiceModule("errors");

      const { matched } = service.resolveInstances({
        candidates: [{ instancePath, nameStem: "errors" }],
        templates,
      });

      // graphql-module shares constants/module/types (3 of 7 = 43%) and must lose
      expect(matched[0]?.template.name).not.toBe("nestjs-graphql-module");
    });

    it("selects a two-file template when a file scope narrows the candidate", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await createServiceModule("errors");

      const modulePath = path.join(instancePath, "errors");
      const { matched } = service.resolveInstances({
        candidates: [
          {
            fileScope: [
              path.join(modulePath, "errors.service.ts"),
              path.join(modulePath, "errors.service.unit.test.ts"),
            ],
            instancePath: modulePath,
            nameStem: "errors",
          },
        ],
        templates,
      });

      expect(matched[0]?.template.name).toBe("nestjs-service-file");
    });

    it("reports a candidate no template explains", async () => {
      const { templatesRootPath } = await createTemplates();
      const templates = collectTemplates(templatesService, templatesRootPath);
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-empty-"),
      );

      const { matched, unmatched } = service.resolveInstances({
        candidates: [{ instancePath, nameStem: "nothing" }],
        templates,
      });

      expect(matched).toStrictEqual([]);
      expect(unmatched[0]?.reason).toBe("no-match");
    });

    it("reports two partially matching templates that tie as ambiguous", async () => {
      const templatesRootPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-templates-"),
      );
      const layout: Record<string, string[]> = {
        // Each shares exactly one file with the instance, so both reach 50%.
        alpha: [
          "{{nameKebabCase}}/{{nameKebabCase}}.service.ts",
          "{{nameKebabCase}}/{{nameKebabCase}}.resolver.ts",
        ],
        beta: [
          "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
          "{{nameKebabCase}}/{{nameKebabCase}}.dataloader.ts",
        ],
      };

      for (const [name, filenames] of Object.entries(layout)) {
        for (const filename of filenames) {
          const filePath = path.join(templatesRootPath, name, filename);

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, "", "utf8");
        }
      }

      const instancePath = await createServiceModule("errors");
      const { unmatched } = service.resolveInstances({
        candidates: [{ instancePath, nameStem: "errors" }],
        templates: collectTemplates(templatesService, templatesRootPath),
      });

      expect(unmatched[0]?.reason).toBe("ambiguous");
      expect(unmatched[0]?.candidateTemplateNames).toStrictEqual([
        "alpha",
        "beta",
      ]);
    });

    it("matches every template a candidate satisfies completely", async () => {
      const templatesRootPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-templates-"),
      );
      const layout: Record<string, string> = {
        alpha: "{{nameKebabCase}}/{{nameKebabCase}}.service.ts",
        beta: "{{nameKebabCase}}/{{nameKebabCase}}.module.ts",
      };

      for (const [name, filename] of Object.entries(layout)) {
        const filePath = path.join(templatesRootPath, name, filename);

        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, "", "utf8");
      }

      const instancePath = await createServiceModule("errors");
      const { matched, unmatched } = service.resolveInstances({
        candidates: [{ instancePath, nameStem: "errors" }],
        templates: collectTemplates(templatesService, templatesRootPath),
      });

      expect(matched.map((instance) => instance.template.name)).toStrictEqual([
        "alpha",
        "beta",
      ]);
      expect(unmatched).toStrictEqual([]);
    });
  });
});
