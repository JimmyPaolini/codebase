import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderingService } from "@conformetry/generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TemplateDiscoveryTemplatesService } from "./template-discovery-templates.service";

import type { TemplateDefinition } from "./template-discovery.types";

const SUBSTITUTIONS = {
  nameKebabCase: "my-widget",
  namePascalCase: "MyWidget",
};

/**
 * Writes a template that produces a folder: its whole tree sits under
 * `{{nameKebabCase}}/`, so the template itself says an instance is a folder.
 */
async function createTemplatePath(): Promise<string> {
  const templatePath = path.join(
    await mkdtemp(path.join(tmpdir(), "conformetry-templates-")),
    "example",
  );

  await mkdir(path.join(templatePath, "{{nameKebabCase}}", "src"), {
    recursive: true,
  });
  await writeFile(
    path.join(templatePath, "{{nameKebabCase}}", "README.md"),
    "# {{namePascalCase}}\n",
    "utf8",
  );
  await writeFile(
    path.join(
      templatePath,
      "{{nameKebabCase}}",
      "src",
      "{{nameKebabCase}}.service.ts",
    ),
    "export class {{namePascalCase}}Service {}\n",
    "utf8",
  );

  return templatePath;
}

describe(TemplateDiscoveryTemplatesService, () => {
  let service: TemplateDiscoveryTemplatesService;
  let template: TemplateDefinition;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TemplateDiscoveryTemplatesService, RenderingService],
    }).compile();

    service = await module.resolve(TemplateDiscoveryTemplatesService);
    template = service.collectTemplate({
      name: "example",
      templatePath: await createTemplatePath(),
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("collectTemplate", () => {
    it("reads every file in the template folder", () => {
      expect(template.name).toBe("example");
      expect(
        template.filePaths.map((filePath) => path.basename(filePath)),
      ).toStrictEqual(["README.md", "{{nameKebabCase}}.service.ts"]);
    });

    it("carries a declared threshold onto the template", () => {
      expect(
        service.collectTemplate({
          name: "example",
          templatePath: "/does/not/exist",
          threshold: 0.85,
        }).threshold,
      ).toBe(0.85);
    });

    it("leaves the threshold unset when the generator declares none", () => {
      // Unset rather than defaulted, so a run-level flag still applies.
      expect(template.threshold).toBeUndefined();
    });

    it("returns no files when the template folder does not exist", () => {
      expect(
        service.collectTemplate({
          name: "missing",
          templatePath: "/does/not/exist",
        }).filePaths,
      ).toStrictEqual([]);
    });
  });

  describe("resolveInstanceFilePath", () => {
    it("lays the template's tree over the instance path", () => {
      expect(
        service.resolveInstanceFilePath({
          instancePath: "/project/src/modules",
          substitutions: SUBSTITUTIONS,
          templateDirectoryPath: template.directoryPath,
          templateFilePath: path.join(
            template.directoryPath,
            "{{nameKebabCase}}",
            "src",
            "{{nameKebabCase}}.service.ts",
          ),
        }),
      ).toBe(
        path.join(
          "/project/src/modules",
          "my-widget",
          "src",
          "my-widget.service.ts",
        ),
      );
    });
  });

  describe("countMatchingFiles", () => {
    it("counts only files the instance path already has", async () => {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-instance-"),
      );

      await mkdir(path.join(instancePath, "my-widget"), { recursive: true });
      await writeFile(
        path.join(instancePath, "my-widget", "README.md"),
        "# MyWidget\n",
        "utf8",
      );

      expect(
        service.countMatchingFiles({
          instancePath,
          substitutions: SUBSTITUTIONS,
          template,
        }),
      ).toBe(1);
    });

    it("counts only files inside the given scope", async () => {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-instance-"),
      );
      const readmePath = path.join(instancePath, "my-widget", "README.md");

      await mkdir(path.join(instancePath, "my-widget", "src"), {
        recursive: true,
      });
      await writeFile(readmePath, "# MyWidget\n", "utf8");
      await writeFile(
        path.join(instancePath, "my-widget", "src", "my-widget.service.ts"),
        "",
        "utf8",
      );

      expect(
        service.countMatchingFiles({
          fileScope: [readmePath],
          instancePath,
          substitutions: SUBSTITUTIONS,
          template,
        }),
      ).toBe(1);
    });
  });

  describe("prepareDocument", () => {
    it("renders the template when the instance exists", async () => {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-instance-"),
      );

      await mkdir(path.join(instancePath, "my-widget"), { recursive: true });
      await writeFile(
        path.join(instancePath, "my-widget", "README.md"),
        "# Drifted\n",
        "utf8",
      );

      const document = service.prepareDocument({
        instancePath,
        substitutions: SUBSTITUTIONS,
        templateDirectoryPath: template.directoryPath,
        templateFilePath: path.join(
          template.directoryPath,
          "{{nameKebabCase}}",
          "README.md",
        ),
      });

      expect(document?.renderedTemplate).toBe("# MyWidget\n");
      expect(document?.instance).toBe("# Drifted\n");
    });

    it("returns nothing when the instance file is absent", async () => {
      const instancePath = await mkdtemp(
        path.join(tmpdir(), "conformetry-instance-"),
      );

      expect(
        service.prepareDocument({
          instancePath,
          substitutions: SUBSTITUTIONS,
          templateDirectoryPath: template.directoryPath,
          templateFilePath: path.join(
            template.directoryPath,
            "{{nameKebabCase}}",
            "README.md",
          ),
        }),
      ).toBeUndefined();
    });
  });
});
