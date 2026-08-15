import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import prompts from "prompts";

import { Lexeme, Translation } from "@codebase/lexico-entities";
import { LoggerService } from "@codebase/logger";

import { LexemesService } from "../lexemes/lexemes.service";
import { ManualService } from "../manual/manual.service";
import { TranslationsService } from "../translations/translations.service";

import type { WiktionaryPage } from "../lexico-ingestion/lexico-ingestion.types";
import type { DictionaryCommandOptions } from "./dictionary.types";

/**
 * Ingests cached Wiktionary pages into lexemes, resolves cross-translation references,
 * and applies manual dictionary corrections.
 */
@Command({
  description: "Run the dictionary command",
  name: "dictionary",
})
@Injectable()
export class DictionaryCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly lexemesService: LexemesService,
    private readonly translationsService: TranslationsService,
    private readonly manualService: ManualService,
  ) {
    super();
    this.logger.setContext(DictionaryCommand.name);

    const outputDirectory = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDirectory))
      fs.mkdirSync(outputDirectory, { recursive: true });
    this.errorLogFilePath = path.join(
      outputDirectory,
      `dictionary-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  // 🔐 Private Fields

  private readonly dataDirectory = path.join(
    process.cwd(),
    "./data/wiktionary",
  );
  private readonly errorLogFilePath: string;
  private fileIndex: Map<string, string> | null = null;
  private readonly inProgressWords = new Set<string>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Parses and normalizes inputs for dictionary ingestion.
   */
  private escapeCapitals(word: string): string {
    return word.replaceAll(
      /[A-Z]/g,
      (character) => `_${character.toLowerCase()}`,
    );
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getLemmaChoices(): { title: string; value: string }[] {
    const dataDirectory = path.join(process.cwd(), "./data/wiktionary");
    if (!fs.existsSync(dataDirectory)) return [];

    return fs
      .readdirSync(dataDirectory)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const title = file.replace(".json", "");
        return { title, value: title };
      });
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getLemmaFileRange(
    files: string[],
    startLemma?: string,
    endLemma?: string,
  ): string[] {
    if (!startLemma && !endLemma) return files;

    const startIndex = startLemma
      ? files.findIndex((f) => f.replace(".json", "") === startLemma)
      : 0;
    const endIndex = endLemma
      ? files.findIndex((f) => f.replace(".json", "") === endLemma)
      : files.length - 1;

    const start = Math.max(0, startIndex);
    const end = endIndex === -1 ? files.length - 1 : endIndex;

    return files.slice(start, end + 1);
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getPageForLexeme(
    word: string,
    wiktionaryPage?: WiktionaryPage,
  ): WiktionaryPage {
    if (wiktionaryPage) return wiktionaryPage;

    const page = this.loadWiktionaryPageForWord(word);
    if (!page) {
      throw new Error(`File missing or unreadable for word: ${word}`);
    }
    return page;
  }

  /**
   * Resolves derived values needed by dictionary ingestion.
   */
  private getWiktionaryFilePathForWord(word: string): null | string {
    const fileWord = word.normalize("NFD").replaceAll(/[\u0300-\u036F]/gu, "");

    // Exact match
    const p = path.join(
      this.dataDirectory,
      `${this.escapeCapitals(fileWord)}.json`,
    );
    if (fs.existsSync(p)) return p;

    // Build the case-insensitive index on first miss
    if (this.fileIndex === null) {
      this.fileIndex = new Map();
      if (fs.existsSync(this.dataDirectory)) {
        for (const file of fs.readdirSync(this.dataDirectory)) {
          if (!file.endsWith(".json")) continue;
          // Reverse escapeCapitals: Remove all '_' and lowercase the string
          const normalized = file.replaceAll("_", "").toLowerCase();
          this.fileIndex.set(normalized, file);
        }
      }
    }

    const fallbackFileName = this.fileIndex.get(
      `${fileWord.toLowerCase()}.json`,
    );
    if (fallbackFileName) {
      return path.join(this.dataDirectory, fallbackFileName);
    }

    return null;
  }

  /**
   * Handles an internal workflow step for dictionary ingestion.
   */
  private async ingestTranslationReference(
    translation: Translation,
  ): Promise<void> {
    const matches = [...translation.data.matchAll(/\{\*(.+?)\*\}/g)];
    if (matches.length === 0) {
      this.logger.warn(`⚠️ No reference found in: ${translation.data}`);
      return;
    }

    const newTranslations: Translation[] = [];

    for (const match of matches) {
      await this.processTranslationMatch(match, translation, newTranslations);
    }

    if (newTranslations.length > 0) {
      await this.translationsService.saveTranslations(newTranslations);
    }

    translation.data = translation.data.replaceAll(/\{\*(.+?)\*\}/g, "").trim();
    await this.translationsService.saveTranslations([translation]);
  }

  /**
   * Loads source data required by dictionary ingestion.
   */
  private loadWiktionaryPageForWord(word: string): null | WiktionaryPage {
    const filePath = this.getWiktionaryFilePathForWord(word);
    if (!filePath) {
      this.logger.warn(`⚠️ No data file found for word: ${word}`);
      return null;
    }
    const page = this.readWiktionaryPageFromFile(filePath);
    if (!page) {
      this.logger.warn(`⚠️ No data file found for word: ${word}`);
      return null;
    }
    return page;
  }

  /**
   * Parses and normalizes inputs for dictionary ingestion.
   */
  private normalize(str: string): string {
    return str
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Processes one workflow step for dictionary ingestion.
   */
  private async processFile(
    file: string,
    current: number,
    total: number,
  ): Promise<void> {
    try {
      const filePath = path.join(this.dataDirectory, file);
      const wiktionaryPage = this.readWiktionaryPageFromFile(filePath);
      if (!wiktionaryPage) {
        throw new Error("File missing or unreadable");
      }
      await this.ingestLexeme(wiktionaryPage.word, wiktionaryPage, {
        current,
        total,
      });
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(file, error);
      this.logger.error(`❌ Failed to process ${file}: ${String(error)}`);
      fs.appendFileSync(this.errorLogFilePath, logLine);
    }
  }

  /**
   * Processes one workflow step for dictionary ingestion.
   */
  private async processTranslationMatch(
    match: RegExpMatchArray,
    translation: Translation,
    newTranslations: Translation[],
  ): Promise<void> {
    let reference = match[1] ?? "";
    if (/\(.*\)/.test(reference)) reference = reference.replace(/ ?\(.*\)/, "");

    const lexemes =
      await this.lexemesService.findLexemesByLemmaWithTranslations(
        this.normalize(reference),
      );

    const lexeme =
      lexemes.find(
        (lexemeEntry) =>
          lexemeEntry.partOfSpeech === translation.lexeme.partOfSpeech,
      ) ?? lexemes[0];

    if (!lexeme) {
      this.logger.warn(`⚠️ No lexeme found for reference: ${reference}`);
      return;
    }

    const mapped = (lexeme.translations ?? []).map(
      (t) => new Translation(t.data, translation.lexeme),
    );
    newTranslations.push(...mapped);
  }

  /**
   * Processes one workflow step for dictionary ingestion.
   */
  private async processTranslationReferences(saved: Lexeme): Promise<void> {
    const referencedWords =
      this.translationsService.extractTranslationReferences(
        saved.translations ?? [],
      );
    for (const referenceWord of referencedWords) {
      if (!this.inProgressWords.has(referenceWord)) {
        const referenceExists =
          await this.lexemesService.existsByLemma(referenceWord);
        if (!referenceExists) {
          await this.ingestLexeme(referenceWord);
        }
      }
    }

    const translations =
      await this.translationsService.findTranslationsWithReferences(saved.id);
    for (const translation of translations) {
      await this.ingestTranslationReference(translation);
    }
  }

  /**
   * Loads source data required by dictionary ingestion.
   */
  private readWiktionaryPageFromFile(filePath: string): null | WiktionaryPage {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as WiktionaryPage;
  }

  // 🌎 Public Methods

  /**
   * Iterates cached `data/wiktionary/*.json` pages within an optional lemma range
   * and ingests each file into persisted lexeme data.
   */
  async ingestAll(startLemma?: string, endLemma?: string): Promise<void> {
    if (!fs.existsSync(this.dataDirectory)) {
      this.logger.warn(
        `⚠️ Data directory not found: ${this.dataDirectory}. Please run Wikipedia dump extraction first.`,
      );
      return;
    }

    const allFiles = fs
      .readdirSync(this.dataDirectory)
      .filter((fileName) => fileName.endsWith(".json"));

    const files = this.getLemmaFileRange(allFiles, startLemma, endLemma);

    this.logger.log(`📖 Processing ${files.length} lexemes`);

    let current = 0;
    const total = files.length;

    for (const file of files) {
      current++;
      await this.processFile(file, current, total);
    }

    this.logger.log("📖 Dictionary ingestion complete");
  }

  /**
   * Ingests one lemma by parsing its Wiktionary HTML into lexemes, saving relations,
   * and recursively resolving `*reference*` translations.
   */
  async ingestLexeme(
    word: string,
    wiktionaryPage?: WiktionaryPage,
    progress?: { current: number; total: number },
  ): Promise<void> {
    this.inProgressWords.add(word);
    try {
      const page = this.getPageForLexeme(word, wiktionaryPage);

      if (!page.html) {
        throw new Error(`Missing HTML data in file for word: ${word}`);
      }

      const progressString = progress
        ? ` (${((progress.current / progress.total) * 100).toFixed(2)}%, ${progress.current}/${progress.total})`
        : "";

      this.logger.log(`📝 Ingesting lexeme "${word}"${progressString}`);
      const parsedLexemes = await this.lexemesService.parseLexemes(page);
      for (const lexeme of parsedLexemes) {
        const saved = await this.lexemesService.saveParsedLexeme(lexeme);
        if (!saved) continue;

        await this.processTranslationReferences(saved);
      }
      this.logger.log(`📝 Ingested lexeme "${word}"${progressString}`);
    } finally {
      this.inProgressWords.delete(word);
    }
  }

  /**
   * Resolves the optional end-lemma boundary, validating it against available cache files.
   */
  @Option({
    description: "The lemma to end ingestion at",
    flags: "-e, --endLemma [lemma]",
  })
  async parseEndLemma(
    endLemma?: string,
    startLemma?: null | string,
  ): Promise<string | undefined> {
    if (!endLemma) return undefined;

    const choices = this.getLemmaChoices().filter((choice) => {
      if (!startLemma) return true;
      return choice.value >= startLemma;
    });
    if (typeof endLemma === "string") {
      if (choices.some((choice) => choice.value === endLemma)) {
        return endLemma;
      }
      throw new Error(`End lemma "${endLemma}" not found in the dataset.`);
    }

    const response = (await prompts({
      choices: [{ title: "None", value: null }, ...choices],
      message: "Select the ending lemma",
      name: "endLemma",
      type: "autocomplete",
    })) as { endLemma: null | string };

    if (response.endLemma === null || typeof response.endLemma !== "string") {
      return undefined;
    }

    return response.endLemma;
  }

  /**
   * Resolves the optional start-lemma boundary, validating it against available cache files.
   */
  @Option({
    description: "The lemma to start ingestion from",
    flags: "-s, --startLemma [lemma]",
  })
  async parseStartLemma(startLemma?: string): Promise<string | undefined> {
    if (!startLemma) return undefined;

    const choices = this.getLemmaChoices();
    if (typeof startLemma === "string") {
      if (choices.some((choice) => choice.value === startLemma)) {
        return startLemma;
      }
      throw new Error(`Start lemma "${startLemma}" not found in the dataset.`);
    }

    const response = (await prompts({
      choices: [{ title: "None", value: null }, ...choices],
      message: "Select the starting lemma",
      name: "startLemma",
      type: "autocomplete",
    })) as { startLemma: null | string };

    if (
      response.startLemma === null ||
      typeof response.startLemma !== "string"
    ) {
      return undefined;
    }

    return response.startLemma;
  }

  /**
   * Runs full dictionary ingestion for the selected lemma range, then applies manual entries.
   */
  async run(
    _arguments: string[],
    options: DictionaryCommandOptions,
  ): Promise<void> {
    this.logger.log(`📖 Ingesting dictionary...`);
    this.logger.log(`⚙️ Options: ${JSON.stringify(options)}`);
    const startTime = performance.now();

    const startLemma = await this.parseStartLemma(
      options.startLemma ?? undefined,
    );
    const endLemma = await this.parseEndLemma(
      options.endLemma ?? undefined,
      startLemma,
    );

    await this.ingestAll(startLemma, endLemma);
    await this.manualService.ingestManual();

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    this.logger.log(`📖 Ingested dictionary in ${duration} seconds`);
  }
}
