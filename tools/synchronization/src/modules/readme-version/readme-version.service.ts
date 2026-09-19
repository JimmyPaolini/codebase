import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  PACKAGE_JSON_PATH,
  PACKAGE_JSON_SCHEMA,
  README_TITLE_REGEXP,
  ROOT_README_PATH,
} from "./readme-version.constants";

/** Service for inspecting and updating the version in root README.md title. */
@Injectable()
export class ReadmeVersionService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Formats the expected README title line for a given version. */
  public formatTitle(version: string): string {
    return `# Codebase v${version}`;
  }

  /** Checks if README title matches the package.json version. */
  public isSynchronized(workspaceRoot: string): boolean {
    const version = this.readPackageVersion(workspaceRoot);
    const readmeContent = this.readReadme(workspaceRoot);
    const expectedTitle = this.formatTitle(version);

    return readmeContent.startsWith(expectedTitle);
  }

  /** Reads and parses the version string from root package.json. */
  public readPackageVersion(workspaceRoot: string): string {
    const filePath = path.join(workspaceRoot, PACKAGE_JSON_PATH);
    const content = readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(content);
    const validated = PACKAGE_JSON_SCHEMA.parse(parsed);
    return validated.version;
  }

  /** Reads the root README.md content. */
  public readReadme(workspaceRoot: string): string {
    const filePath = path.join(workspaceRoot, ROOT_README_PATH);
    return readFileSync(filePath, "utf8");
  }

  /** Synchronizes the root README.md title with the package.json version. */
  public writeReadmeVersion(workspaceRoot: string): void {
    const version = this.readPackageVersion(workspaceRoot);
    const readmeContent = this.readReadme(workspaceRoot);
    const expectedTitle = this.formatTitle(version);

    if (readmeContent.startsWith(expectedTitle)) {
      return;
    }

    const updatedContent = readmeContent.replace(
      README_TITLE_REGEXP,
      expectedTitle,
    );
    const filePath = path.join(workspaceRoot, ROOT_README_PATH);
    writeFileSync(filePath, updatedContent, "utf8");
  }
}
