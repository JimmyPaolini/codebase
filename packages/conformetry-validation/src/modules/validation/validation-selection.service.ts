import path from "node:path";

import { Injectable } from "@nestjs/common";

import { DiscoveryService } from "../discovery/discovery.service";

import type { WorkspaceProject } from "../discovery/discovery.types";

/**
 * Narrows a validation run to the projects and rules the caller asked for.
 *
 * `--rules` accepts both language names and generator names, because both are
 * things a user means by "only check this". They are separated here so each
 * can be applied where it belongs.
 */
@Injectable()
export class ValidationSelectionService {
  // 🏗 Dependency Injection

  constructor(private readonly discoveryService: DiscoveryService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Returns whether a selector names or contains a project. */
  private matchesProject(args: {
    project: WorkspaceProject;
    selector: string;
    workingDirectory: string;
  }): boolean {
    if (args.selector === args.project.name) {
      return true;
    }

    const normalizedSelector = this.discoveryService.normalizePath(
      path.isAbsolute(args.selector)
        ? path.relative(args.workingDirectory, args.selector)
        : args.selector,
    );

    return (
      normalizedSelector === args.project.rootPath ||
      args.project.rootPath.startsWith(`${normalizedSelector}/`)
    );
  }

  // 🌎 Public Methods

  /** Splits requested rule names into language names and everything else. */
  public partitionRuleNames(args: {
    languageNames: string[];
    ruleNames: string[] | undefined;
  }): { generatorNames: string[]; languageNames: string[] } {
    const requested = args.ruleNames ?? [];

    return {
      generatorNames: requested.filter((ruleName) => {
        return !args.languageNames.includes(ruleName);
      }),
      languageNames: requested.filter((ruleName) => {
        return args.languageNames.includes(ruleName);
      }),
    };
  }

  /**
   * Selects the projects to validate.
   *
   * With no selectors, every discovered project is validated — the default is
   * to check the whole workspace rather than nothing.
   */
  public selectProjects(args: {
    projects: WorkspaceProject[];
    selectors: string[] | undefined;
    workingDirectory: string;
  }): WorkspaceProject[] {
    const selectors = args.selectors ?? [];

    if (selectors.length === 0) {
      return args.projects;
    }

    return args.projects.filter((project) => {
      return selectors.some((selector) => {
        return this.matchesProject({
          project,
          selector,
          workingDirectory: args.workingDirectory,
        });
      });
    });
  }
}
