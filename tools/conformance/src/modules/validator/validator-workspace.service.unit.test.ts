import fs from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { workspaceRoot } from "@nx/devkit";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidatorWorkspaceService } from "./validator-workspace.service";

type ReaddirDirent = ReturnType<typeof fs.readdirSync>[number];
type ReaddirResult = ReturnType<typeof fs.readdirSync>;

const createMockDirent = (args: {
  isDirectory: boolean;
  name: string;
  parentPath?: string;
}): ReaddirDirent => {
  const { isDirectory, name, parentPath = "/workspace" } = args;
  const readdirDirent = Object.create({}) as ReaddirDirent;
  Object.assign(readdirDirent, {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => isDirectory,
    isFIFO: () => false,
    isFile: () => !isDirectory,
    isSocket: () => false,
    isSymbolicLink: () => false,
    name,
    parentPath,
  });
  return readdirDirent;
};

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn<(path: fs.PathLike) => boolean>(),
    readdirSync:
      vi.fn<
        (path: fs.PathLike, options: { withFileTypes: true }) => ReaddirResult
      >(),
    readFileSync: vi.fn<(path: fs.PathOrFileDescriptor) => string>(),
  },
}));

vi.mock("@nx/devkit", () => ({
  workspaceRoot: "/workspace",
}));

