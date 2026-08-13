import { Injectable } from "@nestjs/common";
import { type Node, type SourceFile, SyntaxKind } from "typescript";

import { ValidatorNodesService } from "./validator-nodes.service";

import type {
  ConformanceError,
  ConformanceErrorLanguage,
  ResolvedErrorLocation,
} from "./validator.types";

/**
 * TypeScript AST structural conformance validator.
 */
@Injectable()
export class ValidatorAbstractSyntaxTreeService {
  // 🏗 Dependency Injection

  constructor() {}

  private readonly validatorNodesService = new ValidatorNodesService();

  /**
   * Builds a structured missing-node error.
   */
  private buildError(args: {
    instanceFile: SourceFile;
    instanceNode: Node;
    language: ConformanceErrorLanguage;
    templateChild: Node;
  }): ConformanceError {
    const { instanceFile, instanceNode, language, templateChild } = args;
    const {
      breadcrumb,
      instanceCharacter,
      instanceLine,
      snippet,
      templateCharacter,
      templateLine,
    } = this.resolveErrorLocations({
      instanceFile,
      instanceNode,
      templateChild,
    });
    return {
      errorType: "code",
      fix: `Add the missing ${breadcrumb} to the instance file. See the template for the expected structure.`,
      instanceColumn: instanceCharacter + 1,
      instanceLine: instanceLine + 1,
      language,
      message: `Missing ${breadcrumb}`,
      templateColumn: templateCharacter + 1,
      templateLine: templateLine + 1,
      ...(snippet.length > 0 ? { expected: snippet } : {}),
    };
  }

  /**
   * Resolves source locations for missing-node errors.
   */
  private resolveErrorLocations(args: {
    instanceFile: SourceFile;
    instanceNode: Node;
    templateChild: Node;
  }): ResolvedErrorLocation {
    const { instanceFile, instanceNode, templateChild } = args;
    const templateFile = templateChild.getSourceFile();
    const instancePosition = instanceFile.getLineAndCharacterOfPosition(
      instanceNode.getStart(instanceFile),
    );
    const templatePosition = templateFile.getLineAndCharacterOfPosition(
      templateChild.getStart(),
    );
    const kind =
      (SyntaxKind[templateChild.kind] as string | undefined) ??
      `SyntaxKind(${String(templateChild.kind)})`;
    const key = this.validatorNodesService.getKey(templateChild);
    return {
      breadcrumb: key === null ? kind : `${kind} "${key}"`,
      instanceCharacter: instancePosition.character,
      instanceLine: instancePosition.line,
      snippet: templateChild
        .getText(templateFile)
        .replaceAll(/\s+/gu, " ")
        .trim(),
      templateCharacter: templatePosition.character,
      templateLine: templatePosition.line,
    };
  }

  /**
   * Validates keyed template children.
   */
  private validateKeyedChild(args: {
    instanceChildren: Node[];
    instanceFile: SourceFile;
    instanceNode: Node;
    language: ConformanceErrorLanguage;
    templateChild: Node;
  }): ConformanceError[] {
    const {
      instanceChildren,
      instanceFile,
      instanceNode,
      language,
      templateChild,
    } = args;

    const match =
      this.validatorNodesService.filterBySameKey(
        instanceChildren,
        templateChild,
      )[0] ?? null;
    if (match === null) {
      return [
        this.buildError({
          instanceFile,
          instanceNode,
          language,
          templateChild,
        }),
      ];
    }

    return this.validateDepthFirstSearch({
      instanceFile,
      instanceNode: match,
      language,
      templateNode: templateChild,
    });
  }

  /**
   * Validates keyless template children.
   */
  private validateKeylessChild(args: {
    instanceChildren: Node[];
    instanceFile: SourceFile;
    instanceNode: Node;
    language: ConformanceErrorLanguage;
    templateChild: Node;
  }): ConformanceError[] {
    const sameKind = this.validatorNodesService.filterBySameKind(
      args.instanceChildren,
      args.templateChild,
    );

    if (sameKind.length === 0) {
      return [this.buildError(args)];
    }

    return sameKind
      .map((child) =>
        this.validateDepthFirstSearch({
          instanceFile: args.instanceFile,
          instanceNode: child,
          language: args.language,
          templateNode: args.templateChild,
        }),
      )
      .reduce((minimumErrors, currentErrors) =>
        currentErrors.length < minimumErrors.length
          ? currentErrors
          : minimumErrors,
      );
  }

  /**
   * Validates one template child by key-aware strategy.
   */
  private validateTemplateChild(args: {
    instanceChildren: Node[];
    instanceFile: SourceFile;
    instanceNode: Node;
    language: ConformanceErrorLanguage;
    templateChild: Node;
  }): ConformanceError[] {
    const {
      instanceChildren,
      instanceFile,
      instanceNode,
      language,
      templateChild,
    } = args;
    if (this.validatorNodesService.getKey(templateChild) !== null) {
      return this.validateKeyedChild({
        instanceChildren,
        instanceFile,
        instanceNode,
        language,
        templateChild,
      });
    }
    return this.validateKeylessChild({
      instanceChildren,
      instanceFile,
      instanceNode,
      language,
      templateChild,
    });
  }

  /**
   * Validates template AST nodes against the instance AST.
   */
  validateDepthFirstSearch(args: {
    instanceFile: SourceFile;
    instanceNode: Node;
    language: ConformanceErrorLanguage;
    templateNode: Node;
  }): ConformanceError[] {
    const { instanceFile, instanceNode, language, templateNode } = args;
    const instanceChildren =
      this.validatorNodesService.getChildren(instanceNode);
    const templateChildren =
      this.validatorNodesService.getChildren(templateNode);
    const errors: ConformanceError[] = [];
    for (const templateChild of templateChildren) {
      errors.push(
        ...this.validateTemplateChild({
          instanceChildren,
          instanceFile,
          instanceNode,
          language,
          templateChild,
        }),
      );
    }
    return errors;
  }
}
