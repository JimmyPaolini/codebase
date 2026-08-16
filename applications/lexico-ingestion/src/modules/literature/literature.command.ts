import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import prompts from "prompts";

import { LoggerService } from "@codebase/logger";

import { LiteratureService } from "./literature.service";

import type {
  LibraryEntry,
  LiteratureCommandOptions,
} from "./literature.types";

/**
 * Ingests markdown texts from `data/library` into literature entities with
 * provider-aware deduplication.
 */
@Command({
  description: "Run the literature command",
  name: "literature",
})
@Injectable()
export class LiteratureCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly helper: LiteratureService,
  ) {
    super();
    this.logger.setContext(LiteratureCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Deduplicate by provider for literature ingestion.
   */
  private deduplicateByProvider(texts: LibraryEntry[]): LibraryEntry[] {
    const priorityProviders = [
      "perseus",
      "corpus-scriptorum-ecclesiasticorum-latinorum",
      "thelatinlibrary",
      "epigraphik-datenbank-clauss-slaby",
    ];
    const textMap = new Map<string, LibraryEntry>();
    for (const text of texts) {
      const slug = [text.authorSlug, ...text.pathParts, text.textSlug].join(
        "/",
      );
      const existing = textMap.get(slug);
      if (existing) {
        const existingPriority = priorityProviders.indexOf(existing.provider);
        const newPriority = priorityProviders.indexOf(text.provider);
        if (
          newPriority !== -1 &&
          (existingPriority === -1 || newPriority < existingPriority)
        ) {
          textMap.set(slug, text);
        }
      } else {
        textMap.set(slug, text);
      }
    }
    return [...textMap.values()];
  }

  /**
   * Gets author choices used by literature ingestion.
   */
  private async getAuthorChoices(
    provider?: string,
  ): Promise<{ title: string; value: string }[]> {
    const library = await this.helper.scanLibrary();
    const filtered = provider
      ? library.filter((entry) => entry.provider === provider)
      : library;
    const authors = [
      ...new Set(filtered.map((entry) => entry.authorSlug)),
    ].toSorted();
    return authors.map((author) => ({ title: author, value: author }));
  }

  /**
   * Gets provider choices used by literature ingestion.
   */
  private async getProviderChoices(): Promise<
    { title: string; value: string }[]
  > {
    const library = await this.helper.scanLibrary();
    const providers = [
      ...new Set(library.map((entry) => entry.provider)),
    ].toSorted();
    return providers.map((provider) => ({ title: provider, value: provider }));
  }

  /**
   * Gets text choices used by literature ingestion.
   */
  private async getTextChoices(
    provider?: string,
    authorSlug?: string,
  ): Promise<{ title: string; value: string }[]> {
    const library = await this.helper.scanLibrary();
    let filtered = library;
    if (provider)
      filtered = filtered.filter((entry) => entry.provider === provider);
    if (authorSlug)
      filtered = filtered.filter((entry) => entry.authorSlug === authorSlug);

    const textSlugs = [
      ...new Set(
        filtered.map((entry) =>
          [entry.authorSlug, ...entry.pathParts, entry.textSlug].join("/"),
        ),
      ),
    ].toSorted();
    return textSlugs.map((textSlug) => ({ title: textSlug, value: textSlug }));
  }

  /**
   * Select texts to ingest for literature ingestion.
   */
  private selectTextsToIngest(args: {
    author: string | undefined;
    library: LibraryEntry[];
    provider: string | undefined;
    text: string | undefined;
  }): LibraryEntry[] {
    const { author, library, provider, text } = args;
    let filtered = library;
    if (provider)
      filtered = filtered.filter((entry) => entry.provider === provider);
    if (author)
      filtered = filtered.filter((entry) => entry.authorSlug === author);
    if (text) {
      filtered = filtered.filter(
        (entry) =>
          [entry.authorSlug, ...entry.pathParts, entry.textSlug].join("/") ===
          text,
      );
    }
    return this.deduplicateByProvider(filtered);
  }

  /**
   * Resolves the optional `--author` filter from CLI input or interactive selection.
   */
  @Option({
    description: "The author to ingest",
    flags: "-a, --author [author]",
  })
  async parseAuthor(
    author?: string,
    provider?: string,
  ): Promise<string | undefined> {
    const choices = await this.getAuthorChoices(
      typeof provider === "string" ? provider : undefined,
    );
    if (typeof author === "string" && author.trim() !== "") {
      if (choices.some((choice) => choice.value === author)) {
        return author;
      }
      throw new Error(`Author "${author}" not found in the dataset.`);
    }

    const response = (await prompts({
      choices: [{ title: "All", value: "ALL" }, ...choices],
      message: "Select the author",
      name: "author",
      type: "autocomplete",
    })) as { author: string };

    if (response.author === "ALL" || typeof response.author !== "string") {
      return undefined;
    }

    return response.author;
  }

  /**
   * Resolves the optional `--provider` filter from CLI input or interactive selection.
   */
  @Option({
    description: "The provider to ingest from",
    flags: "-p, --provider [provider]",
  })
  async parseProvider(provider?: string): Promise<string | undefined> {
    const choices = await this.getProviderChoices();
    if (typeof provider === "string" && provider.trim() !== "") {
      if (choices.some((choice) => choice.value === provider)) {
        return provider;
      }
      throw new Error(`Provider "${provider}" not found in the dataset.`);
    }

    const response = (await prompts({
      choices: [{ title: "All", value: "ALL" }, ...choices],
      message: "Select the provider",
      name: "provider",
      type: "autocomplete",
    })) as { provider: string };

    if (response.provider === "ALL" || typeof response.provider !== "string") {
      return undefined;
    }

    return response.provider;
  }

  /**
   * Resolves the optional `--text` filter from CLI input or interactive selection.
   */
  @Option({
    description: "The specific text to ingest",
    flags: "-t, --text [text]",
  })
  async parseText(
    text?: string,
    provider?: string,
    authorSlug?: string,
  ): Promise<string | undefined> {
    const choices = await this.getTextChoices(
      typeof provider === "string" ? provider : undefined,
      typeof authorSlug === "string" ? authorSlug : undefined,
    );
    if (typeof text === "string" && text.trim() !== "") {
      if (choices.some((choice) => choice.value === text)) {
        return text;
      }
      throw new Error(`Text "${text}" not found in the dataset.`);
    }

    const response = (await prompts({
      choices: [{ title: "All", value: "ALL" }, ...choices],
      message: "Select the text",
      name: "text",
      type: "autocomplete",
    })) as { text: string };

    if (response.text === "ALL" || typeof response.text !== "string") {
      return undefined;
    }

    return response.text;
  }

  // 🌎 Public Methods

  /**
   * Runs literature ingestion for the selected provider/author/text scope.
   */
  async run(
    _arguments: string[],
    options: LiteratureCommandOptions,
  ): Promise<void> {
    this.logger.log(`📚 Starting literature ingestion...`);
    this.logger.log(`⚙️ Parsed command options`, undefined, { options });
    const startTime = performance.now();
    const library = await this.helper.scanLibrary();
    if (library.length === 0) {
      this.logger.warn(`📚 Missing texts in the data/library directory`);
      return;
    }
    const provider = await this.parseProvider(options.provider ?? undefined);
    const author = await this.parseAuthor(
      options.author ?? undefined,
      provider,
    );
    const text = await this.parseText(
      options.text ?? undefined,
      provider,
      author,
    );
    const textsToIngest = this.selectTextsToIngest({
      author,
      library,
      provider,
      text,
    });
    this.logger.log(`📚 Selected ${textsToIngest.length} texts for ingestion.`);
    await this.helper.ingestAllAuthors(textsToIngest);
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    this.logger.log(`📚 Ingested literature`, undefined, { durationSeconds: duration });
  }
}
