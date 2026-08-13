import path from "node:path";

import { Test } from "@nestjs/testing";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectConfiguration, Tree } from "@nx/devkit";

const { getProjectsMock, promptsMock } = vi.hoisted(() => {
  return {
    getProjectsMock: vi.fn<() => Map<string, ProjectConfiguration>>(),
    promptsMock:
      vi.fn<(request: unknown) => Promise<Record<string, unknown>>>(),
  };
});

vi.mock("@nx/devkit", async (importOriginal) => {
  const importedModule = await importOriginal();
  const actual =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...actual,
    getProjects: getProjectsMock,
  };
});

vi.mock("prompts", () => ({
  default: promptsMock,
}));

import { ResolverService } from "./resolver.service";

interface ModulePromptRequest {
  validate: (
    value: string,
    values: { module: string | undefined },
    prompt: unknown,
  ) => string | true;
}

interface NamePromptRequest {
  validate: (
    value: string,
    values: { name: string | undefined },
    prompt: unknown,
  ) => string | true;
}

interface ProjectPromptRequest {
  validate: (
    value: string,
    values: { project: string | undefined },
    prompt: unknown,
  ) => string | true;
}

interface TypePromptRequest {
  validate: (
    value: string,
    values: { type: string | undefined },
    prompt: unknown,
  ) => string | true;
}

function createTreeWithChildren(entries: string[]): Tree {
  const tree = createTreeWithEmptyWorkspace();
  vi.spyOn(tree, "children").mockReturnValue(entries);
  return tree;
}

function createTreeWithExists(exists: boolean): Tree {
  const tree = createTreeWithEmptyWorkspace();
  vi.spyOn(tree, "exists").mockReturnValue(exists);
  return tree;
}

function isModulePromptRequest(value: unknown): value is ModulePromptRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const maybeValidate = (value as { validate?: unknown }).validate;
  return typeof maybeValidate === "function";
}

function isNamePromptRequest(value: unknown): value is NamePromptRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const maybeValidate = (value as { validate?: unknown }).validate;
  return typeof maybeValidate === "function";
}

function isProjectPromptRequest(value: unknown): value is ProjectPromptRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const maybeValidate = (value as { validate?: unknown }).validate;
  return typeof maybeValidate === "function";
}

function isTypePromptRequest(value: unknown): value is TypePromptRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const maybeValidate = (value as { validate?: unknown }).validate;
  return typeof maybeValidate === "function";
}

