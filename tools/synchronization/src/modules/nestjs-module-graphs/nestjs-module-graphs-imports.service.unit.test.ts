import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NestjsModuleGraphsImportsService } from "./nestjs-module-graphs-imports.service";

import type { NestjsProject } from "./nestjs-module-graphs.types";

/** Entry names the mocked workspace holds, keyed by directory basename. */
const workspaceEntries = new Map<string, string[]>();

/** Entry names the mocked workspace reports as files rather than directories. */
const workspaceFileEntries = new Set<string>();

/** Paths the mocked workspace reports as existing. */
const existingPaths = new Set<string>();

/** Contents the mocked workspace returns for a read. */
const fileContents = new Map<string, string>();

vi.mock("node:fs", async (importOriginal) => {
  const importedModule = await importOriginal();
  const module =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...module,
    existsSync: vi.fn<(target: string) => boolean>((target: string) =>
      existingPaths.has(target),
    ),
    readdirSync: vi.fn<
      (target: string) => { isDirectory: () => boolean; name: string }[]
    >((target: string) =>
      (workspaceEntries.get(path.basename(target)) ?? []).map((name) => ({
        isDirectory: () => !workspaceFileEntries.has(name),
        name,
      })),
    ),
    readFileSync: vi.fn<(target: string) => string>(
      (target: string) => fileContents.get(target) ?? "{}",
    ),
  };
});

/** The project every test reads imports for. */
const project: NestjsProject = {
  absoluteRoot: "/workspace/tools/example",
  name: "example",
  rootModuleFile: undefined,
};

/** Names the packages the workspace publishes. */
const projectNamesByPackage = new Map([
  ["@codometer/configuration", "codometer-configuration"],
  ["@conformetry/configuration", "conformetry-configuration"],
  ["@conformetry/core", "conformetry-core"],
]);

