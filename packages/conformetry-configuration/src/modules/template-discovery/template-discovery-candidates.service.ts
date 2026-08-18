import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  CANDIDATE_KEY_SEPARATOR,
  FILE_EXTENSION_PATTERN,
  GLOB_WILDCARD_CHARACTERS,
} from "./template-discovery.constants";

import type {
  InstanceCandidate,
  ResolveCandidatesArguments,
} from "./template-discovery.types";

/**
 * Expands instance glob patterns into candidates.
 *
 * The globs are the author's assertion of what was generated from a template;
 * nothing is inferred from directory names or marker files, which is what the
 * previous matcher did and what made it repo-specific.
 */
@Injectable()
export class TemplateDiscoveryCandidatesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Derives the substitutions a candidate's own location answers.
   *
   * `type` is the top-level directory the instance sits in — `packages` for
   * `packages/widgets` — because that is what a project template's own
   * `project.json` renders into its paths. Derived rather than configured for
   * the same reason the name variants are: it is a fact about where the
   * instance is, and restating it per glob is how the two drift apart. A
   * configured value still wins, which is what a workspace nesting its
   * projects deeper needs.
   */
  private deriveLocationSubstitutions(args: {
    instancePath: string;
    nameStem: string;
    workingDirectory: string;
  }): Record<string, string> {
    const [type = ""] = path
      .relative(
        args.workingDirectory,
        path.join(args.instancePath, args.nameStem),
      )
      .split(path.sep);

    // An instance at the working directory itself, or outside it, has no
    // top-level directory to answer with; the template's own default or a
    // configured value takes over rather than a nonsense one being invented.
    return type === "" || type === ".." ? {} : { type };
  }

  /**
   * Returns the literal filename suffix a pattern ends with, such as
   * `.service.ts` for `**\/*.service.ts`, or `""` when the pattern's last
   * segment holds no wildcard.
   *
   * This is what a file candidate's name is derived from: the part of the
   * filename the glob did not spell out is the name.
   */
  private resolveGlobSuffix(pattern: string): string {
    const basename = path.basename(pattern);
    const wildcardIndex = Math.max(
      ...GLOB_WILDCARD_CHARACTERS.map((character) => {
        return basename.lastIndexOf(character);
      }),
    );

    return wildcardIndex === -1 ? "" : basename.slice(wildcardIndex + 1);
  }

  /**
   * Derives the name a candidate's substitutions are built from.
   *
   * A directory is named by itself. A file is named by what remains once the
   * glob's literal suffix is removed, so `errors.service.ts` matched by
   * `*.service.ts` and `errors.service.unit.test.ts` matched by
   * `*.service.unit.test.ts` both yield `errors` — which is what collapses the
   * two into a single two-file candidate.
   */
  private resolveNameStem(args: {
    entryName: string;
    isDirectory: boolean;
    suffix: string;
  }): string {
    if (args.isDirectory) {
      return args.entryName;
    }

    if (args.suffix !== "" && args.entryName.endsWith(args.suffix)) {
      return args.entryName.slice(0, -args.suffix.length);
    }

    return args.entryName.replace(FILE_EXTENSION_PATTERN, "");
  }

  // 🌎 Public Methods

  /**
   * Expands every pattern and returns one candidate per distinct instance
   * path, name, and scope kind.
   *
   * A directory match leaves the file scope open, so the largest fitting
   * template wins. File matches for the same name are unioned into one scoped
   * candidate, so a template describing exactly those files wins instead. A
   * directory and a file candidate for the same name stay separate on purpose:
   * both run, and deduplication reports the finding from the smaller template.
   */
  public resolveCandidates(
    args: ResolveCandidatesArguments,
  ): InstanceCandidate[] {
    const fileScopesByKey = new Map<string, Set<string> | undefined>();

    for (const pattern of args.patterns) {
      const suffix = this.resolveGlobSuffix(pattern);

      for (const entry of fs.globSync(pattern, {
        cwd: args.workingDirectory,
        withFileTypes: true,
      })) {
        const isDirectory = entry.isDirectory();
        const entryPath = path.join(entry.parentPath, entry.name);
        // Always the parent, whether the glob matched a directory or a file:
        // a template that produces a folder contains that folder, so the tree
        // is laid over the folder's parent either way.
        const instancePath = entry.parentPath;
        const nameStem = this.resolveNameStem({
          entryName: entry.name,
          isDirectory,
          suffix,
        });
        const key = [
          instancePath,
          nameStem,
          isDirectory ? "directory" : "file",
        ].join(CANDIDATE_KEY_SEPARATOR);

        if (isDirectory) {
          fileScopesByKey.set(key, undefined);
          continue;
        }

        const fileScope = fileScopesByKey.get(key) ?? new Set<string>();

        fileScope.add(entryPath);
        fileScopesByKey.set(key, fileScope);
      }
    }

    return [...fileScopesByKey.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, fileScope]) => {
        const [instancePath = "", nameStem = ""] = key.split(
          CANDIDATE_KEY_SEPARATOR,
        );

        return {
          instancePath,
          ...(fileScope === undefined
            ? {}
            : { fileScope: [...fileScope].toSorted() }),
          nameStem,
          substitutions: {
            ...this.deriveLocationSubstitutions({
              instancePath,
              nameStem,
              workingDirectory: args.workingDirectory,
            }),
            ...args.substitutions,
          },
        };
      });
  }
}
