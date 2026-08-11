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
  projectMetadata: {
    name: string;
    sourceRoot: string;
    tags: string[];
  };
}): Promise<void> {
  await mkdir(args.directoryPath, { recursive: true });
  await writeFile(
    path.join(args.directoryPath, "project.json"),
    JSON.stringify(args.projectMetadata),
    "utf8",
  );
}
