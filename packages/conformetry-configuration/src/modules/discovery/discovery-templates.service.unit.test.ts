import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryTemplatesService } from "./discovery-templates.service";

const SUBSTITUTIONS = {
  nameKebabCase: "my-widget",
  namePascalCase: "MyWidget",
};

async function createTemplateDirectory(): Promise<string> {
  const templateDirectoryPath = await mkdtemp(
    path.join(tmpdir(), "conformetry-templates-"),
  );

  await mkdir(path.join(templateDirectoryPath, "src"), { recursive: true });
  await writeFile(
    path.join(templateDirectoryPath, "README.md"),
    "# {{namePascalCase}}\n",
    "utf8",
  );
  await writeFile(
    path.join(templateDirectoryPath, "src", "__nameKebabCase__.service.ts"),
    "export class {{namePascalCase}}Service {}\n",
    "utf8",
  );

  return templateDirectoryPath;
}

describe(DiscoveryTemplatesService, () => {
  let service: DiscoveryTemplatesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryTemplatesService, RenderingService],
    }).compile();

    service = await module.resolve(DiscoveryTemplatesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("collects template files recursively and sorted", async () => {
    const templateDirectoryPath = await createTemplateDirectory();

    expect(
      service
        .collectTemplateFilePaths(templateDirectoryPath)
        .map((filePath) => path.relative(templateDirectoryPath, filePath)),
    ).toStrictEqual([
      "README.md",
      path.join("src", "__nameKebabCase__.service.ts"),
    ]);
  });

  it("maps a template path to its substituted instance path", async () => {
    const templateDirectoryPath = await createTemplateDirectory();

    expect(
      service.resolveInstancePath({
        projectPath: "/project",
        substitutions: SUBSTITUTIONS,
        templateDirectoryPath,
        templateFilePath: path.join(
          templateDirectoryPath,
          "src",
          "__nameKebabCase__.service.ts",
        ),
      }),
    ).toBe(path.join("/project", "src", "my-widget.service.ts"));
  });

  it("counts only the template files that exist in the project", async () => {
    const templateDirectoryPath = await createTemplateDirectory();
    const projectPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-project-"),
    );

    await writeFile(
      path.join(projectPath, "README.md"),
      "# MyWidget\n",
      "utf8",
    );

    expect(
      service.countExistingFiles({
        projectPath,
        substitutions: SUBSTITUTIONS,
        templateDirectoryPath,
        templateFilePaths: service.collectTemplateFilePaths(
          templateDirectoryPath,
        ),
      }),
    ).toBe(1);
  });

  it("renders the template when preparing a document", async () => {
    const templateDirectoryPath = await createTemplateDirectory();
    const projectPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-project-"),
    );

    await writeFile(path.join(projectPath, "README.md"), "# Actual\n", "utf8");

    const document = service.prepareDocument({
      projectPath,
      substitutions: SUBSTITUTIONS,
      templateDirectoryPath,
      templateFilePath: path.join(templateDirectoryPath, "README.md"),
    });

    expect(document?.filename).toBe("README.md");
    expect(document?.renderedTemplate).toBe("# MyWidget\n");
    expect(document?.instance).toBe("# Actual\n");
  });

  it("returns nothing when the instance file is absent", async () => {
    const templateDirectoryPath = await createTemplateDirectory();
    const projectPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-project-"),
    );

    expect(
      service.prepareDocument({
        projectPath,
        substitutions: SUBSTITUTIONS,
        templateDirectoryPath,
        templateFilePath: path.join(templateDirectoryPath, "README.md"),
      }),
    ).toBeUndefined();
  });
});