describe(ValidatorWorkspaceService, () => {
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);
  const mockReaddirSync = vi.mocked(fs.readdirSync);

  let service: ValidatorWorkspaceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorWorkspaceService],
    }).compile();

    service = await module.resolve(ValidatorWorkspaceService);
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [ValidatorWorkspaceService],
    }).compile();

    service = await module.resolve(ValidatorWorkspaceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns requested project names unchanged", () => {
    expect(
      service.resolveSelectedProjectNames({
        allWorkspaceProjects: [],
        requestedProjectNames: ["alpha", "beta"],
      }),
    ).toStrictEqual(["alpha", "beta"]);
  });

  it("returns requested project names even when empty", () => {
    expect(
      service.resolveSelectedProjectNames({
        allWorkspaceProjects: [
          {
            rootPath: "/workspace/applications/alpha",
            tags: ["type:application"],
          },
        ],
        requestedProjectNames: [],
      }),
    ).toStrictEqual([]);
  });

  it("resolves a project by name", () => {
    mockReadFileSync.mockImplementation((filePath) => {
      if (
        typeof filePath === "string" &&
        filePath.endsWith("applications/alpha/project.json")
      ) {
        return JSON.stringify({ name: "alpha", tags: ["type:application"] });
      }

      if (
        typeof filePath === "string" &&
        filePath.endsWith("tools/charlie/project.json")
      ) {
        return JSON.stringify({ tags: ["type:component"] });
      }

      throw new Error(`Unexpected read: ${String(filePath)}`);
    });

    const allWorkspaceProjects = [
      {
        rootPath: "/workspace/applications/alpha",
        tags: ["type:application"],
      },
      {
        rootPath: "/workspace/tools/charlie",
        tags: ["type:component"],
      },
    ];

    expect(
      service.resolveProjectByName({
        allWorkspaceProjects,
        projectName: "alpha",
      }),
    ).toStrictEqual(allWorkspaceProjects[0]);
  });

  it("throws when resolving an unknown project by name", () => {
    mockReadFileSync.mockImplementation((filePath) => {
      if (
        typeof filePath === "string" &&
        filePath.endsWith("applications/alpha/project.json")
      ) {
        return JSON.stringify({ name: "alpha", tags: ["type:application"] });
      }

      throw new Error(`Unexpected read: ${String(filePath)}`);
    });

    expect(() => {
      service.resolveProjectByName({
        allWorkspaceProjects: [
          {
            rootPath: "/workspace/applications/alpha",
            tags: ["type:application"],
          },
        ],
        projectName: "missing",
      });
    }).toThrow('Unknown project "missing"');
  });

  it("falls back to directory basename when project name is missing", () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ tags: ["type:application"] }),
    );

    expect(service.resolveProjectName("/workspace/tools/no-name-project")).toBe(
      "no-name-project",
    );
  });

  it("uses project name from project.json when present", () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ name: "project-from-config" }),
    );

    expect(service.resolveProjectName("/workspace/tools/no-name-project")).toBe(
      "project-from-config",
    );
  });

  it("returns default project names from all workspace projects", () => {
    const allWorkspaceProjects = [
      {
        rootPath: path.join(workspaceRoot, "applications/alpha"),
        tags: ["type:application"],
      },
      {
        rootPath: path.join(workspaceRoot, "packages/bravo"),
        tags: ["type:library"],
      },
      {
        rootPath: path.join(workspaceRoot, "tools/charlie"),
        tags: ["type:component"],
      },
    ];

    mockReadFileSync.mockImplementation((filePath) => {
      if (
        typeof filePath === "string" &&
        filePath.endsWith("applications/alpha/project.json")
      ) {
        return JSON.stringify({ name: "alpha" });
      }

      if (
        typeof filePath === "string" &&
        filePath.endsWith("packages/bravo/project.json")
      ) {
        return JSON.stringify({ name: "bravo" });
      }

      if (
        typeof filePath === "string" &&
        filePath.endsWith("tools/charlie/project.json")
      ) {
        return JSON.stringify({ name: "charlie" });
      }

      throw new Error(`Unexpected read: ${String(filePath)}`);
    });

    expect(
      service.resolveSelectedProjectNames({
        allWorkspaceProjects,
        requestedProjectNames: undefined,
      }),
    ).toStrictEqual(["alpha", "bravo", "charlie"]);
  });

  it("throws when no default projects are discovered", () => {
    expect(() => {
      service.resolveSelectedProjectNames({
        allWorkspaceProjects: [],
        requestedProjectNames: undefined,
      });
    }).toThrow("No default projects found in workspace");
  });

  it("parses workspace projects from standard directories", () => {
    mockExistsSync.mockImplementation((filePath) => {
      return (
        typeof filePath === "string" &&
        (filePath === "/workspace/applications" ||
          filePath === "/workspace/applications/alpha/project.json")
      );
    });
    mockReaddirSync.mockReturnValue([
      createMockDirent({ isDirectory: true, name: "alpha" }),
      createMockDirent({
        isDirectory: false,
        name: "ignored.txt",
      }),
    ]);
    mockReadFileSync.mockImplementation((filePath) => {
      if (
        typeof filePath === "string" &&
        filePath.endsWith("applications/alpha/project.json")
      ) {
        return JSON.stringify({ tags: ["type:application"] });
      }

      throw new Error(`Unexpected read: ${String(filePath)}`);
    });

    expect(service.readWorkspaceProjects()).toStrictEqual([
      {
        rootPath: "/workspace/applications/alpha",
        tags: ["type:application"],
      },
    ]);
  });

  it("defaults workspace project tags to an empty array when omitted", () => {
    mockExistsSync.mockImplementation((filePath) => {
      return (
        typeof filePath === "string" &&
        (filePath === "/workspace/applications" ||
          filePath === "/workspace/applications/alpha/project.json")
      );
    });
    mockReaddirSync.mockReturnValue([
      createMockDirent({ isDirectory: true, name: "alpha" }),
    ]);
    mockReadFileSync.mockReturnValue(JSON.stringify({}));

    expect(service.readWorkspaceProjects()).toStrictEqual([
      {
        rootPath: "/workspace/applications/alpha",
        tags: [],
      },
    ]);
  });

  it("wraps project configuration parse failures", () => {
    mockExistsSync.mockImplementation((filePath) => {
      return (
        typeof filePath === "string" &&
        (filePath === "/workspace/applications" ||
          filePath === "/workspace/applications/alpha/project.json")
      );
    });
    mockReaddirSync.mockReturnValue([
      createMockDirent({ isDirectory: true, name: "alpha" }),
    ]);
    mockReadFileSync.mockImplementation(() => {
      throw new SyntaxError("Unexpected token");
    });

    expect(() => {
      service.readWorkspaceProjects();
    }).toThrow(
      'Unable to parse project configuration at "/workspace/applications/alpha/project.json"',
    );
  });
});
