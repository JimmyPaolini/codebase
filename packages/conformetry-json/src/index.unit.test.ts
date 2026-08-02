import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createJsonValidatorPlugin } from "./index";

describe(createJsonValidatorPlugin, () => {
  afterEach(() => {
    process.env["NODE_ENV"] = "test";
  });

  it("returns the expected plugin descriptor", () => {
    const plugin = createJsonValidatorPlugin();

    expect(plugin.descriptor).toStrictEqual({
      description: "Checks JSON and JSONC structural conformance",
      fileExtensions: [".json", ".jsonc"],
      name: "json",
    });
  });

  it("reports no violations when all configured JSON files exist", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-json-"),
    );
    await writeFile(path.join(temporaryDirectory, "valid.json"), '{"ok":true}');

    const plugin = createJsonValidatorPlugin();
    const result = await plugin.validate({
      filePaths: ["valid.json"],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["valid.json"],
      ok: true,
      pluginName: "json",
      violations: [],
    });
  });

  it("returns a resolved missing-path violation for each absent JSON file", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-json-"),
    );
    const missingFilePath = "missing.json";
    const missingResolvedPath = path.resolve(
      temporaryDirectory,
      missingFilePath,
    );

    const plugin = createJsonValidatorPlugin();
    const result = await plugin.validate({
      filePaths: [missingFilePath],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: [missingFilePath],
      ok: false,
      pluginName: "json",
      violations: [`Missing JSON path ${missingResolvedPath}`],
    });
  });
});
