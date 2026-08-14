import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GeneratorModule } from "./generator.module";
import { GeneratorService } from "./generator.service";

import type { EmittedFile } from "./generator.types";

/** Writes a config declaring one generator with one input. */
async function createConfigurationPath(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-generator-"),
  );
  const configurationPath = path.join(workspaceRoot, "conformetry.config.json");

  await writeFile(
    configurationPath,
    JSON.stringify([
      // Declared out of order so the emitted manifest proves it sorts, and
      // with neither aliases nor a description, which are both optional.
      {
        inputs: { name: { type: "string" } },
        name: "react-component",
        templatePath: "templates/react-component",
      },
      {
        aliases: ["nsm"],
        description: "Generate a NestJS service module",
        inputs: { name: { type: "string" } },
        name: "nestjs-service-module",
        templatePath: "templates/nestjs-service-module",
      },
    ]),
    "utf8",
  );

  return configurationPath;
}

/** Returns the emitted file whose path ends with `suffix`. */
function findFile(files: EmittedFile[], suffix: string): EmittedFile {
  const file = files.find((emitted) => emitted.filePath.endsWith(suffix));

  if (file === undefined) {
    throw new Error(`No emitted file ending in ${suffix}.`);
  }

  return file;
}

/** Parses an emitted JSON file without widening it to `any`. */
function parseEmittedJson(
  files: EmittedFile[],
  suffix: string,
): {
  $schema?: unknown;
  generators?: unknown;
} {
  const parsed: unknown = JSON.parse(findFile(files, suffix).content);

  return typeof parsed === "object" && parsed !== null ? parsed : {};
}

describe(GeneratorService, () => {
  let files: EmittedFile[];
  let service: GeneratorService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GeneratorModule],
      providers: [GeneratorService],
    }).compile();

    service = await module.resolve(GeneratorService);
    files = await service.emitPlugin({
      configurationPath: await createConfigurationPath(),
      outputPath: "tools/generators",
      packageName: "@scope/generators",
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("emitPlugin", () => {
    it("emits a manifest, a wrapper module, a schema each, and a package", () => {
      // Schemas come out sorted by generator name, not in the order the
      // configuration happens to declare them.
      expect(files.map((file) => file.filePath)).toStrictEqual([
        "tools/generators/generators.json",
        "tools/generators/src/generators.ts",
        "tools/generators/src/schemas/nestjs-service-module.json",
        "tools/generators/src/schemas/react-component.json",
        "tools/generators/package.json",
      ]);
    });

    it("points every generator schema inside the emitted package", () => {
      const generators = JSON.stringify(
        parseEmittedJson(files, "generators.json").generators,
      );

      expect(generators).toContain("./src/schemas/nestjs-service-module.json");
      // A schema path escaping the package resolves to nothing once installed.
      expect(generators).not.toContain("..");
    });

    it("resolves the manifest schema relative to the output path", () => {
      expect(parseEmittedJson(files, "generators.json").$schema).toBe(
        "../../node_modules/@nx/devkit/src/generators/generators-schema.json",
      );
    });

    it("names the factory after the generator", () => {
      expect(findFile(files, "generators.json").content).toContain(
        "./src/generators#nestjsServiceModule",
      );
      expect(findFile(files, "src/generators.ts").content).toContain(
        "export async function nestjsServiceModule(",
      );
    });

    it("requires every configured parameter", () => {
      const schema: unknown = JSON.parse(
        findFile(files, "schemas/nestjs-service-module.json").content,
      );

      expect(schema).toMatchObject({
        properties: { name: { type: "string" } },
        required: ["name"],
      });
    });

    it("declares the plugin the wrappers import", () => {
      const manifest: unknown = JSON.parse(
        findFile(files, "tools/generators/package.json").content,
      );

      expect(manifest).toMatchObject({
        dependencies: { "@jimmypaolini/conformetry-nx": "workspace:*" },
        name: "@scope/generators",
      });
    });

    it("emits the same bytes for the same configuration", async () => {
      const configurationPath = await createConfigurationPath();

      await expect(
        service.emitPlugin({
          configurationPath,
          outputPath: "tools/generators",
          packageName: "@scope/generators",
        }),
      ).resolves.toStrictEqual(
        await service.emitPlugin({
          configurationPath,
          outputPath: "tools/generators",
          packageName: "@scope/generators",
        }),
      );
    });
  });
});
