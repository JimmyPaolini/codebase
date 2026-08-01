import { describe, expect, it } from "vitest";

import { createConformetryGeneratorFactory } from "./nx-generator-factory.js";

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

describe(createConformetryGeneratorFactory, () => {
  it("renders templates into an Nx tree and returns generated file paths", async () => {
    const tree = new InMemoryTree();
    tree.write("templates/example.txt", "hello {{name}}");

    const factory = createConformetryGeneratorFactory({
      definition: {
        name: "example-generator",
        schemaPath: "schema.json",
        templateDirectoryPath: "templates",
      },
      resolveTargetDirectoryPath: () => "generated",
    });

    await factory(tree, { name: "demo" });

    expect(tree.read("generated/example.txt")?.toString()).toBe("hello demo");
  });
});
