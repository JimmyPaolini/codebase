import fs from "node:fs";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Injectable } from "@nestjs/common";

import {
  DEFAULT_PROJECT_TYPE,
  GENERATOR_TAG_PREFIX,
  PROJECT_METADATA_FILENAME,
  PYPROJECT_DESCRIPTION_PATTERN,
  PYPROJECT_FILENAME,
} from "./discovery.constants";

import type {
  ParsedProjectMetadata,
  ProjectTemplateMetadata,
} from "./discovery.types";

/**
 * Reads what a project declares about itself.
 *
 * Everything here is best-effort: a project with no `project.json`, malformed
 * JSON, or no `pyproject.toml` still validates, it just gives the matcher less
 * to work with. Discovery must never fail because metadata is missing.
 */
@Injectable()
export class DiscoveryMetadataService {
  // 🏗 Dependency Injection

  constructor(private readonly renderingService: RenderingService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an unknown value to a string array. */
  private toStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const entries: unknown[] = value;

    return entries.every((entry) => typeof entry === "string")
      ? entries.filter((entry) => typeof entry === "string")
      : undefined;
  }

  // 🌎 Public Methods

  /**
   * Builds the substitutions used to render a project's templates.
   *
   * These must match what the generator used when it created the project, or
   * validation would flag files the generator itself produced.
   */
  public buildSubstitutions(args: {
    projectMetadata: ProjectTemplateMetadata;
    projectPath: string;
    workingDirectory: string;
  }): Record<string, string> {
    const projectName = path.basename(args.projectPath);

    return {
      ...this.renderingService.buildNameSubstitutions(projectName),
      description:
        args.projectMetadata.description ??
        this.readProjectDescription(args.projectPath),
      name: projectName,
      type: this.resolveProjectType(args),
    };
  }

  /** Parses the `project.json` fields discovery cares about. */
  public parseProjectMetadata(
    projectMetadataContent: string,
  ): ParsedProjectMetadata | undefined {
    let parsed: unknown;

    try {
      parsed = JSON.parse(projectMetadataContent) as unknown;
    } catch {
      return undefined;
    }

    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const record = parsed as { sourceRoot?: unknown; tags?: unknown };
    const tags = this.toStringArray(record.tags);

    return {
      ...(typeof record.sourceRoot === "string"
        ? { sourceRoot: record.sourceRoot }
        : {}),
      ...(tags === undefined ? {} : { tags }),
    };
  }

  /** Reads a project's description from its `pyproject.toml`, if any. */
  public readProjectDescription(projectPath: string): string {
    const pyprojectPath = path.join(projectPath, PYPROJECT_FILENAME);

    if (!fs.existsSync(pyprojectPath)) {
      return "";
    }

    const match = PYPROJECT_DESCRIPTION_PATTERN.exec(
      fs.readFileSync(pyprojectPath, "utf8"),
    );

    return match?.groups?.["description"] ?? "";
  }

  /**
   * Collects everything known about a project from its own files.
   *
   * A `generator:<name>` tag is the strongest signal available and is what the
   * matcher prefers over any heuristic.
   */
  public readProjectMetadata(projectPath: string): ProjectTemplateMetadata {
    const metadata: ProjectTemplateMetadata = {
      description: this.readProjectDescription(projectPath),
    };
    const projectMetadataPath = path.join(
      projectPath,
      PROJECT_METADATA_FILENAME,
    );

    if (!fs.existsSync(projectMetadataPath)) {
      return metadata;
    }

    const record = this.parseProjectMetadata(
      fs.readFileSync(projectMetadataPath, "utf8"),
    );

    if (record === undefined) {
      return metadata;
    }

    const generatorName = this.resolveGeneratorNameFromTags(record.tags);
    const sourceRootType = this.resolveSourceRootType(record.sourceRoot);

    return {
      ...metadata,
      ...(generatorName === undefined ? {} : { generatorName }),
      ...(sourceRootType === undefined ? {} : { type: sourceRootType }),
    };
  }

  /** Extracts the generator name from a `generator:<name>` tag. */
  public resolveGeneratorNameFromTags(
    tags: string[] | undefined,
  ): string | undefined {
    const generatorTag = tags?.find((tag) => {
      return (
        tag.startsWith(GENERATOR_TAG_PREFIX) &&
        tag.slice(GENERATOR_TAG_PREFIX.length).trim().length > 0
      );
    });

    return generatorTag?.slice(GENERATOR_TAG_PREFIX.length).trim();
  }

  /**
   * Resolves a project's `type` substitution — its top-level workspace folder,
   * such as `packages` or `applications`.
   */
  public resolveProjectType(args: {
    projectMetadata: ProjectTemplateMetadata;
    projectPath: string;
    workingDirectory: string;
  }): string {
    if (args.projectMetadata.type !== undefined) {
      return args.projectMetadata.type;
    }

    const relativeSegment = path
      .relative(args.workingDirectory, args.projectPath)
      .split(path.sep)
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);

    return relativeSegment ?? DEFAULT_PROJECT_TYPE;
  }

  /** Reads the leading segment of `sourceRoot`, used as the project type. */
  public resolveSourceRootType(
    sourceRoot: string | undefined,
  ): string | undefined {
    return sourceRoot
      ?.split(/[\\/]/u)
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);
  }
}
