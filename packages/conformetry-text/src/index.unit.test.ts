import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTextValidatorPlugin } from "./plugin";

describe(createTextValidatorPlugin, () => {
  it("returns the expected plugin descriptor", () => {
    const plugin = createTextValidatorPlugin();

    expect(plugin.descriptor).toStrictEqual({
      description: "Checks text files using duplicate-aware line conformance",
      fileExtensions: [".txt"],
      name: "text",
    });
  });

  it("reports no violations when all configured text files exist", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-text-"),
    );
    await writeFile(path.join(temporaryDirectory, "notes.txt"), "all good\n");

    const plugin = createTextValidatorPlugin();
    const result = await plugin.validate({
      filePaths: ["notes.txt"],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["notes.txt"],
      ok: true,
      pluginName: "text",
      violations: [],
    });
  });

  it("returns a resolved missing-path violation for each absent text file", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-text-"),
    );
    const missingFilePath = "missing.txt";
    const missingResolvedPath = path.resolve(
      temporaryDirectory,
      missingFilePath,
    );

    const plugin = createTextValidatorPlugin();
    const result = await plugin.validate({
      filePaths: [missingFilePath],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: [missingFilePath],
      ok: false,
      pluginName: "text",
      violations: [`Missing text path ${missingResolvedPath}`],
    });
  });
});
