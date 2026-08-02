import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTypeScriptValidatorPlugin } from "./index";

describe(createTypeScriptValidatorPlugin, () => {
  it("returns the expected plugin descriptor", () => {
    const plugin = createTypeScriptValidatorPlugin();

    expect(plugin.descriptor).toStrictEqual({
      description: "Checks that TypeScript entrypoints exist",
      fileExtensions: [".ts", ".tsx"],
      name: "typescript",
    });
  });

  it("reports no violations when all configured TypeScript files exist", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-typescript-"),
    );
    await writeFile(
      path.join(temporaryDirectory, "index.ts"),
      "export const value = 1;\n",
    );

    const plugin = createTypeScriptValidatorPlugin();
    const result = await plugin.validate({
      filePaths: ["index.ts"],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["index.ts"],
      ok: true,
      pluginName: "typescript",
      violations: [],
    });
  });

  it("returns a resolved missing-path violation for each absent TypeScript file", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-typescript-"),
    );
    const missingFilePath = "missing.ts";
    const missingResolvedPath = path.resolve(
      temporaryDirectory,
      missingFilePath,
    );

    const plugin = createTypeScriptValidatorPlugin();
    const result = await plugin.validate({
      filePaths: [missingFilePath],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: [missingFilePath],
      ok: false,
      pluginName: "typescript",
      violations: [`Missing TypeScript path ${missingResolvedPath}`],
    });
  });
});
