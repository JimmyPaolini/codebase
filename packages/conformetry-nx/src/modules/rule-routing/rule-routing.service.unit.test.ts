import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { RuleRoutingService } from "./rule-routing.service.js";

const TEMPLATE_RULE_NAMES_BY_PROJECT_TAG = {
  "framework:nest-commander": [
    "nestjs-command-project",
    "nestjs-command-module",
    "nestjs-service-file",
    "nestjs-service-module",
  ],
} as const;

describe(RuleRoutingService, () => {
  it("routes template rules from project tags and resolves project names to paths", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
        "nestjs-command-module",
        "nestjs-service-file",
        "nestjs-service-module",
        "react-component",
      ],
      projectSelectors: ["caelundas", "lexico"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["applications/caelundas", "applications/lexico"],
      templateRuleNames: [
        "nestjs-command-project",
        "nestjs-command-module",
        "nestjs-service-file",
        "nestjs-service-module",
      ],
    });
  });

  it("filters requested template rules to rules applicable to selected projects", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
        "nestjs-service-file",
      ],
      projectSelectors: ["affirmations"],
      requestedTemplateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
      ],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["applications/affirmations"],
      templateRuleNames: ["jupyter-notebook-application"],
    });
  });

  it("passes unresolved selectors through as project paths", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: ["react-component"],
      projectSelectors: ["packages/custom-package"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["packages/custom-package"],
      templateRuleNames: [],
    });
  });

  it("preserves explicitly requested configured rules when selector metadata is unresolved", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: ["nestjs-service-module", "react-component"],
      projectSelectors: ["generated/nestjs-service-module"],
      requestedTemplateRuleNames: ["nestjs-service-module", "typescript"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["generated/nestjs-service-module"],
      templateRuleNames: ["nestjs-service-module"],
    });
  });

  it("matches project root and sourceRoot selectors to the same project", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
        "nestjs-service-file",
        "nestjs-service-module",
      ],
      projectSelectors: [
        "applications/caelundas",
        path.resolve(workspaceDirectory, "applications/lexico/src"),
      ],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["applications/caelundas", "applications/lexico"],
      templateRuleNames: [
        "nestjs-command-project",
        "nestjs-service-file",
        "nestjs-service-module",
      ],
    });
  });

  it("treats relative and dot-prefixed selectors consistently", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const relativeSelectorResult =
      ruleRoutingService.resolveTemplateRuleRouting({
        configuredTemplateRuleNames: [
          "nestjs-command-project",
          "nestjs-service-file",
        ],
        projectSelectors: ["applications/caelundas"],
        templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
        workingDirectory: workspaceDirectory,
      });
    const dotPrefixedSelectorResult =
      ruleRoutingService.resolveTemplateRuleRouting({
        configuredTemplateRuleNames: [
          "nestjs-command-project",
          "nestjs-service-file",
        ],
        projectSelectors: ["./applications/caelundas"],
        templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
        workingDirectory: workspaceDirectory,
      });

    expect(dotPrefixedSelectorResult).toStrictEqual(relativeSelectorResult);
  });

  it("filters template rules by project tags in configured order", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: [
        "nestjs-service-module",
        "nestjs-command-project",
        "jupyter-notebook-application",
      ],
      projectSelectors: ["caelundas", "lexico"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["applications/caelundas", "applications/lexico"],
      templateRuleNames: ["nestjs-service-module", "nestjs-command-project"],
    });
  });

  it("ignores generator tags that are not included in configured rule names", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ruleRoutingService = new RuleRoutingService();

    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: ["react-component"],
      projectSelectors: ["caelundas"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["applications/caelundas"],
      templateRuleNames: [],
    });
  });

  it("matches selectors with trailing slashes and absolute unresolved paths", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const unresolvedAbsoluteSelectorPath = path.resolve(
      workspaceDirectory,
      "applications/not-found",
    );
    const ruleRoutingService = new RuleRoutingService();

    const trailingSlashMatch = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: ["nestjs-command-project"],
      projectSelectors: ["applications/caelundas/"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });
    const unresolvedAbsoluteSelectorResult =
      ruleRoutingService.resolveTemplateRuleRouting({
        configuredTemplateRuleNames: ["nestjs-command-project"],
        projectSelectors: [unresolvedAbsoluteSelectorPath],
        templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
        workingDirectory: workspaceDirectory,
      });

    expect(trailingSlashMatch).toStrictEqual({
      projectPaths: ["applications/caelundas"],
      templateRuleNames: ["nestjs-command-project"],
    });
    expect(unresolvedAbsoluteSelectorResult).toStrictEqual({
      projectPaths: ["applications/not-found"],
      templateRuleNames: [],
    });
  });

  it("skips ignored folders and invalid project metadata while resolving selectors", async () => {
    const workspaceDirectory = await createWorkspaceFixture();
    const ignoredDirectoryPath = path.join(workspaceDirectory, "node_modules");
    const invalidMetadataDirectoryPath = path.join(
      workspaceDirectory,
      "applications",
      "invalid",
    );
    const missingSourceRootDirectoryPath = path.join(
      workspaceDirectory,
      "applications",
      "missing-source-root",
    );
    const nonArrayTagsDirectoryPath = path.join(
      workspaceDirectory,
      "applications",
      "non-array-tags",
    );

    await writeProjectMetadata({
      directoryPath: ignoredDirectoryPath,
      projectMetadata: {
        name: "ignored-plugin",
        sourceRoot: "node_modules/ignored-plugin/src",
        tags: ["generator:react-component"],
      },
    });
    await writeProjectMetadata({
      directoryPath: invalidMetadataDirectoryPath,
      projectMetadata: "invalid",
    });
    await writeProjectMetadata({
      directoryPath: missingSourceRootDirectoryPath,
      projectMetadata: {
        name: "missing-source-root",
        tags: ["generator:react-component"],
      },
    });
    await writeProjectMetadata({
      directoryPath: nonArrayTagsDirectoryPath,
      projectMetadata: {
        name: "non-array-tags",
        sourceRoot: "applications/non-array-tags/src",
        tags: ["generator:react-component", 42],
      },
    });
    await writeFile(
      path.join(workspaceDirectory, "applications", "README.md"),
      "# not a project",
      "utf8",
    );

    const ruleRoutingService = new RuleRoutingService();
    const result = ruleRoutingService.resolveTemplateRuleRouting({
      configuredTemplateRuleNames: ["react-component"],
      projectSelectors: ["non-array-tags", "ignored-plugin"],
      templateRuleNamesByProjectTag: TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
      workingDirectory: workspaceDirectory,
    });

    expect(result).toStrictEqual({
      projectPaths: ["applications/non-array-tags"],
      templateRuleNames: ["react-component"],
    });
  });
});

