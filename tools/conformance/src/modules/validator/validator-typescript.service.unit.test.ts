import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { mockValidateAllComments, mockValidateDepthFirstSearch } = vi.hoisted(
  () => ({
    mockValidateAllComments: vi.fn<(input: unknown) => unknown[]>(),
    mockValidateDepthFirstSearch: vi.fn<(input: unknown) => unknown[]>(),
  }),
);

vi.mock("./validator-abstract-syntax-tree.service", () => ({
  ValidatorAbstractSyntaxTreeService: class ValidatorAbstractSyntaxTreeService {
    validateDepthFirstSearch = mockValidateDepthFirstSearch;
  },
}));

vi.mock("./validator-comments.service", () => ({
  ValidatorCommentsService: class ValidatorCommentsService {
    validateAllComments = mockValidateAllComments;
  },
}));

import { ValidatorTypescriptService } from "./validator-typescript.service";

describe(ValidatorTypescriptService, () => {
  interface ValidateDepthFirstSearchArgument {
    instanceFile: { fileName: string };
    language: string;
    templateNode: { fileName: string };
  }

  function isValidateDepthFirstSearchArgument(
    value: unknown,
  ): value is ValidateDepthFirstSearchArgument {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    return (
      "instanceFile" in value && "language" in value && "templateNode" in value
    );
  }

  function getFirstValidateDepthFirstSearchCallArgument():
    | undefined
    | ValidateDepthFirstSearchArgument {
    const firstCall = mockValidateDepthFirstSearch.mock.calls[0];
    const firstArgument = firstCall?.[0];
    if (isValidateDepthFirstSearchArgument(firstArgument)) {
      const { instanceFile, language, templateNode } = firstArgument;
      return {
        instanceFile,
        language,
        templateNode,
      };
    }

    return undefined;
  }

  let service: ValidatorTypescriptService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorTypescriptService],
    }).compile();

    service = await module.resolve(ValidatorTypescriptService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("routes filename extensions to the expected language and script kind", () => {
    mockValidateDepthFirstSearch.mockReturnValue([]);
    mockValidateAllComments.mockReturnValue([]);

    service.validateTypescriptConformance({
      data: {},
      filename: "example.tsx",
      instance: "export const value = 1;",
      template: "export const value = 1;",
    });

    expect(mockValidateDepthFirstSearch).toHaveBeenCalledTimes(1);
    expect(mockValidateAllComments).toHaveBeenCalledTimes(1);

    const firstCallArgument = getFirstValidateDepthFirstSearchCallArgument();

    expect(firstCallArgument?.instanceFile.fileName).toBe("example.tsx");
    expect(firstCallArgument?.language).toBe("typescript");
    expect(firstCallArgument?.templateNode.fileName).toBe("example.tsx");
  });

  it("uses javascript mode for js-like files and concatenates AST and comment errors", () => {
    mockValidateDepthFirstSearch.mockReturnValue([
      { errorType: "code", fix: "ast", message: "ast" },
    ]);
    mockValidateAllComments.mockReturnValue([
      { errorType: "comment", fix: "comment", message: "comment" },
    ]);

    const result = service.validateTypescriptConformance({
      data: {},
      filename: "example.js",
      instance: "console.log('instance');",
      template: "console.log('template');",
    });

    expect(result.errors).toStrictEqual([
      { errorType: "code", fix: "ast", message: "ast" },
      { errorType: "comment", fix: "comment", message: "comment" },
    ]);
    expect(mockValidateDepthFirstSearch).toHaveBeenCalledTimes(1);
    expect(mockValidateAllComments).toHaveBeenCalledTimes(1);
  });

  it("routes jsx files to javascript language and JSX script kind", () => {
    mockValidateDepthFirstSearch.mockReturnValue([]);
    mockValidateAllComments.mockReturnValue([]);

    service.validateTypescriptConformance({
      data: {},
      filename: "example.jsx",
      instance: "export const value = 1;",
      template: "export const value = 1;",
    });

    expect(mockValidateDepthFirstSearch).toHaveBeenCalledTimes(1);

    const firstCallArgument = getFirstValidateDepthFirstSearchCallArgument();

    expect(firstCallArgument?.instanceFile.fileName).toBe("example.jsx");
    expect(firstCallArgument?.language).toBe("javascript");
    expect(firstCallArgument?.templateNode.fileName).toBe("example.jsx");
  });

  it("routes ts files to typescript language and TS script kind", () => {
    mockValidateDepthFirstSearch.mockReturnValue([]);
    mockValidateAllComments.mockReturnValue([]);

    service.validateTypescriptConformance({
      data: {},
      filename: "example.ts",
      instance: "export const value = 1;",
      template: "export const value = 1;",
    });

    expect(mockValidateDepthFirstSearch).toHaveBeenCalledTimes(1);

    const firstCallArgument = getFirstValidateDepthFirstSearchCallArgument();

    expect(firstCallArgument?.instanceFile.fileName).toBe("example.ts");
    expect(firstCallArgument?.language).toBe("typescript");
    expect(firstCallArgument?.templateNode.fileName).toBe("example.ts");
  });

  it("falls back to typescript language and TS script kind for unknown extensions", () => {
    mockValidateDepthFirstSearch.mockReturnValue([]);
    mockValidateAllComments.mockReturnValue([]);

    service.validateTypescriptConformance({
      data: {},
      filename: "example.txt",
      instance: "export const value = 1;",
      template: "export const value = 1;",
    });

    expect(mockValidateDepthFirstSearch).toHaveBeenCalledTimes(1);

    const firstCallArgument = getFirstValidateDepthFirstSearchCallArgument();

    expect(firstCallArgument?.instanceFile.fileName).toBe("example.txt");
    expect(firstCallArgument?.language).toBe("typescript");
    expect(firstCallArgument?.templateNode.fileName).toBe("example.txt");
  });

  it("routes cjs files to javascript language and JS script kind", () => {
    mockValidateDepthFirstSearch.mockReturnValue([]);
    mockValidateAllComments.mockReturnValue([]);

    service.validateTypescriptConformance({
      data: {},
      filename: "example.cjs",
      instance: "module.exports = {};",
      template: "module.exports = {};",
    });

    const firstCallArgument = getFirstValidateDepthFirstSearchCallArgument();

    expect(firstCallArgument?.instanceFile.fileName).toBe("example.cjs");
    expect(firstCallArgument?.language).toBe("javascript");
    expect(firstCallArgument?.templateNode.fileName).toBe("example.cjs");
  });

  it("routes mjs files to javascript language and JS script kind", () => {
    mockValidateDepthFirstSearch.mockReturnValue([]);
    mockValidateAllComments.mockReturnValue([]);

    service.validateTypescriptConformance({
      data: {},
      filename: "example.mjs",
      instance: "export const value = 1;",
      template: "export const value = 1;",
    });

    const firstCallArgument = getFirstValidateDepthFirstSearchCallArgument();

    expect(firstCallArgument?.instanceFile.fileName).toBe("example.mjs");
    expect(firstCallArgument?.language).toBe("javascript");
    expect(firstCallArgument?.templateNode.fileName).toBe("example.mjs");
  });
});
