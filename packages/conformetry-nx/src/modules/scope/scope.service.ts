import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  conformetryNxProjectScopeSchema,
  SCOPE_FIELD_NAME,
} from "./scope.constants";

import type { ProjectScope } from "../candidates/candidates.types";
import type { ConformetryNxProjectScope } from "./scope.types";

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
   * Returns whether a path inside a project lies within the scope's folders.
   *
   * A scope naming no directory admits the whole project, so adding tags alone
   * narrows which projects apply without also constraining where in them.
   */
  public isInScopedDirectory(args: {
    projectRoot: string;
    relativePath: string;
    scope: ConformetryNxProjectScope | undefined;
  }): boolean {
    const directories = args.scope?.directories;

    if (directories === undefined || directories.length === 0) {
      return true;
    }

    return directories.some((directory) => {
      const scopedPath = path.posix.join(args.projectRoot, directory);
      const relativePath = path.posix.relative(scopedPath, args.relativePath);

      return relativePath !== ".." && !relativePath.startsWith("../");
    });
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