async function createWorkspaceFixture(): Promise<string> {
  const workspaceDirectory = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-rule-routing-"),
  );

  await writeProjectMetadata({
    directoryPath: path.join(workspaceDirectory, "applications", "caelundas"),
    projectMetadata: {
      name: "caelundas",
      sourceRoot: "applications/caelundas",
      tags: ["framework:nest-commander", "generator:nestjs-command-project"],
    },
  });
  await writeProjectMetadata({
    directoryPath: path.join(workspaceDirectory, "applications", "lexico"),
    projectMetadata: {
      name: "lexico",
      sourceRoot: "applications/lexico/src",
      tags: ["framework:react", "language:typescript"],
    },
  });
  await writeProjectMetadata({
    directoryPath: path.join(
      workspaceDirectory,
      "applications",
      "affirmations",
    ),
    projectMetadata: {
      name: "affirmations",
      sourceRoot: "applications/affirmations",
      tags: ["generator:jupyter-notebook-application", "language:python"],
    },
  });

  return workspaceDirectory;
}

async function writeProjectMetadata(args: {
  directoryPath: string;
  projectMetadata: unknown;
}): Promise<void> {
  await mkdir(args.directoryPath, { recursive: true });
  await writeFile(
    path.join(args.directoryPath, "project.json"),
    JSON.stringify(args.projectMetadata),
    "utf8",
  );
}
