import { describe, expect, it } from "vitest";

import { conformetryInitGenerator } from "./generator.js";

import type { FileChange, Tree } from "@nx/devkit";

class InMemoryTree implements Tree {
  private readonly directories = new Set<string>();
  private readonly files = new Map<string, Buffer>();
  public readonly root = ".";

  private ensureDirectory(pathName: string): void {
    const segments = pathName.split("/");
    const directories: string[] = [];

    for (let index = 0; index < segments.length - 1; index += 1) {
      const directoryPath = segments.slice(0, index + 1).join("/");
      directories.push(directoryPath);
    }

    for (const directoryPath of directories) {
      this.directories.add(directoryPath);
    }
  }

  private listEntries(
    prefix: string,
    entries: Map<string, Buffer> | Set<string>,
  ): string[] {
    return [...entries.keys()]
      .filter((entryPath) => {
        return entryPath.startsWith(prefix);
      })
      .map((entryPath) => {
        return entryPath.slice(prefix.length).split("/")[0];
      })
      .filter((segment): segment is string => {
        return typeof segment === "string" && segment.length > 0;
      });
  }

  public changePermissions(pathName: string, mode: number): void {
    void pathName;
    void mode;
  }

  public children(pathName: string): string[] {
    const prefix = `${pathName}/`;

    return [
      ...new Set([
        ...this.listEntries(prefix, this.files),
        ...this.listEntries(prefix, this.directories),
      ]),
    ].toSorted();
  }

  public delete(pathName: string): void {
    this.files.delete(pathName);
    this.directories.delete(pathName);
  }

  public exists(pathName: string): boolean {
    return this.files.has(pathName) || this.directories.has(pathName);
  }

  public isDirectory(pathName: string): boolean {
    return this.directories.has(pathName);
  }

  public isFile(pathName: string): boolean {
    return this.files.has(pathName);
  }

  public listChanges(): FileChange[] {
    return [];
  }
  public read(pathName: string): Buffer | null;
  public read(pathName: string, encoding: BufferEncoding): null | string;
  public read(
    pathName: string,
    encoding?: BufferEncoding,
  ): Buffer | null | string {
    const content = this.files.get(pathName);

    if (content === undefined) {
      return null;
    }

    return encoding === undefined ? content : content.toString(encoding);
  }

  public rename(fromPathName: string, toPathName: string): void {
    const content = this.files.get(fromPathName);

    if (content !== undefined) {
      this.files.delete(fromPathName);
      this.files.set(toPathName, content);
    }

    if (this.directories.has(fromPathName)) {
      this.directories.delete(fromPathName);
      this.directories.add(toPathName);
    }

    this.ensureDirectory(toPathName);
  }

  public write(pathName: string, content: Buffer | string): void {
    this.files.set(
      pathName,
      typeof content === "string" ? Buffer.from(content) : content,
    );
    this.ensureDirectory(pathName);
  }
}

describe(conformetryInitGenerator, () => {
  it("renders an init template into the requested directory", async () => {
    const tree = new InMemoryTree();
    tree.write(
      "packages/conformetry-nx/src/generators/init/templates/conformetry.config.ts",
      'export const conformetryProjectName = "{{name}}";\n',
    );

    await conformetryInitGenerator(tree, {
      name: "demo-project",
      targetDirectoryPath: "generated",
    });

    expect(tree.read("generated/conformetry.config.ts")?.toString()).toBe(
      'export const conformetryProjectName = "demo-project";\n',
    );
  });

  it("uses the default generated directory when targetDirectoryPath is omitted", async () => {
    const tree = new InMemoryTree();
    tree.write(
      "packages/conformetry-nx/src/generators/init/templates/conformetry.config.ts",
      'export const conformetryProjectName = "{{name}}";\n',
    );

    await conformetryInitGenerator(tree, {
      name: "default-project",
    });

    expect(tree.read("generated/conformetry.config.ts")?.toString()).toBe(
      'export const conformetryProjectName = "default-project";\n',
    );
  });
});
