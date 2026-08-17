import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LanguageService } from "./language.service";

import type {
  ConformetryLanguageValidator,
  PreparedValidationDocument,
} from "./language.types";

function createDocument(filename: string): PreparedValidationDocument {
  return {
    filename,
    instance: "instance",
    instanceFilePath: `/project/${filename}`,
    renderedTemplate: "template",
    templateFilePath: `/templates/${filename}`,
  };
}

function createValidator(args: {
  cleanFilenames?: string[];
  extensions: string[];
  seen?: string[];
}): ConformetryLanguageValidator {
  return {
    descriptor: { fileExtensions: args.extensions, name: "example" },
    validateDocument: (document) => {
      args.seen?.push(document.filename);

      if (args.cleanFilenames?.includes(document.filename) === true) {
        return { errors: [], totalWeight: 10 };
      }

      return {
        errors: [
          {
            errorType: "code",
            fix: "Fix it.",
            message: `problem in ${document.filename}`,
          },
        ],
        totalWeight: 10,
      };
    },
  };
}

describe(LanguageService, () => {
  let service: LanguageService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LanguageService],
    }).compile();

    service = await module.resolve(LanguageService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("only validates documents whose extension the validator claims", () => {
    const seen: string[] = [];

    const result = service.runValidator({
      checkedPaths: ["/project"],
      documents: [
        createDocument("a.ts"),
        createDocument("b.md"),
        createDocument("c.ts"),
      ],
      validator: createValidator({ extensions: [".ts"], seen }),
    });

    expect(seen).toStrictEqual(["a.ts", "c.ts"]);
    expect(result.fileResults).toHaveLength(2);
  });

  it("groups errors under the file and template they came from", () => {
    const result = service.runValidator({
      checkedPaths: ["/project"],
      documents: [createDocument("a.ts")],
      validator: createValidator({ extensions: [".ts"] }),
    });

    expect(result.fileResults[0]).toStrictEqual({
      errors: [
        { errorType: "code", fix: "Fix it.", message: "problem in a.ts" },
      ],
      filename: "a.ts",
      instanceFilePath: "/project/a.ts",
      templateFilePath: "/templates/a.ts",
      totalWeight: 10,
    });
  });

  it("drops conforming files so reports list only failures", () => {
    const result = service.runValidator({
      checkedPaths: ["/project"],
      documents: [createDocument("clean.ts"), createDocument("dirty.ts")],
      validator: createValidator({
        cleanFilenames: ["clean.ts"],
        extensions: [".ts"],
      }),
    });

    expect(result.fileResults).toHaveLength(1);
    expect(result.fileResults[0]?.filename).toBe("dirty.ts");
  });

  it("still counts a conforming file's weight toward the total", () => {
    const result = service.runValidator({
      checkedPaths: ["/project"],
      documents: [createDocument("clean.ts"), createDocument("dirty.ts")],
      validator: createValidator({
        cleanFilenames: ["clean.ts"],
        extensions: [".ts"],
      }),
    });

    // Both files weigh 10. Dropping the clean one from the denominator would
    // leave 10 instead of 20 and silently double every score.
    expect(result.totalWeight).toBe(20);
  });

  it("counts no weight for documents the validator does not claim", () => {
    const result = service.runValidator({
      checkedPaths: ["/project"],
      documents: [createDocument("only.md")],
      validator: createValidator({ extensions: [".ts"] }),
    });

    expect(result.totalWeight).toBe(0);
  });

  it("reports ok when no claimed document produces an error", () => {
    const result = service.runValidator({
      checkedPaths: ["/project"],
      documents: [createDocument("only.md")],
      validator: createValidator({ extensions: [".ts"] }),
    });

    expect(result.ok).toBe(true);
    expect(result.fileResults).toStrictEqual([]);
  });

  it("carries the language name and checked paths into the result", () => {
    const result = service.runValidator({
      checkedPaths: ["/project", "/other"],
      documents: [createDocument("a.ts")],
      validator: createValidator({ extensions: [".ts"] }),
    });

    expect(result.ok).toBe(false);
    expect(result.languageName).toBe("example");
    expect(result.checkedPaths).toStrictEqual(["/project", "/other"]);
  });
});
