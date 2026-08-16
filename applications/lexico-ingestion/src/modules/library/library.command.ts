import { Dirent, existsSync, mkdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import _ from "lodash";
import { Command, CommandRunner, Option } from "nest-commander";
import prompts from "prompts";

import { LoggerService } from "@codebase/logger";

import { LIBRARY_PROVIDERS_TOKEN } from "./library.constants";

import type {
  LibraryCommandOptions,
  LibrarySourceProvider,
} from "./library.types";

/**
 * Runs configured library source providers and writes normalized markdown files
 * into the local `data/library` tree.
 */
@Command({
  description: "Run the library command",
  name: "library",
})
@Injectable()
export class LibraryCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @Inject(LIBRARY_PROVIDERS_TOKEN)
    private readonly providers: LibrarySourceProvider[],
  ) {
    super();
    this.logger.setContext(LibraryCommand.name);

    const outputDirectory = path.join(process.cwd(), "output");
    if (!existsSync(outputDirectory))
      mkdirSync(outputDirectory, { recursive: true });
    this.logFilePath = path.join(
      outputDirectory,
      `library-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  // 🔐 Private Fields

  private readonly logFilePath: string;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds structured data used during library provider orchestration.
   */
  private buildIngestParameters(
    author: string | undefined,
    providerName: string | undefined,
    text: string | undefined,
  ): {
    filteredProviders: LibrarySourceProvider[];
    ingestOptions: { author?: string; text?: string };
  } {
    const filteredProviders = providerName
      ? this.providers.filter((p) => p.name === providerName)
      : this.providers;
    const ingestOptions: { author?: string; text?: string } = {};
    if (author) ingestOptions.author = author;
    if (text) ingestOptions.text = text;
    return { filteredProviders, ingestOptions };
  }

  /**
   * Resolves derived values needed by library provider orchestration.
   */
  private async getAuthorChoices(
    provider?: string,
  ): Promise<{ title: string; value: string }[]> {
    const library = await this.scanLibrary();
    const filtered = provider
      ? library.filter((t) => t.provider === provider)
      : library;
    const authors = [...new Set(filtered.map((t) => t.authorSlug))].toSorted();
    return authors.map((a) => ({ title: a, value: a }));
  }

  /**
   * Resolves derived values needed by library provider orchestration.
   */
  private getProviderChoices(): { title: string; value: string }[] {
    const providers = this.providers.map((p) => p.name).toSorted();
    return providers.map((p) => ({ title: p, value: p }));
  }

  /**
   * Resolves derived values needed by library provider orchestration.
   */
  private async getTextChoices(
    provider?: string,
    authorSlug?: string,
  ): Promise<{ title: string; value: string }[]> {
    const library = await this.scanLibrary();
    let filtered = library;
    if (provider) filtered = filtered.filter((t) => t.provider === provider);
    if (authorSlug)
      filtered = filtered.filter((t) => t.authorSlug === authorSlug);

    const textSlugs = [
      ...new Set(
        filtered.map((t) =>
          [t.authorSlug, ...t.pathParts, t.textSlug].join("/"),
        ),
      ),
    ].toSorted();
    return textSlugs.map((t) => ({ title: t, value: t }));
  }

  /**
   * Parses and normalizes inputs for library provider orchestration.
   */
  private async parseIngestOptions(options: LibraryCommandOptions): Promise<{
    author: string | undefined;
    providerName: string | undefined;
    text: string | undefined;
  }> {
    const providerName = await this.parseProvider(
      options.provider ?? undefined,
    );
    const author = await this.parseAuthor(
      options.author ?? undefined,
      providerName,
    );
    const text = await this.parseText(
      options.text ?? undefined,
      providerName,
      author,
    );
    return { author, providerName, text };
  }

  /**
   * Processes one workflow step for library provider orchestration.
   */
  private async processProvider(args: {
    current: number;
    ingestOptions: { author?: string; text?: string };
    provider: LibrarySourceProvider;
    total: number;
  }): Promise<void> {
    const { current, ingestOptions, provider, total } = args;
    const providerName = provider.name;
    this.logger.log(`🏛️ Starting ingestion for provider: ${providerName}`);
    try {
      await provider.ingest(ingestOptions);

      const progressString = ` (${((current / total) * 100).toFixed(2)}%, ${current}/${total})`;
      this.logger.log(
        `🏛️ Completed ingestion for provider: ${providerName}${progressString}`,
      );
    } catch (error: unknown) {
      const { logLine } = this.logger.buildErrorLogEntry(provider.name, error);
      this.logger.error(
        `🔌 Failed running provider ${providerName}`,
        error instanceof Error ? error.stack : undefined,
      );
      await fs.appendFile(this.logFilePath, logLine);
    }
  }

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private pushTextEntry(args: {
    authorSlug: string;
    currentPathParts: string[];
    directory: string;
    entry: Dirent;
    providerName: string;
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[];
  }): void {
    const {
      authorSlug,
      currentPathParts,
      directory,
      entry,
      providerName,
      texts,
    } = args;
    texts.push({
      authorSlug,
      fullPath: path.join(directory, entry.name),
      pathParts: currentPathParts,
      provider: providerName,
      textSlug: path.basename(entry.name, ".md"),
      title: _.startCase(path.basename(entry.name, ".md")),
    });
  }

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private async scanLibrary(): Promise<
    {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[]
  > {
    const dataDirectory = path.resolve("data", "library");
    const texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[] = [];

    try {
      const providers = await fs.readdir(dataDirectory, {
        withFileTypes: true,
      });
      for (const provider of providers) {
        if (!provider.isDirectory()) continue;
        await this.scanLibraryProvider(dataDirectory, provider.name, texts);
      }
    } catch {
      // Ignore if data directory doesn't exist yet
    }
    return texts;
  }

  // 🌎 Public Methods

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private async scanLibraryAuthor(args: {
    authorSlug: string;
    dataDirectory: string;
    providerName: string;
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[];
  }): Promise<void> {
    const { authorSlug, dataDirectory, providerName, texts } = args;
    await this.walkLibraryDirectory({
      authorSlug,
      currentPathParts: [],
      directory: path.join(dataDirectory, providerName, authorSlug),
      providerName,
      texts,
    });
  }

  /**
   * Handles an internal workflow step for library provider orchestration.
   */
  private async scanLibraryProvider(
    dataDirectory: string,
    providerName: string,
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[],
  ): Promise<void> {
    const authors = await fs.readdir(path.join(dataDirectory, providerName), {
      withFileTypes: true,
    });
    for (const author of authors) {
      if (!author.isDirectory()) continue;
      await this.scanLibraryAuthor({
        authorSlug: author.name,
        dataDirectory,
        providerName,
        texts,
      });
    }
  }

  /**
   * Processes one workflow step for library provider orchestration.
   */
  private async walkLibraryDirectory(args: {
    authorSlug: string;
    currentPathParts: string[];
    directory: string;
    providerName: string;
    texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[];
  }): Promise<void> {
    const { authorSlug, currentPathParts, directory, providerName, texts } =
      args;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.walkLibraryDirectory({
          authorSlug,
          currentPathParts: [...currentPathParts, entry.name],
          directory: path.join(directory, entry.name),
          providerName,
          texts,
        });
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        this.pushTextEntry({
          authorSlug,
          currentPathParts,
          directory,
          entry,
          providerName,
          texts,
        });
      }
    }
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
      // Allow custom input in case it's not downloaded yet
      return author;
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
    const choices = this.getProviderChoices();
    if (typeof provider === "string" && provider.trim() !== "") {
      if (choices.some((choice) => choice.value === provider)) {
        return provider;
      }
      throw new Error(`Provider "${provider}" not found.`);
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
      // Allow custom input in case it's not downloaded yet
      return text;
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

  /**
   * Orchestrates provider execution with optional author/text scoping and progress logging.
   */
  async run(
    _arguments: string[],
    options: LibraryCommandOptions,
  ): Promise<void> {
    this.logger.log("📚 Starting library ingestion...");
    this.logger.log(`⚙️ Parsed command options`, undefined, { options });
    const startTime = performance.now();

    const dataPath = path.resolve("data", "library");
    await fs.mkdir(dataPath, { recursive: true });

    const { author, providerName, text } =
      await this.parseIngestOptions(options);

    const { filteredProviders, ingestOptions } = this.buildIngestParameters(
      author,
      providerName,
      text,
    );
    const total = filteredProviders.length;

    for (let current = 0; current < total; current++) {
      const provider = filteredProviders[current];
      if (provider) {
        await this.processProvider({
          current: current + 1,
          ingestOptions,
          provider,
          total,
        });
      }
    }

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    this.logger.log(`📚 Ingested library`, undefined, {
      durationSeconds: duration,
    });
  }
}
