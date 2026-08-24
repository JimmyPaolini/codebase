import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { LoggerService } from "@codebase/logger";

import {
  BARREL_FILE_SUFFIX,
  BOOTSTRAP_FILE_SUFFIX,
  BOOTSTRAP_FUNCTION_NAMES,
  COMMAND_RUNNER_METHOD_NAME,
  LIFECYCLE_METHOD_NAMES,
} from "./entry-points.constants";

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  EntryPointCollection,
  ResolveEntryPointsArguments,
} from "./entry-points.types";
import type { EntryPoint, EntryPointKind } from "@callidescope/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Decides which callables are the roots of a call stack.
 *
 * This is where the tool is most likely to be wrong, and the numbers it reports
 * are only as meaningful as this list. Most code in a repository like this one
 * is never called by anything inside it — a framework calls it. So the roots
 * have to be named, and anything missed would silently vanish from every
 * measurement rather than fail loudly.
 *
 * Orphan promotion is the guard against exactly that. After the named rules
 * run, anything with no caller left in the graph becomes a root anyway, so a
 * rule this list is missing shows up as an orphan instead of as a hole.
 */
@Injectable()
/* v8 ignore stop */
export class EntryPointsService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(EntryPointsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Classifies a callable's declaration, or leaves it unrooted. */
  private classify(args: {
    callable: DiscoveredCallable;
    decorators: ReadonlySet<string>;
    includeExportedFunctions: boolean;
  }): EntryPointKind | undefined {
    const { declaration, node } = args.callable;

    if (
      this.hasConfiguredDecorator({
        decorators: args.decorators,
        node: declaration,
      })
    ) {
      return "decorated-method";
    }

    if (LIFECYCLE_METHOD_NAMES.has(node.memberName)) {
      return "lifecycle";
    }

    if (this.isCommandRunnerMethod({ ...args, declaration })) {
      return "decorated-method";
    }

    if (this.isBootstrapFunction(node.location.filePath, node.memberName)) {
      return "module-bootstrap";
    }

    return args.includeExportedFunctions &&
      node.isExported &&
      node.location.filePath.endsWith(BARREL_FILE_SUFFIX)
      ? "exported-function"
      : undefined;
  }

  /** True when a node carries one of the configured framework decorators. */
  private hasConfiguredDecorator(args: {
    decorators: ReadonlySet<string>;
    node: ts.Node;
  }): boolean {
    return this.readDecoratorNames(args.node).some((name) =>
      args.decorators.has(name),
    );
  }

  /** True when a function is a module's own runtime entry point. */
  private isBootstrapFunction(filePath: string, memberName: string): boolean {
    return (
      filePath.endsWith(BOOTSTRAP_FILE_SUFFIX) &&
      BOOTSTRAP_FUNCTION_NAMES.has(memberName)
    );
  }

  /** True when a method is the entry point of a decorated command class. */
  private isCommandRunnerMethod(args: {
    callable: DiscoveredCallable;
    declaration: ts.Node;
    decorators: ReadonlySet<string>;
  }): boolean {
    if (args.callable.node.memberName !== COMMAND_RUNNER_METHOD_NAME) {
      return false;
    }

    const owner = ts.findAncestor(args.declaration, ts.isClassDeclaration);

    return (
      owner !== undefined &&
      this.hasConfiguredDecorator({ decorators: args.decorators, node: owner })
    );
  }

  /** Reads the names of the decorators applied to a node. */
  private readDecoratorNames(node: ts.Node): string[] {
    if (!ts.canHaveDecorators(node)) {
      return [];
    }

    return (ts.getDecorators(node) ?? []).map((decorator) => {
      const { expression } = decorator;
      const callee = ts.isCallExpression(expression)
        ? expression.expression
        : expression;

      return ts.isIdentifier(callee) ? callee.text : "";
    });
  }

  // 🌎 Public Methods

  /** Resolves every root a run will measure depth from. */
  public resolve(args: ResolveEntryPointsArguments): EntryPointCollection {
    const entryPoints: EntryPoint[] = [];
    const claimed = new Set<string>();

    for (const callable of args.callablesById.values()) {
      const kind = this.classify({
        callable,
        decorators: args.decorators,
        includeExportedFunctions: args.includeExportedFunctions,
      });

      if (kind !== undefined) {
        entryPoints.push({ callableId: callable.node.id, kind });
        claimed.add(callable.node.id);
      }
    }

    if (!args.includeOrphans) {
      this.logger.info("🔭 Resolved entry points", undefined, {
        total: entryPoints.length,
      });

      return { entryPoints };
    }

    for (const callable of args.callablesById.values()) {
      const callers = args.graph.callerIdsByCallee.get(callable.node.id) ?? [];

      if (!claimed.has(callable.node.id) && callers.length === 0) {
        entryPoints.push({
          callableId: callable.node.id,
          kind: "orphan-root",
        });
      }
    }

    this.logger.info("🔭 Resolved entry points", undefined, {
      total: entryPoints.length,
    });

    return { entryPoints };
  }
}
