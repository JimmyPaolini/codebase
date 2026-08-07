import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { prepareTemplateValidationPayload } from "@jimmypaolini/conformetry-configuration";

const temporaryDirectoryPaths: string[] = [];

describe(prepareTemplateValidationPayload, () => {
  afterEach(() => {
    for (const temporaryDirectoryPath of temporaryDirectoryPaths) {
      fs.rmSync(temporaryDirectoryPath, { force: true, recursive: true });
    }
    temporaryDirectoryPaths.length = 0;
  });

  it("prefers the generator tag from project metadata when multiple templates appear to match", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const configurationPath = writeConfiguration({
      generators: {
        "generator-a": {
          templateDirectoryPath: "templates/generator-a",
        },
        "generator-b": {
          templateDirectoryPath: "templates/generator-b",
        },
      },
      workingDirectory,
    });

    writeTemplateFile({
      content: "A {{nameKebabCase}}\n",
      generatorName: "generator-a",
      relativeFilePath: "README.md",
      workingDirectory,
    });
    writeTemplateFile({
      content: "B {{nameKebabCase}}\n",
      generatorName: "generator-b",
      relativeFilePath: "README.md",
      workingDirectory,
    });

    const projectDirectoryPath = path.join(
      workingDirectory,
      "generated",
      "project-one",
    );
    fs.mkdirSync(projectDirectoryPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectDirectoryPath, "README.md"),
      "B project-one\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(projectDirectoryPath, "project.json"),
      JSON.stringify({
        sourceRoot: "application/project-one",
        tags: ["generator:generator-b"],
      }),
      "utf8",
    );

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: [".md"],
      filePaths: [path.relative(workingDirectory, projectDirectoryPath)],
      templateRuleNames: ["generator-a", "generator-b"],
      workingDirectory,
    });

    expect(payload.violations).toStrictEqual([]);
    expect(payload.documents).toHaveLength(1);

    const document = payload.documents[0];

    expect(document).toBeDefined();
    expect(document?.templateFilePath).toContain(
      path.join("templates", "generator-b", "README.md"),
    );
    expect(document?.renderedTemplate).toBe(document?.instance);
  });

  it("derives type substitutions from project metadata instead of top-level directory names", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const configurationPath = writeConfiguration({
      generators: {
        "generator-app": {
          templateDirectoryPath: "templates/generator-app",
        },
      },
      workingDirectory,
    });

    writeTemplateFile({
      content: '{"sourceRoot":"{{type}}/{{nameKebabCase}}"}\n',
      generatorName: "generator-app",
      relativeFilePath: "project.json",
      workingDirectory,
    });

    const projectDirectoryPath = path.join(
      workingDirectory,
      "generated",
      "application-project",
    );
    fs.mkdirSync(projectDirectoryPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectDirectoryPath, "project.json"),
      '{"sourceRoot":"application/application-project","tags":["generator:generator-app"]}\n',
      "utf8",
    );

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: [".json"],
      filePaths: [path.relative(workingDirectory, projectDirectoryPath)],
      templateRuleNames: ["generator-app"],
      workingDirectory,
    });

    expect(payload.violations).toStrictEqual([]);
    expect(payload.documents).toHaveLength(1);

    const document = payload.documents[0];

    expect(document).toBeDefined();

    const renderedTemplateProjectMetadata = JSON.parse(
      document?.renderedTemplate ?? "{}",
    ) as {
      sourceRoot?: string;
    };
    const instanceProjectMetadata = JSON.parse(document?.instance ?? "{}") as {
      sourceRoot?: string;
    };

    expect(renderedTemplateProjectMetadata.sourceRoot).toBe(
      instanceProjectMetadata.sourceRoot,
    );
  });

  it("derives name substitutions from the project directory basename", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const configurationPath = writeConfiguration({
      generators: {
        "generator-app": {
          templateDirectoryPath: "templates/generator-app",
        },
      },
      workingDirectory,
    });

    writeTemplateFile({
      content: "{{nameKebabCase}}\n",
      generatorName: "generator-app",
      relativeFilePath: "README.md",
      workingDirectory,
    });

    const projectDirectoryPath = path.join(
      workingDirectory,
      "generated",
      "directory-derived-name",
    );
    fs.mkdirSync(projectDirectoryPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectDirectoryPath, "README.md"),
      "directory-derived-name\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(projectDirectoryPath, "project.json"),
      JSON.stringify({
        name: "metadata-name-should-not-drive-substitution",
        sourceRoot: "application/directory-derived-name",
        tags: ["generator:generator-app"],
      }),
      "utf8",
    );

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: [".md"],
      filePaths: [path.relative(workingDirectory, projectDirectoryPath)],
      templateRuleNames: ["generator-app"],
      workingDirectory,
    });

    expect(payload.violations).toStrictEqual([]);
    expect(payload.documents).toHaveLength(1);

    const document = payload.documents[0];

    expect(document).toBeDefined();
    expect(document?.renderedTemplate).toBe("directory-derived-name\n");
    expect(document?.renderedTemplate).toBe(document?.instance);
  });
});

function createTemporaryDirectoryPath(): string {
  const temporaryDirectoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "template-validation-preparation-"),
  );
  temporaryDirectoryPaths.push(temporaryDirectoryPath);

  return temporaryDirectoryPath;
}

function writeConfiguration(args: {
  generators: Record<string, unknown>;
  workingDirectory: string;
}): string {
  const configurationPath = path.join(args.workingDirectory, "config.json");
  const generators = Object.fromEntries(
    Object.keys(args.generators).map((generatorName) => {
      return [
        generatorName,
        {
          name: generatorName,
          parameters: {},
        },
      ];
    }),
  );

  fs.writeFileSync(configurationPath, JSON.stringify({ generators }), "utf8");
  return configurationPath;
}

function writeTemplateFile(args: {
  content: string;
  generatorName: string;
  relativeFilePath: string;
  workingDirectory: string;
}): void {
  const templateFilePath = path.join(
    args.workingDirectory,
    "configuration",
    "conformetry-templates",
    args.generatorName,
    args.relativeFilePath,
  );
  fs.mkdirSync(path.dirname(templateFilePath), { recursive: true });
  fs.writeFileSync(templateFilePath, args.content, "utf8");
}
