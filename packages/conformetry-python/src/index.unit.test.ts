import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createPythonValidatorPlugin } from "./index";

describe(createPythonValidatorPlugin, () => {
  it("returns the expected plugin descriptor", () => {
    const plugin = createPythonValidatorPlugin();

    expect(plugin.descriptor).toStrictEqual({
      description: "Checks that Python files exist",
      fileExtensions: [".py"],
      name: "python",
    });
  });

  it("reports no violations when all configured Python files exist", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-python-"),
    );
    await writeFile(path.join(temporaryDirectory, "main.py"), "print('ok')\n");

    const plugin = createPythonValidatorPlugin();
    const result = await plugin.validate({
      filePaths: ["main.py"],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["main.py"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
  });

  it("returns a resolved missing-path violation for each absent Python file", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-python-"),
    );
    const missingFilePath = "missing.py";
    const missingResolvedPath = path.resolve(
      temporaryDirectory,
      missingFilePath,
    );

    const plugin = createPythonValidatorPlugin();
    const result = await plugin.validate({
      filePaths: [missingFilePath],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: [missingFilePath],
      ok: false,
      pluginName: "python",
      violations: [`Missing Python path ${missingResolvedPath}`],
    });
  });
});