describe(NestjsModuleGraphsImportsService, () => {
  let service: NestjsModuleGraphsImportsService;

  /** Gives the project a single source file with the given contents. */
  function writeSource(source: string): void {
    existingPaths.add("/workspace/tools/example/src");
    workspaceEntries.set("src", ["example.module.ts"]);
    workspaceFileEntries.add("example.module.ts");
    fileContents.set("/workspace/tools/example/src/example.module.ts", source);
  }

  /** Gives the project a manifest declaring the given dependencies. */
  function writeManifest(dependencies: Record<string, string>): void {
    existingPaths.add("/workspace/tools/example/package.json");
    fileContents.set(
      "/workspace/tools/example/package.json",
      JSON.stringify({ dependencies, name: "example" }),
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NestjsModuleGraphsImportsService],
    }).compile();

    service = await module.resolve(NestjsModuleGraphsImportsService);
  });

  beforeEach(() => {
    workspaceEntries.clear();
    workspaceFileEntries.clear();
    existingPaths.clear();
    fileContents.clear();
  });

  /** Gives the project a module file and a sibling naming modules as strings. */
  function writeModuleFolder(options: {
    moduleClass?: string;
    named: string;
  }): void {
    const { moduleClass = "export class ValidationModule {}", named } = options;

    existingPaths.add("/workspace/tools/example/src");
    existingPaths.add("/workspace/tools/example/src/validation");
    workspaceEntries.set("src", ["validation"]);
    workspaceEntries.set("validation", [
      "validation.constants.ts",
      "validation.module.ts",
    ]);
    workspaceFileEntries.add("validation.constants.ts");
    workspaceFileEntries.add("validation.module.ts");
    fileContents.set(
      "/workspace/tools/example/src/validation/validation.module.ts",
      moduleClass,
    );
    fileContents.set(
      "/workspace/tools/example/src/validation/validation.constants.ts",
      named,
    );
  }

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readProjectNamesByPackage", () => {
    it("maps a published package name to its project", () => {
      writeManifest({});

      expect(service.readProjectNamesByPackage([project]).get("example")).toBe(
        "example",
      );
    });

    it("skips a project with no manifest", () => {
      expect(service.readProjectNamesByPackage([project]).size).toBe(0);
    });
  });

  describe("readProjectImports", () => {
    it("records which project a module name was imported from", () => {
      writeSource(
        'import { ConfigurationModule } from "@conformetry/configuration";',
      );

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projectsByModule.get("ConfigurationModule")).toBe(
        "conformetry-configuration",
      );
    });

    it("reads a named-import clause the formatter has wrapped", () => {
      writeSource(
        [
          "import {",
          "  ConfigurationModule,",
          "  TemplateDiscoveryModule,",
          '} from "@conformetry/configuration";',
        ].join("\n"),
      );

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projectsByModule.get("TemplateDiscoveryModule")).toBe(
        "conformetry-configuration",
      );
    });

    it("reads through an alias to the name the package exports", () => {
      writeSource(
        'import { ConfigurationModule as Renamed } from "@conformetry/configuration";',
      );

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projectsByModule.has("ConfigurationModule")).toBe(true);
    });

    it("ignores an import that is not a module", () => {
      writeSource(
        'import { ConfigurationService } from "@conformetry/configuration";',
      );

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projectsByModule.size).toBe(0);
    });

    it("ignores a package outside the workspace", () => {
      writeSource('import { ConfigModule } from "@nestjs/config";');

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projects.size).toBe(0);
    });

    // This is what separates a dependency absent by nature from one absent by
    // accident.
    it("reports a project every import of which is a type import", () => {
      writeSource('import type { ConformetryError } from "@conformetry/core";');

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.typeOnlyProjects).toContain("conformetry-core");
    });

    it("does not report a project imported for a value as type-only", () => {
      writeSource(
        [
          'import type { ConformetryError } from "@conformetry/core";',
          'import { ErrorsModule } from "@conformetry/core";',
        ].join("\n"),
      );

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.typeOnlyProjects.size).toBe(0);
    });

    // A package reached only through `LazyModuleLoader` is never imported in
    // the source, and the manifest is the only place it is declared.
    it("counts a project the manifest declares but the source never imports", () => {
      writeManifest({ "@conformetry/core": "workspace:*" });

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projects).toContain("conformetry-core");
      expect(imports.typeOnlyProjects.size).toBe(0);
    });

    it("reads a source file nested below the source directory", () => {
      existingPaths.add("/workspace/tools/example/src");
      existingPaths.add("/workspace/tools/example/src/modules");
      workspaceEntries.set("src", ["modules"]);
      workspaceEntries.set("modules", ["nested.module.ts", "notes.md"]);
      workspaceFileEntries.add("nested.module.ts");
      workspaceFileEntries.add("notes.md");
      fileContents.set(
        "/workspace/tools/example/src/modules/nested.module.ts",
        'import { ConfigurationModule } from "@conformetry/configuration";',
      );

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projectsByModule.get("ConfigurationModule")).toBe(
        "conformetry-configuration",
      );
    });

    it("ignores an import of the project's own package", () => {
      writeSource('import { ExampleModule } from "example";');

      const imports = service.readProjectImports(
        project,
        new Map([["example", "example"]]),
      );

      expect(imports.projects.size).toBe(0);
    });

    it("reads nothing from a manifest that declares no dependencies", () => {
      existingPaths.add("/workspace/tools/example/package.json");
      fileContents.set(
        "/workspace/tools/example/package.json",
        JSON.stringify({ name: "example" }),
      );

      expect(
        service.readProjectImports(project, projectNamesByPackage).projects
          .size,
      ).toBe(0);
    });

    // A module loaded through `LazyModuleLoader` is named rather than
    // imported, so the literal is the only evidence the dependency exists.
    it("reads a module named as a string as a runtime edge", () => {
      writeModuleFolder({ named: 'moduleExport: "JsonValidatorModule",' });

      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.runtimeModuleEdges).toContainEqual({
        from: "ValidationModule",
        runtime: true,
        to: "JsonValidatorModule",
      });
    });

    it("reads no runtime edge from a file naming no module", () => {
      writeModuleFolder({ named: 'specifier: "@conformetry/json",' });

      expect(
        service.readProjectImports(project, projectNamesByPackage)
          .runtimeModuleEdges,
      ).toStrictEqual([]);
    });

    it("reads no runtime edge when no module file sits beside the literal", () => {
      writeModuleFolder({
        moduleClass: "export const nothing = 1;",
        named: 'moduleExport: "JsonValidatorModule",',
      });

      expect(
        service.readProjectImports(project, projectNamesByPackage)
          .runtimeModuleEdges,
      ).toStrictEqual([]);
    });

    it("reads nothing from a project with no source directory", () => {
      const imports = service.readProjectImports(
        project,
        projectNamesByPackage,
      );

      expect(imports.projects.size).toBe(0);
    });
  });
});
