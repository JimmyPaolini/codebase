import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { YamlService } from "./yaml.service";

describe(YamlService, () => {
  let service: YamlService;
  const temporaryDirectories: string[] = [];

  /** Writes YAML files into a fresh directory and returns it with their names. */
  function writeYamlFiles(files: Record<string, string>): {
    workingDirectory: string;
    yamlFiles: string[];
  } {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-yml-"));
    temporaryDirectories.push(workingDirectory);

    for (const [fileName, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, fileName), content, "utf8");
    }

    return { workingDirectory, yamlFiles: Object.keys(files) };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [YamlService],
    }).compile();

    service = await module.resolve(YamlService);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts mappings, sequences, keys, and scalars", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      "workflow.yml": [
        "name: build",
        "on:",
        "  push:",
        "    branches:",
        "      - main",
        "      - next",
      ].join("\n"),
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.files).toBe(1);
    expect(result.documents).toBe(1);
    // The root, `on`, and `push` mappings.
    expect(result.mappings).toBe(3);
    expect(result.sequences).toBe(1);
    expect(result.keys).toBe(4);
    // Four keys, the `build` value, and the two branch names.
    expect(result.scalars).toBe(7);
    expect(result.maxDepth).toBeGreaterThan(3);
  });

  it("counts every document in a multi-document stream", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      "manifests.yaml": ["kind: Service", "---", "kind: Deployment"].join("\n"),
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.documents).toBe(2);
    expect(result.files).toBe(1);
  });

  it("counts anchors and the aliases that reference them", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      "anchors.yaml": [
        "defaults: &defaults",
        "  retries: 2",
        "job:",
        "  <<: *defaults",
      ].join("\n"),
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.anchors).toBe(1);
    expect(result.aliases).toBe(1);
  });

  it("counts comments without reading a hash inside a string", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      "comments.yaml": [
        "# Leading comment",
        "# Second line of it",
        "color: '#ff0000' # trailing comment",
      ].join("\n"),
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.comments).toBe(3);
    // The hash is part of the value, so the value is still one scalar.
    expect(result.scalars).toBe(2);
  });

  it("reports lines across every analyzed file", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      "one.yaml": "a: 1\nb: 2\n",
      "two.yml": "c: 3\n",
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.files).toBe(2);
    expect(result.lines).toBe(5);
  });

  it("counts an empty document without walking into nothing", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      // A stream of two `---` markers: two documents, each an empty scalar.
      "empty.yaml": "---\n---\n",
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.documents).toBe(2);
    expect(result.mappings).toBe(0);
    expect(result.maxDepth).toBe(1);
  });

  it("counts an explicit key that has no value", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      // `? key` with nothing under it: the pair's value is absent entirely
      // rather than an empty scalar, so there is no node to walk into.
      "explicit.yaml": "? standalone\n",
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.mappings).toBe(1);
    expect(result.keys).toBe(1);
    expect(result.scalars).toBe(1);
  });

  it("walks mappings nested inside a sequence", () => {
    const { workingDirectory, yamlFiles } = writeYamlFiles({
      "steps.yaml": [
        "steps:",
        "  - name: checkout",
        "    uses: actions/checkout@v7",
        "  - name: build",
        "    run: pnpm build",
      ].join("\n"),
    });

    const result = service.analyze({ workingDirectory, yamlFiles });

    expect(result.sequences).toBe(1);
    // The root plus one per sequence item.
    expect(result.mappings).toBe(3);
    expect(result.keys).toBe(5);
  });

  it("returns empty metrics when there are no YAML files", () => {
    const result = service.analyze({
      workingDirectory: "/repo",
      yamlFiles: [],
    });

    expect(result).toStrictEqual({
      aliases: 0,
      anchors: 0,
      comments: 0,
      documents: 0,
      files: 0,
      keys: 0,
      lines: 0,
      mappings: 0,
      maxDepth: 0,
      scalars: 0,
      sequences: 0,
    });
  });

  it("skips an unreadable file and warns", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);

    const result = service.analyze({
      workingDirectory: "/repo",
      yamlFiles: ["missing.yaml"],
    });

    expect(result.files).toBe(0);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🧾 Skipped YAML analysis for missing.yaml",
      undefined,
      expect.any(Object),
    );
  });
});
