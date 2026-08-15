import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { PullRequestTemplateCommand } from "./pull-request-template.command";
import {
  SYNC_PULL_REQUEST_TEMPLATE_MARKER,
  SYNC_PULL_REQUEST_TEMPLATE_TARGET_FILES,
} from "./pull-request-template.constants";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
    writeFileSync: vi.fn<(filePath: string, content: string) => void>(
      (filePath: string, content: string) => {
        fileContents.set(filePath, content);
      },
    ),
  };
});

describe(PullRequestTemplateCommand, () => {
  let command: PullRequestTemplateCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const templateFile = path.join(
    workspaceRoot,
    ".github/PULL_REQUEST_TEMPLATE.md",
  );
  const targetFiles = SYNC_PULL_REQUEST_TEMPLATE_TARGET_FILES.map((filePath) =>
    path.join(workspaceRoot, filePath),
  );

  const setSynchronizedTargets = (templateContent: string): void => {
    const wrappedTemplate = `\`\`\`markdown\n${templateContent}\n\`\`\``;

    fileContents.set(templateFile, `${templateContent}\n`);
    for (const targetFile of targetFiles) {
      fileContents.set(
        targetFile,
        [
          "# Title",
          `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-start -->`,
          wrappedTemplate,
          `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-end -->`,
          "",
        ].join("\n"),
      );
    }
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestTemplateCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(PullRequestTemplateCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        PullRequestTemplateCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "PullRequestTemplateCommand",
    );
  });

  it.each([
    {
      modeArguments: ["check"],
      scenarioName: "passes in check mode when all targets are synchronized",
    },
    {
      modeArguments: [],
      scenarioName: "defaults to check mode when no mode is provided",
    },
  ])("$scenarioName", async ({ modeArguments }) => {
    setSynchronizedTargets("## Summary\n\n- item");

    await command.run(modeArguments);

    expect(logger.log).toHaveBeenCalledWith("✅ PR template is in sync");
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("writes only out-of-sync target files in write mode", async () => {
    const templateContent = "## Summary\n\n- expected";
    const wrappedTemplate = `\`\`\`markdown\n${templateContent}\n\`\`\``;
    const firstTarget = targetFiles[0];
    const secondTarget = targetFiles[1];
    if (!firstTarget || !secondTarget) {
      throw new Error("Expected pull request template sync target files");
    }

    fileContents.set(templateFile, templateContent);
    fileContents.set(
      firstTarget,
      [
        "# First",
        `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-start -->`,
        "```markdown\n## Summary\n\n- stale\n```",
        `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-end -->`,
        "",
      ].join("\n"),
    );
    fileContents.set(
      secondTarget,
      [
        "# Second",
        `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-start -->`,
        wrappedTemplate,
        `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-end -->`,
        "",
      ].join("\n"),
    );

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(
      firstTarget,
      expect.stringContaining(wrappedTemplate),
      "utf8",
    );
    expect(logger.log).toHaveBeenCalledWith(
      `🔄 Syncing ${path.relative(workspaceRoot, firstTarget)} PR template...`,
    );
    expect(logger.log).toHaveBeenCalledWith(
      `✅ ${path.relative(workspaceRoot, firstTarget)} PR template synced`,
    );
  });

  it("logs already in sync in write mode when no updates are needed", async () => {
    const templateContent = "## Summary\n\n- item";
    const wrappedTemplate = `\`\`\`markdown\n${templateContent}\n\`\`\``;

    fileContents.set(templateFile, templateContent);
    for (const targetFile of targetFiles) {
      fileContents.set(
        targetFile,
        [
          "# Title",
          `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-start -->`,
          wrappedTemplate,
          `<!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-end -->`,
          "",
        ].join("\n"),
      );
    }

    await command.run(["write"]);

    expect(logger.log).toHaveBeenCalledWith("✅ Already in sync");
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("errors when markers are missing in check mode", async () => {
    const templateContent = "## Summary\n\n- item";
    fileContents.set(templateFile, templateContent);
    for (const targetFile of targetFiles) {
      fileContents.set(targetFile, "# Missing markers");
    }

    const processExitSpy = mockProcessExit();

    await expect(command.run(["check"])).rejects.toThrow("process.exit:1");

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining(
        `missing <!-- ${SYNC_PULL_REQUEST_TEMPLATE_MARKER}-start/end --> markers`,
      ),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "💡 Run 'nx run synchronization:start:pull-request-template-write' to sync",
    );

    processExitSpy.mockRestore();
  });

  it("errors for invalid mode", async () => {
    fileContents.set(templateFile, "template");
    for (const targetFile of targetFiles) {
      fileContents.set(targetFile, "content");
    }

    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith("❌ Invalid mode: invalid-mode");
    expect(logger.error).toHaveBeenCalledWith(
      "💡 Usage: nx run synchronization:start:pull-request-template-check (or synchronization:start:pull-request-template-write)",
    );
  });
});
