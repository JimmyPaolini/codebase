import { Injectable } from "@nestjs/common";
import mustache from "mustache";
import {
  createSourceFile,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
} from "typescript";

import { ValidatorAbstractSyntaxTreeService } from "./validator-abstract-syntax-tree.service";
import { ValidatorCommentsService } from "./validator-comments.service";

import type {
  ConformanceError,
  ConformanceErrorLanguage,
} from "./validator.types";

/**
 * TypeScript file conformance validator.
 */
@Injectable()
export class ValidatorTypescriptService {
  // 🏗 Dependency Injection

  constructor() {}

  private readonly validatorAbstractSyntaxTreeService =
    new ValidatorAbstractSyntaxTreeService();
  private readonly validatorCommentsService = new ValidatorCommentsService();

  /**
   * Parses source text into a TypeScript SourceFile.
   */
  private parseSourceFile(
    filename: string,
    content: string,
    scriptKind: ScriptKind,
  ): SourceFile {
    return createSourceFile(
      filename,
      content,
      ScriptTarget.Latest,
      true,
      scriptKind,
    );
  }

  /**
   * Resolves language from file extension.
   */
  private resolveLanguage(filename: string): ConformanceErrorLanguage {
    const extension = filename.slice(filename.lastIndexOf("."));
    switch (extension) {
      case ".cjs":
      case ".js":
      case ".jsx":
      case ".mjs": {
        return "javascript";
      }
      case ".ts":
      case ".tsx": {
        return "typescript";
      }
      default: {
        return "typescript";
      }
    }
  }

  /**
   * Resolves ScriptKind from file extension.
   */
  private resolveScriptKind(filename: string): ScriptKind {
    const extension = filename.slice(filename.lastIndexOf("."));
    switch (extension) {
      case ".cjs":
      case ".js":
      case ".mjs": {
        return ScriptKind.JS;
      }
      case ".jsx": {
        return ScriptKind.JSX;
      }
      case ".ts": {
        return ScriptKind.TS;
      }
      case ".tsx": {
        return ScriptKind.TSX;
      }
      default: {
        return ScriptKind.TS;
      }
    }
  }

  /**
   * Validates a TypeScript/JavaScript instance against its template.
   */
  validateTypescriptConformance(args: {
    data: Record<string, unknown>;
    filename: string;
    instance: string;
    template: string;
  }): { errors: ConformanceError[] } {
    const { data, filename, instance, template } = args;

    const scriptKind = this.resolveScriptKind(filename);
    const language = this.resolveLanguage(filename);
    const renderedTemplate = mustache.render(template, data);
    const templateFile = this.parseSourceFile(
      filename,
      renderedTemplate,
      scriptKind,
    );
    const instanceFile = this.parseSourceFile(filename, instance, scriptKind);

    const errors =
      this.validatorAbstractSyntaxTreeService.validateDepthFirstSearch({
        instanceFile,
        instanceNode: instanceFile,
        language,
        templateNode: templateFile,
      });

    const commentErrors = this.validatorCommentsService.validateAllComments({
      instanceFile,
      language,
      templateFile,
    });

    return { errors: [...errors, ...commentErrors] };
  }
}
