import { Injectable } from "@nestjs/common";
import {
  createSourceFile,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
} from "typescript";

import { TypescriptCommentsService } from "./typescript-comments.service";
import { TypescriptTreeService } from "./typescript-tree.service";
import { TYPESCRIPT_VALIDATOR_DESCRIPTOR } from "./typescript-validator.constants";

import type {
  ConformetryError,
  ConformetryLanguageValidator,
  PreparedValidationDocument,
} from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Checks that a TypeScript file declares everything its template requires.
 *
 * Two independent checks run over the same parse: the syntax tree, which
 * verifies imports, decorators, classes, and members exist; and the comments,
 * which verify the section markers appear in the prescribed order.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptValidatorService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(
    private readonly typeScriptCommentsService: TypescriptCommentsService,
    private readonly typeScriptTreeService: TypescriptTreeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = TYPESCRIPT_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  /** Parses source text, choosing the dialect from the filename. */
  private parseSourceFile(args: {
    content: string;
    filename: string;
  }): SourceFile {
    return createSourceFile(
      args.filename,
      args.content,
      ScriptTarget.Latest,
      true,
      args.filename.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS,
    );
  }

  /** Converts a source offset into a 1-based line and column. */
  private readLocation(args: {
    position: number | undefined;
    sourceFile: SourceFile;
  }): undefined | { column: number; line: number } {
    /* v8 ignore next -- only a synthesized node lacks a position */
    if (args.position === undefined || args.position < 0) {
      return undefined;
    }

    const { character, line } = args.sourceFile.getLineAndCharacterOfPosition(
      args.position,
    );

    return { column: character + 1, line: line + 1 };
  }

  /** Compares the comments and describes each missing section marker. */
  private validateComments(args: {
    instanceSourceFile: SourceFile;
    templateSourceFile: SourceFile;
  }): ConformetryError[] {
    return this.typeScriptCommentsService
      .compareComments(args)
      .map((comment) => {
        const templateLocation = this.readLocation({
          position: comment.position,
          sourceFile: args.templateSourceFile,
        });

        return {
          errorType: "comment",
          expected: comment.text,
          fix: `Add the comment ${comment.text} to the instance file, in the order the template declares it.`,
          language: "typescript",
          message: `Missing comment ${comment.text}`,
          /* v8 ignore next -- a parsed node always resolves a location */
          ...(templateLocation === undefined
            ? {}
            : {
                templateColumn: templateLocation.column,
                templateLine: templateLocation.line,
              }),
        };
      });
  }

  /** Compares the syntax trees and describes each missing declaration. */
  private validateStructure(args: {
    instanceSourceFile: SourceFile;
    templateSourceFile: SourceFile;
  }): ConformetryError[] {
    return this.typeScriptTreeService
      .compareTree({
        instanceNode: args.instanceSourceFile,
        templateNode: args.templateSourceFile,
      })
      .map((error) => {
        const described =
          error.nodeKey === undefined
            ? error.kindLabel
            : `${error.kindLabel} "${error.nodeKey}"`;
        const instanceLocation = this.readLocation({
          position: error.instancePosition,
          sourceFile: args.instanceSourceFile,
        });
        const templateLocation = this.readLocation({
          position: error.templatePosition,
          sourceFile: args.templateSourceFile,
        });

        return {
          errorType: "code",
          fix: `Add the missing ${described} to the instance file. See the template for the expected structure.`,
          /* v8 ignore next -- a parsed node always resolves a location */
          ...(instanceLocation === undefined
            ? {}
            : {
                instanceColumn: instanceLocation.column,
                instanceLine: instanceLocation.line,
              }),
          language: "typescript",
          message: `Missing ${described}`,
          /* v8 ignore next -- a parsed node always resolves a location */
          ...(templateLocation === undefined
            ? {}
            : {
                templateColumn: templateLocation.column,
                templateLine: templateLocation.line,
              }),
        };
      });
  }

  // 🌎 Public Methods

  /** Reports every declaration and comment the template requires. */
  public validateDocument(
    document: PreparedValidationDocument,
  ): ConformetryError[] {
    const sourceFiles = {
      instanceSourceFile: this.parseSourceFile({
        content: document.instance,
        filename: document.filename,
      }),
      templateSourceFile: this.parseSourceFile({
        content: document.renderedTemplate,
        filename: document.filename,
      }),
    };

    return [
      ...this.validateStructure(sourceFiles),
      ...this.validateComments(sourceFiles),
    ];
  }
}
