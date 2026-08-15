import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  conformetryNxProjectScopeSchema,
  PROJECT_ROOT_PATTERN,
  SCOPE_FIELD_NAME,
} from "./scope.constants";

import type { ProjectScope } from "../candidates/candidates.types";
import type {
  ConformetryNxGeneratorDefinition,
  ConformetryNxProjectScope,
} from "./scope.types";
import type { ConformetryInstanceGroup } from "@conformetry/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Answers which projects and folders a generator is confined to.
 *
 * The one place that turns a configured scope into a decision, so generation,
 * validation, and the emitted schema cannot disagree about where a template
 * belongs — the prompt offering a project that validation would then reject is
 * exactly the inconsistency this prevents.
 */
@Injectable()
/* v8 ignore stop */
export class ScopeService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Fails when a generator declares both a scope and instance globs.
   *
   * The two answer the same question, and letting both stand made the narrower
   * silently win: a scope excluding a project the globs reached simply stopped
   * validating it, and validation cannot notice candidates that were never
   * offered. Refusing the ambiguity is the only way that stays visible.
   */
  public assertScopeAndInstancesExclusive(
    definition: ConformetryNxGeneratorDefinition,
  ): void {
    if (
      this.readScope(definition) !== undefined &&
      (definition.instances ?? []).length > 0
    ) {
      throw new Error(
        `Generator ${definition.name} declares both a scope and instances. A scope derives its own instance globs from the workspace's projects, so remove one: keep instances for globs a scope cannot express, and keep the scope otherwise.`,
      );
    }
  }

  /**
   * Expands a scope into the instance globs it stands for, for one project.
   *
   * The globs are workspace-relative, exactly as hand-written ones are, so
   * everything downstream — discovery, validation, layout inference — cannot
   * tell a derived group from an authored one.
   *
   * A scope naming no pattern derives nothing. That is what lets a scope
   * constrain which projects a generator may be run against without also
   * claiming that its output is validated: a template nobody has instances of
   * yet still wants the first half.
   */
  public deriveInstanceGroups(args: {
    project: ProjectScope;
    scope: ConformetryNxProjectScope | undefined;
  }): ConformetryInstanceGroup[] {
    const patterns = args.scope?.patterns;

    if (
      patterns === undefined ||
      patterns.length === 0 ||
      !this.matchesProject({ project: args.project, scope: args.scope })
    ) {
      return [];
    }

    return [
      {
        patterns: patterns.map((pattern) => {
          return path.posix.join(args.project.root, pattern);
        }),
        // The workspace directory a project sits in is what this repository's
        // project templates substitute as `type`, and it is already how the
        // paths service places a new project. Derived here so a scope does not
        // have to restate per project what its root already says.
        substitutions: { type: args.project.root.split("/")[0] ?? "" },
      },
    ];
  }

  /**
   * Returns whether a generator applies to a project.
   *
   * A scope with no tags applies everywhere — tags narrow a generator, they do
   * not opt it in, so an unscoped configuration still reaches every project.
   */
  public matchesProject(args: {
    project: ProjectScope;
    scope: ConformetryNxProjectScope | undefined;
  }): boolean {
    const tags = args.scope?.tags;

    if (tags === undefined || tags.length === 0) {
      return true;
    }

    return tags.some((tag) => args.project.tags.includes(tag));
  }

  /**
   * Reads the scope off a generator, or nothing when it declares none.
   *
   * Takes the definition as `unknown` because the base package's type does not
   * know this field exists; a malformed scope is treated as absent rather than
   * thrown on, so one bad entry cannot stop the project graph from building.
   */
  public readScope(definition: unknown): ConformetryNxProjectScope | undefined {
    if (typeof definition !== "object" || definition === null) {
      return undefined;
    }

    const { [SCOPE_FIELD_NAME]: scope }: { scope?: unknown } = {
      ...definition,
    };

    if (scope === undefined) {
      return undefined;
    }

    const parsed = conformetryNxProjectScopeSchema.safeParse(scope);

    return parsed.success ? parsed.data : undefined;
  }

  /**
   * The folder a scope's first pattern points at, with any glob trimmed off.
   *
   * `src/modules/*` places a new module in `src/modules`; a pattern that is
   * all glob places nothing, and layout falls back to being inferred.
   */
  public resolveScopedDirectory(
    scope: ConformetryNxProjectScope | undefined,
  ): string | undefined {
    const [pattern] = scope?.patterns ?? [];

    if (pattern === undefined || pattern === PROJECT_ROOT_PATTERN) {
      return undefined;
    }

    const segments = pattern.split("/");
    const globIndex = segments.findIndex((segment) => segment.includes("*"));
    const staticSegments =
      globIndex === -1 ? segments : segments.slice(0, globIndex);

    return staticSegments.length === 0 ? undefined : staticSegments.join("/");
  }

  /** The projects a generator's scope admits, by name and in workspace order. */
  public resolveScopedProjectNames(args: {
    projects: ProjectScope[];
    scope: ConformetryNxProjectScope | undefined;
  }): string[] {
    return args.projects
      .filter((project) => {
        return this.matchesProject({ project, scope: args.scope });
      })
      .map((project) => project.name)
      .toSorted((left, right) => left.localeCompare(right));
  }
}
