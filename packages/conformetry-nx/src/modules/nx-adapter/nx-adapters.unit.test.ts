import { describe, expect, it } from "vitest";

import { NxFileSystemAdapter } from "./nx-file-system-adapter.service";
import { NxFormatterAdapter } from "./nx-formatter-adapter.service";
import { NxPathMatcher } from "./nx-path-matcher.service";
import { NxTemplateRenderer } from "./nx-template-renderer.service";

import type { FileChange, Tree } from "@nx/devkit";

class InMemoryTree implements Tree {
  private readonly directories = new Set<string>();
  private readonly files = new Map<string, Buffer>();
  public readonly root = ".";

  private ensureDirectory(pathName: string): void {
    const segments = pathName.split("/");

    for (let index = 0; index < segments.length - 1; index += 1) {
      const directoryPath = segments.slice(0, index + 1).join("/");
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
      if (this.directories.has(pathName)) {
        throw new Error("Directories cannot be read as files");
      }

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

class GhostChildTree extends InMemoryTree {
  public override children(pathName: string): string[] {
    const baseChildren = super.children(pathName);
    if (pathName === "templates") {
      return [...baseChildren, "ghost-directory"];
    }

    return baseChildren;
  }
}

class StringReadTree extends InMemoryTree {
  public override read(pathName: string): Buffer | null;
  public override read(
    pathName: string,
    encoding: BufferEncoding,
  ): null | string;
  public override read(
    pathName: string,
    encoding?: BufferEncoding,
  ): Buffer | null | string {
    if (pathName === "plain.txt") {
      return "plain-string";
    }

    if (encoding === undefined) {
      return super.read(pathName);
    }

    return super.read(pathName, encoding);
  }
}

describe("nx adapters", () => {
  describe(NxPathMatcher, () => {
    it("matches basic wildcard path patterns", () => {
      const matcher = new NxPathMatcher();

      expect(matcher.match("src/index.ts", "src/*.ts")).toBe(true);
      expect(matcher.match("src/deep/index.ts", "src/*.ts")).toBe(false);
      expect(matcher.match("src/index.ts", "src/*.js")).toBe(false);
    });
  });

  describe(NxTemplateRenderer, () => {
    it("renders placeholders and keeps unresolved placeholders", () => {
      const renderer = new NxTemplateRenderer();

      expect(renderer.render("{{ name }} {{unknown}}", { name: "demo" })).toBe(
        "demo {{unknown}}",
      );
    });
  });

  describe(NxFormatterAdapter, () => {
    it("resolves formatting methods without side effects", async () => {
      const adapter = new NxFormatterAdapter();

      await expect(adapter.formatFile("file.ts")).resolves.toBeUndefined();
      await expect(
        adapter.formatFiles(["a.ts", "b.ts"]),
      ).resolves.toBeUndefined();
    });
  });

  describe(NxFileSystemAdapter, () => {
    it("reads, writes, and lists files from an Nx tree", async () => {
      const tree = new InMemoryTree();
      tree.write("templates/root.txt", "root");
      tree.write("templates/nested/file.txt", "nested");

      const adapter = new NxFileSystemAdapter(tree);

      await expect(adapter.exists("templates/root.txt")).resolves.toBe(true);
      await expect(adapter.exists("missing.txt")).resolves.toBe(false);
      await expect(adapter.readFile("templates/root.txt")).resolves.toBe(
        "root",
      );

      const entries = await adapter.listDirectory("templates");

      expect(entries).toStrictEqual([
        { isDirectory: true, name: "nested" },
        { isDirectory: false, name: "root.txt" },
      ]);

      await adapter.writeFile("generated/output.txt", "output");

      expect(tree.read("generated/output.txt", "utf8")).toBe("output");
      await expect(adapter.makeDirectory("generated")).resolves.toBeUndefined();
    });

    it("returns empty entries for missing directories and stringifies null reads", async () => {
      const tree = new InMemoryTree();
      const adapter = new NxFileSystemAdapter(tree);

      await expect(adapter.listDirectory("missing")).resolves.toStrictEqual([]);
      await expect(adapter.readFile("missing.txt")).resolves.toBe("null");
    });

    it("returns string file content without buffer conversion", async () => {
      const tree = new StringReadTree();
      tree.write("plain.txt", "buffer-value");

      const adapter = new NxFileSystemAdapter(tree);

      await expect(adapter.readFile("plain.txt")).resolves.toBe("plain-string");
    });

    it("treats missing child paths as files when tree metadata is stale", async () => {
      const tree = new GhostChildTree();
      tree.write("templates/root.txt", "root");

      const adapter = new NxFileSystemAdapter(tree);
      const entries = await adapter.listDirectory("templates");

      expect(entries).toStrictEqual(
        expect.arrayContaining([
          { isDirectory: false, name: "ghost-directory" },
        ]),
      );
    });
  });
});
