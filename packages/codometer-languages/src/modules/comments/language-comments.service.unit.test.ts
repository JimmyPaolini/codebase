import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CommentsService } from "./comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { LanguageCommentsService } from "./language-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

import type { LanguageCommentFiles } from "./comments.types";
import type {
  ResolvedCodometerCommentsConfiguration,
  ResolvedCodometerConfiguration,
} from "@codometer/configuration";
import type { DeepMocked } from "@golevelup/ts-vitest";

describe(LanguageCommentsService, () => {
  let service: LanguageCommentsService;
  let loggerService: DeepMocked<LoggerService>;
  const temporaryDirectories: string[] = [];

  const budget: ResolvedCodometerCommentsConfiguration = {
    maximumCharacters: undefined,
    maximumLines: undefined,
    maximumWords: 3,
    severity: "fail",
  };

  /** An empty discovery result, with one language's files filled in. */
  function discovered(
    overrides: Partial<LanguageCommentFiles>,
  ): LanguageCommentFiles {
    return { shellFiles: [], tomlFiles: [], yamlFiles: [], ...overrides };
  }

  /** Writes files into a fresh directory and returns where they landed. */
  function writeFiles(files: Record<string, string>): string {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-cm-"));
    temporaryDirectories.push(workingDirectory);

    for (const [name, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, name), content, "utf8");
    }

    return workingDirectory;
  }

  /** A resolved configuration whose named languages carry the budget. */
  function configuration(
    languages: ("python" | "shell" | "toml" | "yaml")[],
  ): ResolvedCodometerConfiguration {
    return createMock<ResolvedCodometerConfiguration>({
      python: { comments: languages.includes("python") ? budget : undefined },
      shell: { comments: languages.includes("shell") ? budget : undefined },
      toml: { comments: languages.includes("toml") ? budget : undefined },
      yaml: { comments: languages.includes("yaml") ? budget : undefined },
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CommentsService,
        HashCommentsService,
        LanguageCommentsService,
        YamlCommentsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(LanguageCommentsService);
    loggerService = await module.resolve(LoggerService);
  });

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("measures nothing when no language declares a budget", () => {
    const workingDirectory = writeFiles({ "a.sh": "# one two three four\n" });

    expect(
      service.measure({
        configuration: configuration([]),
        files: discovered({ shellFiles: ["a.sh"] }),
        pythonComments: [],
        workingDirectory,
      }),
    ).toStrictEqual([]);
  });

  it.each<{
    extension: string;
    files: Partial<LanguageCommentFiles>;
    language: "shell" | "toml" | "yaml";
  }>([
    { extension: "sh", files: { shellFiles: ["a.sh"] }, language: "shell" },
    { extension: "toml", files: { tomlFiles: ["a.toml"] }, language: "toml" },
    { extension: "yaml", files: { yamlFiles: ["a.yaml"] }, language: "yaml" },
  ])(
    "measures $language comment blocks when it declares a budget",
    ({ extension, files, language }) => {
      const workingDirectory = writeFiles({
        [`a.${extension}`]: "# one two three four\n",
      });

      const measurements = service.measure({
        configuration: configuration([language]),
        files: discovered(files),
        pythonComments: [],
        workingDirectory,
      });

      expect(measurements).toHaveLength(1);
      expect(measurements[0]).toMatchObject({
        breached: true,
        file: `a.${extension}`,
        measured: 4,
        unit: "words",
      });
    },
  );

  it("measures the Python comments its own analyzer already found", () => {
    // Python is read in Python: `tokenize` runs in the subprocess and the
    // tokens arrive here, so nothing re-reads the `.py` file.
    const measurements = service.measure({
      configuration: configuration(["python"]),
      files: discovered({}),
      pythonComments: [
        {
          file: "a.py",
          line: 1,
          ownLine: true,
          prose: "one two",
          source: "# one two",
        },
        {
          file: "a.py",
          line: 2,
          ownLine: true,
          prose: "three four",
          source: "# three four",
        },
        {
          file: "b.py",
          line: 9,
          ownLine: true,
          prose: "five",
          source: "# five",
        },
      ],
      workingDirectory: "/repo",
    });

    // Adjacent lines in one file join; a different file never joins, whatever
    // the line numbers say.
    expect(
      measurements.map((entry) => [entry.file, entry.line, entry.measured]),
    ).toStrictEqual([
      ["a.py", 1, 4],
      ["b.py", 9, 1],
    ]);
  });

  it("measures no Python comments when Python declares no budget", () => {
    expect(
      service.measure({
        configuration: configuration([]),
        files: discovered({}),
        pythonComments: [
          {
            file: "a.py",
            line: 1,
            ownLine: true,
            prose: "one two three four",
            source: "# one two three four",
          },
        ],
        workingDirectory: "/repo",
      }),
    ).toStrictEqual([]);
  });

  it("reads YAML with the tokenizer rather than the line scanner", () => {
    const workingDirectory = writeFiles({
      "a.yaml": 'key: "one two three four five"\n',
    });

    // A line scanner would find no `#` here either; the point is that the
    // tokenizer is what YAML is routed through.
    expect(
      service.measure({
        configuration: configuration(["yaml"]),
        files: discovered({ yamlFiles: ["a.yaml"] }),
        pythonComments: [],
        workingDirectory,
      }),
    ).toStrictEqual([]);
  });

  it("skips a file it cannot read and warns", () => {
    const measurements = service.measure({
      configuration: configuration(["shell"]),
      files: discovered({ shellFiles: ["missing.sh"] }),
      pythonComments: [],
      workingDirectory: "/repo",
    });

    expect(measurements).toStrictEqual([]);
    expect(loggerService.warn).toHaveBeenCalledWith(
      "🗒️ Skipped comment measurement",
      undefined,
      expect.objectContaining({ filePath: "missing.sh" }),
    );
  });
});
