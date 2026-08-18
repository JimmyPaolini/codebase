import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TemplateDiscoveryModule } from "./template-discovery.module";
import { TemplateDiscoveryService } from "./template-discovery.service";

import type {
  MatchedInstance,
  TemplateDefinition,
} from "./template-discovery.types";

/** A flat two-file template: it produces loose files, not a folder. */
async function createTemplatePath(): Promise<string> {
  const templatePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-templates-")),
    "widget",
  );

  await mkdir(templatePath, { recursive: true });
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}.service.ts"),
    "export class {{namePascalCase}}Service {}\n",
    "utf8",
  );
  await writeFile(path.join(templatePath, ".gitignore"), "dist\n", "utf8");

  return templatePath;
}

describe(TemplateDiscoveryService, () => {
  let service: TemplateDiscoveryService;
  let templates: TemplateDefinition[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [TemplateDiscoveryModule],
      providers: [TemplateDiscoveryService],
    }).compile();

    service = await module.resolve(TemplateDiscoveryService);
    templates = [
      service.collectTemplate({
        name: "widget",
        templatePath: await createTemplatePath(),
      }),
    ];
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a template from its folder", () => {
    expect(templates.map((template) => template.name)).toStrictEqual([
      "widget",
    ]);
  });

  describe("resolveInstances and prepareDocuments", () => {
    async function createInstance(): Promise<MatchedInstance> {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-instance-"),
      );

      await writeFile(
        path.join(instancePath, "alpha.service.ts"),
        "export class AlphaService {}\n",
        "utf8",
      );

      const { matched } = service.resolveInstances({
        candidates: [{ instancePath, nameStem: "alpha" }],
        templates,
      });
      const instance = matched[0];

      if (instance === undefined) {
        throw new Error("expected the candidate to match");
      }

      return instance;
    }

    it("matches a candidate to its template", async () => {
      const instance = await createInstance();

      expect(instance.template.name).toBe("widget");
      expect(instance.matchedFileCount).toBe(1);
    });

    it("prepares documents only for the requested extensions", async () => {
      const [prepared] = service.prepareDocuments({
        fileExtensions: [".ts"],
        instances: [await createInstance()],
      });

      expect(prepared?.documents).toHaveLength(1);
      expect(prepared?.documents[0]?.renderedTemplate).toBe(
        "export class AlphaService {}\n",
      );
    });

    it("lists every required file regardless of extension", async () => {
      const instanceFiles = service.resolveInstanceFiles([
        await createInstance(),
      ]);

      expect(
        instanceFiles
          .map((instanceFile) => path.basename(instanceFile.instanceFilePath))
          .toSorted(),
      ).toStrictEqual([".gitignore", "alpha.service.ts"]);
    });
  });

  describe("resolveCandidates", () => {
    it("expands a glob into the candidates it matches", () => {
      const candidates = service.resolveCandidates({
        patterns: ["src/modules/*"],
        workingDirectory: process.cwd(),
      });

      expect(candidates.length).toBeGreaterThan(0);
    });
  });
});
