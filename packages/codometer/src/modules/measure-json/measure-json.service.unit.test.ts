import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MeasureJsonService } from "./measure-json.service";

describe(MeasureJsonService, () => {
  let service: MeasureJsonService;
  let tempDirectory: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeasureJsonService],
    }).compile();

    service = await module.resolve(MeasureJsonService);
  });

  beforeEach(() => {
    tempDirectory = mkdtempSync(path.join(tmpdir(), "codometer-json-"));
  });

  afterEach(() => {
    rmSync(tempDirectory, { force: true, recursive: true });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts object, array, primitive, and nesting metrics in JSON files", () => {
    const filePath = path.join(tempDirectory, "sample.json");
    const content = `{
  "name": "codometer",
  "enabled": true,
  "count": 2,
  "nested": {
    "items": [1, "two", null, false],
    "meta": {
      "active": false
    }
  },
  "empty": []
}
`;

    writeFileSync(filePath, content, "utf8");

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.lines).toBe(
      content.split("\n").filter((line) => line.trim() !== "").length,
    );
    expect(result.objects).toBe(3);
    expect(result.arrays).toBe(2);
    expect(result.strings).toBe(2);
    expect(result.numbers).toBe(2);
    expect(result.booleans).toBe(3);
    expect(result.nulls).toBe(1);
    expect(result.properties).toBe(8);
    expect(result.items).toBe(4);
    expect(result.totalNodes).toBe(13);
    expect(result.maxDepth).toBe(4);
  });

  it("parses jsonc comments and jsonl documents", () => {
    const jsoncFilePath = path.join(tempDirectory, "config.jsonc");
    const jsonlFilePath = path.join(tempDirectory, "events.jsonl");

    writeFileSync(
      jsoncFilePath,
      `// comment\n{ "enabled": true, "count": 3 }\n`,
      "utf8",
    );
    writeFileSync(jsonlFilePath, `{"name":"one"}\n{"name":"two"}\n`, "utf8");

    const result = service.analyze({
      jsonFiles: [
        path.relative(tempDirectory, jsoncFilePath),
        path.relative(tempDirectory, jsonlFilePath),
      ],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(2);
    expect(result.lines).toBe(4);
    expect(result.objects).toBe(3);
    expect(result.booleans).toBe(1);
    expect(result.numbers).toBe(1);
    expect(result.strings).toBe(2);
  });

  it("handles JSONC escape sequences correctly", () => {
    const filePath = path.join(tempDirectory, "escaped.jsonc");
    writeFileSync(
      filePath,
      String.raw`{
  "path": "C:\\Users\\root",
  "escaped": "line\nbreak",
  "quote": "say \"hello\""
}
`,
      "utf8",
    );

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.objects).toBe(1);
    expect(result.strings).toBe(3);
  });

  it("handles files with no content gracefully", () => {
    const filePath = path.join(tempDirectory, "empty.json");
    writeFileSync(filePath, "", "utf8");

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.objects).toBe(0);
    expect(result.arrays).toBe(0);
    expect(result.strings).toBe(0);
  });

  it("handles JSONC block comments with quotes inside", () => {
    const filePath = path.join(tempDirectory, "block-comment.jsonc");
    writeFileSync(
      filePath,
      `{
  /* comment with "quote" inside */
  "value": 42
}
`,
      "utf8",
    );

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.files).toBe(1);
    expect(result.objects).toBe(1);
    expect(result.numbers).toBe(1);
  });

  it("counts nested arrays correctly", () => {
    const filePath = path.join(tempDirectory, "nested-arrays.json");
    writeFileSync(
      filePath,
      `{
  "outer": [
    [1, 2],
    [3, 4]
  ],
  "empty": []
}
`,
      "utf8",
    );

    const result = service.analyze({
      jsonFiles: [path.relative(tempDirectory, filePath)],
      workingDirectory: tempDirectory,
    });

    expect(result.objects).toBe(1);
    expect(result.arrays).toBe(3);
    expect(result.numbers).toBe(4);
  });
});
