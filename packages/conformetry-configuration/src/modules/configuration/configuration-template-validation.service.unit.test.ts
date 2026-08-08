import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { TemplateValidationService } from "./configuration-template-validation.service.js";
import { ConfigurationService } from "./configuration.service.js";

const createdDirectories: string[] = [];

describe("template validation service", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectories.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });
  it("prepares validation payloads from template files", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-validation-"),
    );
    createdDirectories.push(workingDirectory);

    await writeFile(
      path.join(workingDirectory, "pnpm-workspace.yaml"),
      "{}\n",
      "utf8",
    );
    await mkdir(
      path.join(
        workingDirectory,
        "configuration",
        "conformetry-templates",
        "demo",
        "src",
      ),
      { recursive: true },
    );
    await mkdir(path.join(workingDirectory, "apps", "demo", "src"), {
      recursive: true,
    });
    await writeFile(
      path.join(workingDirectory, "configuration", "conformetry.config.json"),
      JSON.stringify({
        generators: {
          demo: {
            name: "demo",
            parameters: {
              project: {
                type: "string",
              },
            },
          },
        },
      }),
      "utf8",
    );
    await writeFile(
      path.join(
        workingDirectory,
        "configuration",
        "conformetry-templates",
        "demo",
        "src",
        "index.ts",
      ),
      'export const projectName = "{{name}}";\n',
      "utf8",
    );
    await writeFile(
      path.join(workingDirectory, "apps", "demo", "src", "index.ts"),
      'export const projectName = "demo";\n',
      "utf8",
    );

    const previousWorkingDirectory = process.cwd();
    process.chdir(workingDirectory);

    try {
      const configurationService = new ConfigurationService();
      const templateValidationService = new TemplateValidationService(
        configurationService,
      );
      const payload = await templateValidationService.prepareTemplateValidationPayload(
        {
          configurationPath: "configuration/conformetry.config.json",
          fileExtensions: [".ts"],
          filePaths: ["apps/demo"],
          workingDirectory,
        },
      );

      expect(payload.violations).toStrictEqual([]);
      expect(payload.documents).toHaveLength(1);
      expect(payload.documents[0]?.renderedTemplate).toBe(
        'export const projectName = "demo";\n',
      );
      expect(payload.documents[0]?.instance).toBe(
        'export const projectName = "demo";\n',
      );
    } finally {
      process.chdir(previousWorkingDirectory);
    }
  });
});
