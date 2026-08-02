import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createMarkdownValidatorPlugin } from "./index";

describe(createMarkdownValidatorPlugin, () => {
  it("returns the expected plugin descriptor", () => {
    const plugin = createMarkdownValidatorPlugin();

    expect(plugin.descriptor).toStrictEqual({
      description: "Checks that Markdown files exist",
      fileExtensions: [".md"],
      name: "markdown",
    });
  });

  it("reports no violations when all configured Markdown files exist", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-markdown-"),
    );
    await writeFile(path.join(temporaryDirectory, "guide.md"), "# Guide");

    const plugin = createMarkdownValidatorPlugin();
    const result = await plugin.validate({
      filePaths: ["guide.md"],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["guide.md"],
      ok: true,
      pluginName: "markdown",
      violations: [],
    });
  });

  it("returns a resolved missing-path violation for each absent Markdown file", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(process.env["TMPDIR"] ?? "/tmp", "conformetry-markdown-"),
    );
    const missingFilePath = "missing.md";
    const missingResolvedPath = path.resolve(
      temporaryDirectory,
      missingFilePath,
    );

    const plugin = createMarkdownValidatorPlugin();
    const result = await plugin.validate({
      filePaths: [missingFilePath],
      workingDirectory: temporaryDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: [missingFilePath],
      ok: false,
      pluginName: "markdown",
      violations: [`Missing Markdown path ${missingResolvedPath}`],
    });
  });
});
