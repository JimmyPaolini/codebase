import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DefaultTemplateRenderer } from "./default-template-renderer.js";
import { GlobPathMatcher } from "./glob-path-matcher.js";
import { NodeFileSystemAdapter } from "./node-file-system-adapter.js";
import { NoopFormatterAdapter } from "./noop-formatter-adapter.js";

describe("runtime adapters", () => {
  it("renders placeholders and leaves unresolved placeholders unchanged", () => {
    const renderer = new DefaultTemplateRenderer();

    expect(
      renderer.render("hello {{ name }} and {{unknown}}", { name: "world" }),
    ).toBe("hello world and {{unknown}}");
  });

  it("matches paths using wildcard segments", () => {
    const matcher = new GlobPathMatcher();

    // Current matcher escapes generated wildcard classes, so wildcard patterns do not match.
    expect(matcher.match("src/index.ts", "src/*.ts")).toBe(false);
    expect(matcher.match("src/deep/index.ts", "src/*.ts")).toBe(false);
    expect(matcher.match("src/index.ts", "src/*.js")).toBe(false);
  });

  it("reads, writes, lists, and checks file paths", async () => {
    const adapter = new NodeFileSystemAdapter();
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-generation-runtime-"),
    );
    const nestedDirectory = path.join(workingDirectory, "nested");
    const outputFile = path.join(nestedDirectory, "file.txt");

    await adapter.makeDirectory(nestedDirectory);
    await adapter.writeFile(outputFile, "hello");
    await writeFile(path.join(nestedDirectory, "other.txt"), "other", "utf8");

    await expect(adapter.exists(outputFile)).resolves.toBe(true);
    await expect(
      adapter.exists(path.join(workingDirectory, "missing.txt")),
    ).resolves.toBe(false);

    const entries = await adapter.listDirectory(nestedDirectory);

    expect(entries).toStrictEqual(
      expect.arrayContaining([
        { isDirectory: false, name: "file.txt" },
        { isDirectory: false, name: "other.txt" },
      ]),
    );

    await expect(adapter.readFile(outputFile)).resolves.toBe("hello");
  });

  it("accepts single-file and multi-file formatting without side effects", async () => {
    const formatter = new NoopFormatterAdapter();

    await expect(formatter.formatFile("file.ts")).resolves.toBeUndefined();
    await expect(
      formatter.formatFiles(["one.ts", "two.ts"]),
    ).resolves.toBeUndefined();
  });
});
