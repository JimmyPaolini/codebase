import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CssService } from "./css.service";

import type * as NodeFileSystem from "node:fs";

// Reads stay real except for one sentinel path, which throws a bare string:
// a rejected promise or a thrown literal is not an Error, and the analyzer
// still has to report which file it gave up on.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFileSystem>();

  return {
    ...actual,
    readFileSync: (filePath: string, encoding: "utf8") => {
      if (filePath.endsWith("throws-a-string.css")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an Error";
      }

      return actual.readFileSync(filePath, encoding);
    },
  };
});

describe(CssService, () => {
  let service: CssService;
  const temporaryDirectories: string[] = [];

  /** Writes sources into a fresh directory and returns it with their names. */
  function writeSources(files: Record<string, string>): {
    cssFiles: string[];
    workingDirectory: string;
  } {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-css-"));
    temporaryDirectories.push(workingDirectory);

    for (const [fileName, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, fileName), content, "utf8");
    }

    return { cssFiles: Object.keys(files), workingDirectory };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CssService],
    }).compile();

    service = await module.resolve(CssService);
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

  it("counts rules, selectors, declarations, and at-rules", () => {
    const { cssFiles, workingDirectory } = writeSources({
      "styles.css": [
        "/* Theme tokens */",
        ":root {",
        "  --brand: #22c55e;",
        "}",
        "a, button {",
        "  color: var(--brand);",
        "  cursor: pointer;",
        "}",
        "@media (min-width: 40rem) {",
        "  a {",
        "    color: red;",
        "  }",
        "}",
      ].join("\n"),
    });

    const result = service.analyze({ cssFiles, workingDirectory });

    expect(result.files).toBe(1);
    expect(result.rules).toBe(3);
    // `a, button` is one rule holding two selectors.
    expect(result.selectors).toBe(4);
    expect(result.declarations).toBe(4);
    expect(result.customProperties).toBe(1);
    expect(result.atRules).toBe(1);
    expect(result.mediaQueries).toBe(1);
    expect(result.comments).toBe(1);
  });

  it("counts an at-rule that is not a media query", () => {
    const { cssFiles, workingDirectory } = writeSources({
      "imports.css":
        '@import url("reset.css");\n@supports (display: grid) {\n  a { color: red; }\n}\n',
    });

    const result = service.analyze({ cssFiles, workingDirectory });

    expect(result.atRules).toBe(2);
    expect(result.mediaQueries).toBe(0);
  });

  it("reports a thrown value that is not an Error", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);
    const { cssFiles, workingDirectory } = writeSources({
      "throws-a-string.css": "",
    });

    const result = service.analyze({ cssFiles, workingDirectory });

    expect(result.files).toBe(0);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🎨 Skipped CSS analysis for throws-a-string.css",
      undefined,
      { reason: "not an Error" },
    );
  });

  it("skips an unreadable file and warns", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);

    const result = service.analyze({
      cssFiles: ["missing.css"],
      workingDirectory: "/repo",
    });

    expect(result.files).toBe(0);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🎨 Skipped CSS analysis for missing.css",
      undefined,
      expect.any(Object),
    );
  });
});
