import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SYNCHRONIZATION_KIND_DERIVATION } from "../synchronization/synchronization.constants";
import { SynchronizationService } from "../synchronization/synchronization.service";

import {
  BLOCK_END_MARKER,
  BLOCK_START_MARKER,
  SKILL_EXCLUSION_FILES,
} from "./skill-exclusions.constants";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type { SkillExclusionFile } from "./skill-exclusions.types";

/**
 * CLI command that syncs the installed-skill exclusion lists from
 * `skills-lock.json`.
 *
 * Installed skills are committed so a fresh worktree holds them, but they are
 * owned upstream, so anything that reaches `.agents/` has to skip them:
 * prettier scans `.`, codometer scans `--directory .`, and GitHub Linguist
 * reads every committed file. Each of the three lists one skill per line rather
 * than excluding `.agents/skills/` wholesale, so this repository's own skills in
 * the same directory keep being formatted, measured, and attributed.
 *
 * Generating them is what keeps the three in step with the lockfile. A skill
 * `skills update` adds is committed but invisible to all three until someone
 * adds it, and nothing else would notice — the symptom is a silently reformatted
 * upstream file, a badge counting somebody else's code, or a language bar
 * dominated by a vendored bundle.
 */
@Command({
  description: "Run the skill-exclusions command",
  name: "skill-exclusions",
})
@Injectable()
export class SkillExclusionsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(SkillExclusionsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  /**
   * A derivation: the three lists are generated from `skills-lock.json`, and
   * drift is the author of a lockfile change not having regenerated them — hers
   * to fix in the same change, so it is checked on the pull request.
   */
  readonly synchronizationKind = SYNCHRONIZATION_KIND_DERIVATION;

  readonly synchronizationLabel = "skill-exclusions";

  // 🔏 Private Methods

  /** Every file whose generated block differs from what the lockfile implies. */
  private findStaleFiles(skillNames: string[]): string[] {
    return SKILL_EXCLUSION_FILES.filter((file) => {
      const { generatedContent } = this.readExclusionFile(file);

      return (
        generatedContent.trim() !== this.renderBlock(file, skillNames).trim()
      );
    }).map((file) => file.filePath);
  }

  /** Splits one exclusion file around its generated block. */
  private readExclusionFile(file: SkillExclusionFile): {
    afterMarker: string;
    beforeMarker: string;
    generatedContent: string;
  } {
    const content = readFileSync(
      path.join(process.cwd(), file.filePath),
      "utf8",
    );
    const startIndex = content.indexOf(BLOCK_START_MARKER);
    const endIndex = content.indexOf(BLOCK_END_MARKER);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error(
        `Markers not found in ${file.filePath}. Expected to find "${BLOCK_START_MARKER}" and "${BLOCK_END_MARKER}"`,
      );
    }

    const contentStart = startIndex + BLOCK_START_MARKER.length;

    return {
      afterMarker: content.slice(endIndex),
      beforeMarker: content.slice(0, contentStart),
      generatedContent: content.slice(contentStart, endIndex),
    };
  }

  /** Reads the skill names the lockfile declares, sorted for a stable block. */
  private readSkillNames(): string[] {
    const lockfilePath = path.join(process.cwd(), "skills-lock.json");
    const { skills = {} } = JSON.parse(
      readFileSync(lockfilePath, "utf8"),
    ) as Record<"skills", Record<string, unknown> | undefined>;

    return Object.keys(skills).toSorted((left, right) =>
      left.localeCompare(right),
    );
  }

  /** Renders one file's entries, one skill per line in that file's syntax. */
  private renderBlock(file: SkillExclusionFile, skillNames: string[]): string {
    return skillNames
      .map((skillName) => file.renderEntry(skillName))
      .join("\n");
  }

  /** Rewrites every file's generated block. */
  private writeSync(skillNames: string[]): void {
    for (const file of SKILL_EXCLUSION_FILES) {
      const { afterMarker, beforeMarker } = this.readExclusionFile(file);
      const block = this.renderBlock(file, skillNames);

      writeFileSync(
        path.join(process.cwd(), file.filePath),
        `${beforeMarker}\n${block}\n${afterMarker}`,
        "utf8",
      );
    }

    this.logger.log("🧩 Updated the skill exclusion lists", undefined, {
      files: SKILL_EXCLUSION_FILES.map((file) => file.filePath),
      skills: skillNames.length,
    });
  }

  // 🌎 Public Methods

  /** Runs the skill-exclusions sync command in check or write mode. */
  public async run(passedParameters: string[]): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes the exclusion lists and reports success without exiting. */
  public async synchronize(mode: SynchronizationMode): Promise<boolean> {
    // Nothing here is asynchronous; the interface is, because other
    // synchronizers load configuration.
    await Promise.resolve();

    try {
      const skillNames = this.readSkillNames();

      if (mode === "write") {
        this.writeSync(skillNames);
        return true;
      }

      const staleFiles = this.findStaleFiles(skillNames);

      if (staleFiles.length > 0) {
        this.logger.log(
          "🧩 Detected out-of-sync skill exclusion lists",
          undefined,
          {
            files: staleFiles,
            hint: "Run 'nx run synchronization:synchronize:write' to sync",
            skills: skillNames.length,
          },
        );
        return false;
      }

      this.logger.log("🧩 Verified the skill exclusion lists", undefined, {
        skills: skillNames.length,
      });
      return true;
    } catch (error) {
      this.logger.error(
        "💥 Failed synchronizing the skill exclusion lists",
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