describe(ResolverService, () => {
  let service: ResolverService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ResolverService],
    }).compile();

    service = await module.resolve(ResolverService);
  });

  beforeEach(() => {
    getProjectsMock.mockClear();
    promptsMock.mockClear();

    service = new ResolverService();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns direct kebab-case name values", async () => {
    await expect(
      service.resolveName({
        message: "Name",
        value: "alpha-module",
      }),
    ).resolves.toBe("alpha-module");

    expect(promptsMock).not.toHaveBeenCalled();
  });

  it("rejects direct non-kebab-case name values", async () => {
    await expect(
      service.resolveName({
        message: "Name",
        value: "AlphaModule",
      }),
    ).rejects.toThrow("Name must be in kebab-case");
  });

  it("resolves prompted name values", async () => {
    promptsMock.mockResolvedValueOnce({
      name: "prompted-module",
    });

    await expect(
      service.resolveName({
        message: "Name",
        value: undefined,
      }),
    ).resolves.toBe("prompted-module");
  });

  it("validates prompted name input", async () => {
    promptsMock.mockImplementationOnce(async (request: unknown) => {
      if (!isNamePromptRequest(request)) {
        throw new TypeError("Expected prompt validate function");
      }

      const promptValidate = request.validate;

      expect(promptValidate("", { name: undefined }, request)).toBe(
        "Name is required",
      );
      expect(
        promptValidate("PromptedModule", { name: undefined }, request),
      ).toBe("Name must be in kebab-case");
      expect(
        promptValidate("prompted-module", { name: undefined }, request),
      ).toBe(true);

      return await Promise.resolve({ name: "prompted-module" });
    });

    await expect(
      service.resolveName({
        message: "Name",
        value: undefined,
      }),
    ).resolves.toBe("prompted-module");
  });

  it("rejects invalid prompted name values", async () => {
    promptsMock.mockResolvedValueOnce({ name: "" });

    await expect(
      service.resolveName({
        message: "Name",
        value: undefined,
      }),
    ).rejects.toThrow("Name is required");

    promptsMock.mockResolvedValueOnce({ name: "PromptedModule" });

    await expect(
      service.resolveName({
        message: "Name",
        value: undefined,
      }),
    ).rejects.toThrow("Name must be in kebab-case");
  });

  it("returns direct project values", async () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app", tags: ["framework:nestjs"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    await expect(
      service.resolveProject({
        message: "Project",
        tag: "framework:nestjs",
        tree,
        value: "my-app",
      }),
    ).resolves.toBe("my-app");

    expect(promptsMock).not.toHaveBeenCalled();
  });

  it("rejects direct invalid project values", async () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app", tags: ["framework:nestjs"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    await expect(
      service.resolveProject({
        message: "Project",
        tag: "framework:nestjs",
        tree,
        value: "missing-project",
      }),
    ).rejects.toThrow(
      'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
    );
  });

  it("resolves prompted project values", async () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app", tags: ["framework:nestjs"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    promptsMock.mockResolvedValueOnce({
      project: "my-app",
    });

    await expect(
      service.resolveProject({
        message: "Project",
        tag: "framework:nestjs",
        tree,
        value: undefined,
      }),
    ).resolves.toBe("my-app");
  });

  it("validates prompted project input", async () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app", tags: ["framework:nestjs"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    promptsMock.mockImplementationOnce(async (request: unknown) => {
      if (!isProjectPromptRequest(request)) {
        throw new TypeError("Expected prompt validate function");
      }

      const promptValidate = request.validate;

      expect(promptValidate("", { project: undefined }, request)).toBe(
        "Project is required",
      );
      expect(
        promptValidate("missing-project", { project: undefined }, request),
      ).toBe(
        'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
      );
      expect(promptValidate("my-app", { project: undefined }, request)).toBe(
        true,
      );

      return await Promise.resolve({ project: "my-app" });
    });

    await expect(
      service.resolveProject({
        message: "Project",
        tag: "framework:nestjs",
        tree,
        value: undefined,
      }),
    ).resolves.toBe("my-app");
  });

  it("rejects invalid prompted project values", async () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app", tags: ["framework:nestjs"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    promptsMock.mockResolvedValueOnce({ project: "" });

    await expect(
      service.resolveProject({
        message: "Project",
        tag: "framework:nestjs",
        tree,
        value: undefined,
      }),
    ).rejects.toThrow("Project is required");

    promptsMock.mockResolvedValueOnce({ project: "missing-project" });

    await expect(
      service.resolveProject({
        message: "Project",
        tag: "framework:nestjs",
        tree,
        value: undefined,
      }),
    ).rejects.toThrow(
      'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
    );
  });

  it("returns direct module values", async () => {
    const directorySpy = vi
      .spyOn(service, "resolveProjectDirectoryPath")
      .mockReturnValue("applications/my-app/src/modules");

    const tree = createTreeWithEmptyWorkspace();
    vi.spyOn(tree, "children").mockImplementation((directoryPath) => {
      if (directoryPath === "applications/my-app/src/modules") {
        return ["alpha", "beta"];
      }

      return ["content"];
    });

    await expect(
      service.resolveModule({
        message: "Module",
        project: "my-app",
        tree,
        value: "alpha",
      }),
    ).resolves.toBe("alpha");

    expect(promptsMock).not.toHaveBeenCalled();

    directorySpy.mockRestore();
  });

  it("rejects direct invalid module values", async () => {
    const directorySpy = vi
      .spyOn(service, "resolveProjectDirectoryPath")
      .mockReturnValue("applications/my-app/src/modules");

    const tree = createTreeWithEmptyWorkspace();
    vi.spyOn(tree, "children").mockImplementation((directoryPath) => {
      if (directoryPath === "applications/my-app/src/modules") {
        return ["alpha", "beta"];
      }

      return ["content"];
    });

    await expect(
      service.resolveModule({
        message: "Module",
        project: "my-app",
        tree,
        value: "missing-module",
      }),
    ).rejects.toThrow(
      'Module "missing-module" does not exist in project "my-app". Available modules: alpha, beta',
    );

    directorySpy.mockRestore();
  });

  it("resolves prompted module values", async () => {
    const directorySpy = vi
      .spyOn(service, "resolveProjectDirectoryPath")
      .mockReturnValue("applications/my-app/src/modules");

    const tree = createTreeWithEmptyWorkspace();
    vi.spyOn(tree, "children").mockImplementation((directoryPath) => {
      if (directoryPath === "applications/my-app/src/modules") {
        return ["alpha", "beta"];
      }

      return ["content"];
    });

    promptsMock.mockResolvedValueOnce({ module: "beta" });

    await expect(
      service.resolveModule({
        message: "Module",
        project: "my-app",
        tree,
        value: undefined,
      }),
    ).resolves.toBe("beta");

    directorySpy.mockRestore();
  });

  it("validates prompted module input", async () => {
    const directorySpy = vi
      .spyOn(service, "resolveProjectDirectoryPath")
      .mockReturnValue("applications/my-app/src/modules");

    const tree = createTreeWithEmptyWorkspace();
    vi.spyOn(tree, "children").mockImplementation((directoryPath) => {
      if (directoryPath === "applications/my-app/src/modules") {
        return ["alpha", "beta"];
      }

      return ["content"];
    });

    promptsMock.mockImplementationOnce(async (request: unknown) => {
      if (!isModulePromptRequest(request)) {
        throw new TypeError("Expected prompt validate function");
      }

      const promptValidate = request.validate;

      expect(promptValidate("", { module: undefined }, request)).toBe(
        "Module is required",
      );
      expect(
        promptValidate("missing-module", { module: undefined }, request),
      ).toBe(
        'Module "missing-module" does not exist in project "my-app". Available modules: alpha, beta',
      );
      expect(promptValidate("alpha", { module: undefined }, request)).toBe(
        true,
      );

      return await Promise.resolve({ module: "alpha" });
    });

    await expect(
      service.resolveModule({
        message: "Module",
        project: "my-app",
        tree,
        value: undefined,
      }),
    ).resolves.toBe("alpha");

    directorySpy.mockRestore();
  });

  it("rejects invalid prompted module values", async () => {
    const directorySpy = vi
      .spyOn(service, "resolveProjectDirectoryPath")
      .mockReturnValue("applications/my-app/src/modules");

    const tree = createTreeWithEmptyWorkspace();
    vi.spyOn(tree, "children").mockImplementation((directoryPath) => {
      if (directoryPath === "applications/my-app/src/modules") {
        return ["alpha", "beta"];
      }

      return ["content"];
    });

    promptsMock.mockResolvedValueOnce({ module: "" });

    await expect(
      service.resolveModule({
        message: "Module",
        project: "my-app",
        tree,
        value: undefined,
      }),
    ).rejects.toThrow("Module is required");

    promptsMock.mockResolvedValueOnce({ module: "missing-module" });

    await expect(
      service.resolveModule({
        message: "Module",
        project: "my-app",
        tree,
        value: undefined,
      }),
    ).rejects.toThrow(
      'Module "missing-module" does not exist in project "my-app". Available modules: alpha, beta',
    );

    directorySpy.mockRestore();
  });

  it("returns direct type values", async () => {
    await expect(
      service.resolveType({
        choices: ["applications", "packages", "tools"],
        message: "Type",
        value: "applications",
      }),
    ).resolves.toBe("applications");

    expect(promptsMock).not.toHaveBeenCalled();
  });

  it("rejects direct invalid type values", async () => {
    await expect(
      service.resolveType({
        choices: ["applications", "packages", "tools"],
        message: "Type",
        value: "invalid-root",
      }),
    ).rejects.toThrow(
      'Type "invalid-root" is not valid. Allowed values: applications, packages, tools',
    );
  });

  it("resolves prompted type values", async () => {
    promptsMock.mockResolvedValueOnce({ type: "tools" });

    await expect(
      service.resolveType({
        choices: ["applications", "packages", "tools"],
        message: "Type",
        value: undefined,
      }),
    ).resolves.toBe("tools");
  });

  it("validates prompted type input", async () => {
    promptsMock.mockImplementationOnce(async (request: unknown) => {
      if (!isTypePromptRequest(request)) {
        throw new TypeError("Expected prompt validate function");
      }

      const promptValidate = request.validate;

      expect(promptValidate("", { type: undefined }, request)).toBe(
        "Type is required",
      );
      expect(promptValidate("invalid-root", { type: undefined }, request)).toBe(
        'Type "invalid-root" is not valid. Allowed values: applications, packages, tools',
      );
      expect(promptValidate("applications", { type: undefined }, request)).toBe(
        true,
      );

      return await Promise.resolve({ type: "applications" });
    });

    await expect(
      service.resolveType({
        choices: ["applications", "packages", "tools"],
        message: "Type",
        value: undefined,
      }),
    ).resolves.toBe("applications");
  });

  it("rejects invalid prompted type values", async () => {
    promptsMock.mockResolvedValueOnce({ type: "" });

    await expect(
      service.resolveType({
        choices: ["applications", "packages", "tools"],
        message: "Type",
        value: undefined,
      }),
    ).rejects.toThrow("Type is required");

    promptsMock.mockResolvedValueOnce({ type: "invalid-root" });

    await expect(
      service.resolveType({
        choices: ["applications", "packages", "tools"],
        message: "Type",
        value: undefined,
      }),
    ).rejects.toThrow(
      'Type "invalid-root" is not valid. Allowed values: applications, packages, tools',
    );
  });

  it("throws when no non-empty modules exist", async () => {
    vi.spyOn(service, "resolveProjectDirectoryPath").mockReturnValue(
      "applications/app/src/modules",
    );

    const tree = createTreeWithChildren([]);

    await expect(
      service.resolveModule({
        message: "Module",
        project: "app",
        tree,
        value: undefined,
      }),
    ).rejects.toThrow(
      'No modules found in project "app". Create a module first before generating service files.',
    );
  });

  it("returns sorted projects by tag", () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["alpha", { root: "applications/alpha", tags: ["framework:nest"] }],
        ["beta", { root: "applications/beta", tags: ["framework:other"] }],
        ["gamma", { root: "applications/gamma", tags: ["framework:nest"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    expect(
      service.getProjectsByTag({
        tag: "framework:nest",
        tree,
      }),
    ).toStrictEqual(["alpha", "gamma"]);
  });

  it("throws when no projects match the tag", () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["beta", { root: "applications/beta", tags: ["framework:other"] }],
      ]),
    );

    const tree = createTreeWithEmptyWorkspace();

    expect(() => {
      service.getProjectsByTag({
        tag: "framework:nest",
        tree,
      });
    }).toThrow('No projects with tag "framework:nest" found in the workspace');
  });

  it("resolves project directory paths when configuration and directory exist", () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app" }],
      ]),
    );

    const tree = createTreeWithExists(true);

    expect(
      service.resolveProjectDirectoryPath(tree, "my-app", "src/modules"),
    ).toBe(path.join("applications/my-app", "src/modules"));
  });

  it("throws when project has no root or source root", () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([["my-app", { root: "" }]]),
    );

    const tree = createTreeWithExists(true);

    expect(() => {
      service.resolveProjectDirectoryPath(tree, "my-app", "src/modules");
    }).toThrow('Project "my-app" has no root directory configured');
  });

  it("throws when resolved project directory does not exist", () => {
    getProjectsMock.mockReturnValue(
      new Map<string, ProjectConfiguration>([
        ["my-app", { root: "applications/my-app" }],
      ]),
    );

    const tree = createTreeWithExists(false);

    expect(() => {
      service.resolveProjectDirectoryPath(tree, "my-app", "src/modules");
    }).toThrow(
      'Directory "applications/my-app/src/modules" does not exist in project "my-app"',
    );
  });
});
