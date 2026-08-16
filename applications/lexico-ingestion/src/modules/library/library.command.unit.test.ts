import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { resetCommandTestHarness } from "../../../testing/command-harness";
import {
  setPromptsMockResponse,
  setPromptsMockResponseOnce,
} from "../../../testing/mocks";

import { LibraryCommand } from "./library.command";
import { LIBRARY_PROVIDERS_TOKEN } from "./library.constants";

import type { LibrarySourceProvider } from "./library.types";
import type { Author } from "@codebase/lexico-entities";

const { appendFileMock, mkdirMock, readdirMock } = vi.hoisted(() => ({
  appendFileMock: vi.fn<() => Promise<void>>(),
  mkdirMock: vi.fn<() => Promise<string | undefined>>(),
  readdirMock: vi.fn<() => Promise<unknown[]>>(),
}));

const { promptsMock } = vi.hoisted(() => ({
  promptsMock: vi.fn<() => Promise<Record<string, unknown>>>(),
}));

vi.mock("node:fs/promises", () => ({
  appendFile: appendFileMock,
  mkdir: mkdirMock,
  readdir: readdirMock,
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

function createProviders(): LibrarySourceProvider[] {
  return [
    {
      ingest: vi.fn<
        (options?: { author?: string; text?: string }) => Promise<Author[]>
      >(async () => await Promise.resolve([])),
      name: "perseus",
    },
    {
      ingest: vi.fn<
        (options?: { author?: string; text?: string }) => Promise<Author[]>
      >(async () => await Promise.resolve([])),
      name: "thelatinlibrary",
    },
  ];
}

describe(LibraryCommand, () => {
  let command: LibraryCommand;
  let logger: DeepMocked<LoggerService>;
  let providerPerseus: LibrarySourceProvider;
  let providers: LibrarySourceProvider[];

  beforeAll(async () => {
    providers = createProviders();
    const perseusProvider = providers.find(
      (provider) => provider.name === "perseus",
    );
    if (!perseusProvider) {
      throw new Error("Expected perseus provider");
    }

    providerPerseus = perseusProvider;

    const module = await Test.createTestingModule({
      providers: [
        LibraryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LIBRARY_PROVIDERS_TOKEN,
          useValue: providers,
        },
      ],
    }).compile();

    command = await module.resolve(LibraryCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness({ unstubGlobals: false });
    mkdirMock.mockResolvedValue(undefined);
    appendFileMock.mockResolvedValue(undefined);
    setPromptsMockResponse(promptsMock, { provider: "ALL" });

    logger.buildErrorLogEntry.mockImplementation((context, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error);
      return {
        errorMessage,
        logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
      };
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        LibraryCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LIBRARY_PROVIDERS_TOKEN,
          useValue: [],
        },
      ],
    }).compile();

    await module.resolve(LibraryCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LibraryCommand");
  });

  it.each([["perseus", "perseus"]] as const)(
    "should parse explicit provider option %s",
    async (providerInput, expectedProvider) => {
      await expect(command.parseProvider(providerInput)).resolves.toBe(
        expectedProvider,
      );
      expect(promptsMock).not.toHaveBeenCalled();
    },
  );

  it.each([["invalid", 'Provider "invalid" not found.']] as const)(
    "should throw for invalid explicit provider option %s",
    async (providerInput, expectedErrorMessage) => {
      await expect(command.parseProvider(providerInput)).rejects.toThrow(
        expectedErrorMessage,
      );
    },
  );

  it("should parse provider interactively and support all option", async () => {
    setPromptsMockResponseOnce(promptsMock, { provider: "ALL" });
    const providerAll = await command.parseProvider(undefined);

    setPromptsMockResponseOnce(promptsMock, { provider: "perseus" });
    const providerSelected = await command.parseProvider(undefined);

    expect(providerAll).toBeUndefined();
    expect(providerSelected).toBe("perseus");
  });

  it("should parse author and text explicit values without validation", async () => {
    vi.spyOn(
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      },
      "getAuthorChoices",
    ).mockResolvedValue([{ title: "vergil", value: "vergil" }]);

    vi.spyOn(
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      },
      "getTextChoices",
    ).mockResolvedValue([{ title: "vergil/aeneid", value: "vergil/aeneid" }]);

    const author = await command.parseAuthor("custom-author", "perseus");
    const text = await command.parseText(
      "custom/text",
      "perseus",
      "custom-author",
    );

    expect(author).toBe("custom-author");
    expect(text).toBe("custom/text");
  });

  it("should prompt for author when explicit author is empty", async () => {
    const getAuthorChoicesSpy = vi
      .spyOn(
        command as unknown as {
          getAuthorChoices: (
            provider?: string,
          ) => Promise<{ title: string; value: string }[]>;
        },
        "getAuthorChoices",
      )
      .mockResolvedValue([{ title: "vergil", value: "vergil" }]);
    setPromptsMockResponseOnce(promptsMock, { author: "vergil" });

    const author = await command.parseAuthor("", "perseus");

    expect(getAuthorChoicesSpy).toHaveBeenCalledWith("perseus");
    expect(author).toBe("vergil");
  });

  it("should prompt for text when explicit text is empty", async () => {
    const getTextChoicesSpy = vi
      .spyOn(
        command as unknown as {
          getTextChoices: (
            provider?: string,
            authorSlug?: string,
          ) => Promise<{ title: string; value: string }[]>;
        },
        "getTextChoices",
      )
      .mockResolvedValue([
        { title: "vergil/epic/aeneid", value: "vergil/epic/aeneid" },
      ]);
    setPromptsMockResponseOnce(promptsMock, { text: "vergil/epic/aeneid" });

    const text = await command.parseText("", "perseus", "vergil");

    expect(getTextChoicesSpy).toHaveBeenCalledWith("perseus", "vergil");
    expect(text).toBe("vergil/epic/aeneid");
  });

  it("should normalize non-string provider parameter for parseAuthor", async () => {
    const getAuthorChoicesSpy = vi
      .spyOn(
        command as unknown as {
          getAuthorChoices: (
            provider?: string,
          ) => Promise<{ title: string; value: string }[]>;
        },
        "getAuthorChoices",
      )
      .mockResolvedValue([]);

    setPromptsMockResponseOnce(promptsMock, { author: "ALL" });

    await (
      command as unknown as {
        parseAuthor: (
          author?: string,
          provider?: unknown,
        ) => Promise<string | undefined>;
      }
    ).parseAuthor(undefined, { invalid: true });

    expect(getAuthorChoicesSpy).toHaveBeenCalledWith(undefined);
  });

  it("should parse author and text interactively", async () => {
    vi.spyOn(
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      },
      "getAuthorChoices",
    ).mockResolvedValue([{ title: "vergil", value: "vergil" }]);

    vi.spyOn(
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      },
      "getTextChoices",
    ).mockResolvedValue([{ title: "vergil/aeneid", value: "vergil/aeneid" }]);

    setPromptsMockResponseOnce(promptsMock, { author: "ALL" });
    const authorAll = await command.parseAuthor(undefined, "perseus");

    setPromptsMockResponseOnce(promptsMock, { author: "vergil" });
    const authorSelected = await command.parseAuthor(undefined, "perseus");

    setPromptsMockResponseOnce(promptsMock, { text: "ALL" });
    const textAll = await command.parseText(undefined, "perseus", "vergil");

    setPromptsMockResponseOnce(promptsMock, { text: "vergil/aeneid" });
    const textSelected = await command.parseText(
      undefined,
      "perseus",
      "vergil",
    );

    expect(authorAll).toBeUndefined();
    expect(authorSelected).toBe("vergil");
    expect(textAll).toBeUndefined();
    expect(textSelected).toBe("vergil/aeneid");
  });

  it("should return undefined when interactive author response is not a string", async () => {
    vi.spyOn(
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      },
      "getAuthorChoices",
    ).mockResolvedValue([{ title: "vergil", value: "vergil" }]);

    setPromptsMockResponseOnce(promptsMock, { author: 123 });

    const parsed = await command.parseAuthor(undefined, "perseus");

    expect(parsed).toBeUndefined();
  });

  it("should return undefined when interactive provider response is not a string", async () => {
    setPromptsMockResponseOnce(promptsMock, { provider: 123 });

    const parsed = await command.parseProvider(undefined);

    expect(parsed).toBeUndefined();
  });

  it("should return undefined when interactive text response is not a string", async () => {
    vi.spyOn(
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      },
      "getTextChoices",
    ).mockResolvedValue([{ title: "vergil/aeneid", value: "vergil/aeneid" }]);

    setPromptsMockResponseOnce(promptsMock, { text: 123 });

    const parsed = await command.parseText(undefined, "perseus", "vergil");

    expect(parsed).toBeUndefined();
  });

  it("should normalize non-string provider and author parameters for parseText", async () => {
    const getTextChoicesSpy = vi
      .spyOn(
        command as unknown as {
          getTextChoices: (
            provider?: string,
            authorSlug?: string,
          ) => Promise<{ title: string; value: string }[]>;
        },
        "getTextChoices",
      )
      .mockResolvedValue([]);

    setPromptsMockResponseOnce(promptsMock, { text: "ALL" });

    await (
      command as unknown as {
        parseText: (
          text?: string,
          provider?: unknown,
          authorSlug?: unknown,
        ) => Promise<string | undefined>;
      }
    ).parseText(undefined, { invalid: true }, 42);

    expect(getTextChoicesSpy).toHaveBeenCalledWith(undefined, undefined);
  });

  it("should build ingest parameters with filtering", () => {
    const result = (
      command as unknown as {
        buildIngestParameters: (
          author: string | undefined,
          providerName: string | undefined,
          text: string | undefined,
        ) => {
          filteredProviders: LibrarySourceProvider[];
          ingestOptions: { author?: string; text?: string };
        };
      }
    ).buildIngestParameters("vergil", "perseus", "vergil/aeneid");

    expect(result.filteredProviders).toHaveLength(1);
    expect(result.filteredProviders[0]?.name).toBe("perseus");
    expect(result.ingestOptions).toStrictEqual({
      author: "vergil",
      text: "vergil/aeneid",
    });
  });

  it("should build ingest parameters without optional filters", () => {
    const result = (
      command as unknown as {
        buildIngestParameters: (
          author: string | undefined,
          providerName: string | undefined,
          text: string | undefined,
        ) => {
          filteredProviders: LibrarySourceProvider[];
          ingestOptions: { author?: string; text?: string };
        };
      }
    ).buildIngestParameters(undefined, undefined, undefined);

    expect(result.filteredProviders).toHaveLength(2);
    expect(result.ingestOptions).toStrictEqual({});
  });

  it("should build provider choices sorted by provider name", () => {
    const choices = (
      command as unknown as {
        getProviderChoices: () => { title: string; value: string }[];
      }
    ).getProviderChoices();

    expect(choices).toStrictEqual([
      { title: "perseus", value: "perseus" },
      { title: "thelatinlibrary", value: "thelatinlibrary" },
    ]);
  });

  it("should derive unique sorted author choices with provider filter", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: [],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "cicero",
        fullPath: "b",
        pathParts: [],
        provider: "perseus",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
      {
        authorSlug: "vergil",
        fullPath: "c",
        pathParts: [],
        provider: "thelatinlibrary",
        textSlug: "eclogues",
        title: "Eclogues",
      },
    ]);

    const choices = await (
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getAuthorChoices("perseus");

    expect(choices).toStrictEqual([
      { title: "cicero", value: "cicero" },
      { title: "vergil", value: "vergil" },
    ]);
  });

  it("should derive unique sorted author choices without provider filter", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: [],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "b",
        pathParts: [],
        provider: "thelatinlibrary",
        textSlug: "eclogues",
        title: "Eclogues",
      },
      {
        authorSlug: "cicero",
        fullPath: "c",
        pathParts: [],
        provider: "perseus",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
    ]);

    const choices = await (
      command as unknown as {
        getAuthorChoices: (
          provider?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getAuthorChoices();

    expect(choices).toStrictEqual([
      { title: "cicero", value: "cicero" },
      { title: "vergil", value: "vergil" },
    ]);
  });

  it("should derive text choices filtered by provider and author", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "b",
        pathParts: ["minor"],
        provider: "perseus",
        textSlug: "culex",
        title: "Culex",
      },
      {
        authorSlug: "cicero",
        fullPath: "c",
        pathParts: ["oratory"],
        provider: "perseus",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
    ]);

    const choices = await (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices("perseus", "vergil");

    expect(choices).toStrictEqual([
      { title: "vergil/epic/aeneid", value: "vergil/epic/aeneid" },
      { title: "vergil/minor/culex", value: "vergil/minor/culex" },
    ]);
  });

  it("should derive text choices without provider or author filters", async () => {
    vi.spyOn(
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      },
      "scanLibrary",
    ).mockResolvedValue([
      {
        authorSlug: "vergil",
        fullPath: "a",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "cicero",
        fullPath: "b",
        pathParts: ["oratory"],
        provider: "thelatinlibrary",
        textSlug: "de-oratore",
        title: "De Oratore",
      },
    ]);

    const choices = await (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices();

    expect(choices).toStrictEqual([
      {
        title: "cicero/oratory/de-oratore",
        value: "cicero/oratory/de-oratore",
      },
      { title: "vergil/epic/aeneid", value: "vergil/epic/aeneid" },
    ]);
  });

  it("should parse ingest options by delegating provider, author, and text parsing", async () => {
    vi.spyOn(command, "parseProvider").mockResolvedValueOnce("perseus");
    vi.spyOn(command, "parseAuthor").mockResolvedValueOnce("vergil");
    vi.spyOn(command, "parseText").mockResolvedValueOnce("vergil/aeneid");

    const parsed = await (
      command as unknown as {
        parseIngestOptions: (options: {
          author?: null | string;
          provider?: null | string;
          text?: null | string;
        }) => Promise<{
          author: string | undefined;
          providerName: string | undefined;
          text: string | undefined;
        }>;
      }
    ).parseIngestOptions({
      author: "vergil",
      provider: "perseus",
      text: "vergil/aeneid",
    });

    expect(parsed).toStrictEqual({
      author: "vergil",
      providerName: "perseus",
      text: "vergil/aeneid",
    });
  });

  it("should parse ingest options by normalizing null values to undefined", async () => {
    const parseProviderSpy = vi
      .spyOn(command, "parseProvider")
      .mockResolvedValueOnce(undefined);
    const parseAuthorSpy = vi
      .spyOn(command, "parseAuthor")
      .mockResolvedValueOnce(undefined);
    const parseTextSpy = vi
      .spyOn(command, "parseText")
      .mockResolvedValueOnce(undefined);

    const parsed = await (
      command as unknown as {
        parseIngestOptions: (options: {
          author?: null | string;
          provider?: null | string;
          text?: null | string;
        }) => Promise<{
          author: string | undefined;
          providerName: string | undefined;
          text: string | undefined;
        }>;
      }
    ).parseIngestOptions({
      author: null,
      provider: null,
      text: null,
    });

    expect(parseProviderSpy).toHaveBeenCalledWith(undefined);
    expect(parseAuthorSpy).toHaveBeenCalledWith(undefined, undefined);
    expect(parseTextSpy).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(parsed).toStrictEqual({
      author: undefined,
      providerName: undefined,
      text: undefined,
    });
  });

  it("should process provider and log completion on success", async () => {
    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: { author: "vergil" },
      provider: providerPerseus,
      total: 2,
    });

    expect(providerPerseus.ingest).toHaveBeenCalledWith({ author: "vergil" });
    expect(logger.log).toHaveBeenCalledWith(
      "🏛️ Completed ingestion for provider: perseus (50.00%, 1/2)",
    );
  });

  it("should process provider and append log on failure", async () => {
    const failingProvider = {
      ingest: vi
        .fn<
          (options?: { author?: string; text?: string }) => Promise<Author[]>
        >()
        .mockImplementation(async () => {
          await Promise.resolve();
          throw new Error("provider failed");
        }),
      name: "failing-provider",
    } satisfies LibrarySourceProvider;

    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: {},
      provider: failingProvider,
      total: 1,
    });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(appendFileMock).toHaveBeenCalledTimes(1);
  });

  it("should use provider error message when stack is empty", async () => {
    const failingProvider = {
      ingest: vi
        .fn<
          (options?: { author?: string; text?: string }) => Promise<Author[]>
        >()
        .mockImplementation(async () => {
          await Promise.resolve();
          const providerError = new Error("provider message fallback");
          providerError.stack = "";
          throw providerError;
        }),
      name: "message-provider",
    } satisfies LibrarySourceProvider;

    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: {},
      provider: failingProvider,
      total: 1,
    });

    expect(appendFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("provider message fallback"),
    );
  });

  it("should process provider failures and append error logs", async () => {
    const failingProvider = {
      ingest: vi
        .fn<
          (options?: { author?: string; text?: string }) => Promise<Author[]>
        >()
        .mockRejectedValue("provider failed"),
      name: "string-provider",
    } satisfies LibrarySourceProvider;

    await (
      command as unknown as {
        processProvider: (args: {
          current: number;
          ingestOptions: { author?: string; text?: string };
          provider: LibrarySourceProvider;
          total: number;
        }) => Promise<void>;
      }
    ).processProvider({
      current: 1,
      ingestOptions: {},
      provider: failingProvider,
      total: 1,
    });

    expect(logger.error).toHaveBeenCalledWith(
      "🔌 Failed running provider string-provider",
      undefined,
    );
    expect(appendFileMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("provider failed"),
    );
  });

  it("should push text entries with derived slug and title", () => {
    const texts: {
      authorSlug: string;
      fullPath: string;
      pathParts: string[];
      provider: string;
      textSlug: string;
      title: string;
    }[] = [];

    (
      command as unknown as {
        pushTextEntry: (args: {
          authorSlug: string;
          currentPathParts: string[];
          directory: string;
          entry: {
            isDirectory: () => boolean;
            isFile: () => boolean;
            name: string;
          };
          providerName: string;
          texts: {
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[];
        }) => void;
      }
    ).pushTextEntry({
      authorSlug: "vergil",
      currentPathParts: ["epic"],
      directory: "/tmp/perseus/vergil/epic",
      entry: {
        isDirectory: () => false,
        isFile: () => true,
        name: "aeneid-book-1.md",
      },
      providerName: "perseus",
      texts,
    });

    expect(texts).toStrictEqual([
      expect.objectContaining({
        authorSlug: "vergil",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid-book-1",
        title: "Aeneid Book 1",
      }),
    ]);
  });

  it("should run with parsed options and process filtered providers", async () => {
    vi.spyOn(
      command as unknown as {
        parseIngestOptions: (options: {
          author?: null | string;
          provider?: null | string;
          text?: null | string;
        }) => Promise<{
          author: string | undefined;
          providerName: string | undefined;
          text: string | undefined;
        }>;
      },
      "parseIngestOptions",
    ).mockResolvedValue({
      author: "vergil",
      providerName: "perseus",
      text: undefined,
    });

    const processProviderSpy = vi
      .spyOn(
        command as unknown as {
          processProvider: (args: {
            current: number;
            ingestOptions: { author?: string; text?: string };
            provider: LibrarySourceProvider;
            total: number;
          }) => Promise<void>;
        },
        "processProvider",
      )
      .mockResolvedValue(undefined);

    await command.run([], {});

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    expect(processProviderSpy).toHaveBeenCalledTimes(1);
    expect(processProviderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        current: 1,
        total: 1,
      }),
    );
  });

  it("should skip undefined provider entries in run iteration", async () => {
    vi.spyOn(
      command as unknown as {
        parseIngestOptions: (options: {
          author?: null | string;
          provider?: null | string;
          text?: null | string;
        }) => Promise<{
          author: string | undefined;
          providerName: string | undefined;
          text: string | undefined;
        }>;
      },
      "parseIngestOptions",
    ).mockResolvedValue({
      author: undefined,
      providerName: undefined,
      text: undefined,
    });

    vi.spyOn(
      command as unknown as {
        buildIngestParameters: (
          author: string | undefined,
          providerName: string | undefined,
          text: string | undefined,
        ) => {
          filteredProviders: (LibrarySourceProvider | undefined)[];
          ingestOptions: { author?: string; text?: string };
        };
      },
      "buildIngestParameters",
    ).mockReturnValue({
      filteredProviders: [providerPerseus, undefined],
      ingestOptions: {},
    });

    const processProviderSpy = vi
      .spyOn(
        command as unknown as {
          processProvider: (args: {
            current: number;
            ingestOptions: { author?: string; text?: string };
            provider: LibrarySourceProvider;
            total: number;
          }) => Promise<void>;
        },
        "processProvider",
      )
      .mockResolvedValue(undefined);

    await command.run([], {});

    expect(processProviderSpy).toHaveBeenCalledTimes(1);
    expect(processProviderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        current: 1,
        provider: providerPerseus,
        total: 2,
      }),
    );
  });

  it("should scan library recursively and collect markdown files", async () => {
    const createDirent = (args: {
      isDirectory: boolean;
      name: string;
    }): {
      isDirectory: () => boolean;
      isFile: () => boolean;
      name: string;
    } => ({
      isDirectory: () => args.isDirectory,
      isFile: () => !args.isDirectory,
      name: args.name,
    });

    readdirMock
      .mockResolvedValueOnce([
        createDirent({ isDirectory: true, name: "perseus" }),
      ] as unknown[])
      .mockResolvedValueOnce([
        createDirent({ isDirectory: true, name: "vergil" }),
      ] as unknown[])
      .mockResolvedValueOnce([
        createDirent({ isDirectory: true, name: "epic" }),
        createDirent({ isDirectory: false, name: "ignored.txt" }),
      ] as unknown[])
      .mockResolvedValueOnce([
        createDirent({ isDirectory: false, name: "aeneid.md" }),
        createDirent({ isDirectory: false, name: "notes.txt" }),
      ] as unknown[]);

    const result = await (
      command as unknown as {
        scanLibrary: () => Promise<
          {
            authorSlug: string;
            fullPath: string;
            pathParts: string[];
            provider: string;
            textSlug: string;
            title: string;
          }[]
        >;
      }
    ).scanLibrary();

    expect(result).toHaveLength(1);
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        authorSlug: "vergil",
        pathParts: ["epic"],
        provider: "perseus",
        textSlug: "aeneid",
      }),
    );
  });

  it("should ignore non-directory providers when scanning library root", async () => {
    const createDirent = (args: {
      isDirectory: boolean;
      name: string;
    }): {
      isDirectory: () => boolean;
      isFile: () => boolean;
      name: string;
    } => ({
      isDirectory: () => args.isDirectory,
      isFile: () => !args.isDirectory,
      name: args.name,
    });

    readdirMock
      .mockResolvedValueOnce([
        createDirent({ isDirectory: false, name: "README.md" }),
      ] as unknown[])
      .mockResolvedValueOnce([] as unknown[]);

    const scanLibraryProviderSpy = vi
      .spyOn(
        command as unknown as {
          scanLibraryProvider: (
            dataDirectory: string,
            providerName: string,
            texts: unknown[],
          ) => Promise<void>;
        },
        "scanLibraryProvider",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        scanLibrary: () => Promise<unknown[]>;
      }
    ).scanLibrary();

    expect(scanLibraryProviderSpy).not.toHaveBeenCalled();
  });

  it("should return empty list when root library directory cannot be read", async () => {
    readdirMock.mockRejectedValueOnce(new Error("missing directory"));

    const result = await (
      command as unknown as {
        scanLibrary: () => Promise<unknown[]>;
      }
    ).scanLibrary();

    expect(result).toStrictEqual([]);
  });

  it("should skip non-directory authors when scanning provider directory", async () => {
    const createDirent = (args: {
      isDirectory: boolean;
      name: string;
    }): {
      isDirectory: () => boolean;
      isFile: () => boolean;
      name: string;
    } => ({
      isDirectory: () => args.isDirectory,
      isFile: () => !args.isDirectory,
      name: args.name,
    });

    readdirMock.mockReset();
    readdirMock.mockResolvedValueOnce([
      createDirent({ isDirectory: false, name: "README.md" }),
      createDirent({ isDirectory: true, name: "vergil" }),
    ] as unknown[]);

    const scanLibraryAuthorSpy = vi
      .spyOn(
        command as unknown as {
          scanLibraryAuthor: (args: {
            authorSlug: string;
            dataDirectory: string;
            providerName: string;
            texts: unknown[];
          }) => Promise<void>;
        },
        "scanLibraryAuthor",
      )
      .mockResolvedValue(undefined);

    await (
      command as unknown as {
        scanLibraryProvider: (
          dataDirectory: string,
          providerName: string,
          texts: unknown[],
        ) => Promise<void>;
      }
    ).scanLibraryProvider("/tmp/data", "perseus", []);

    expect(scanLibraryAuthorSpy).toHaveBeenCalledTimes(1);
    expect(scanLibraryAuthorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        authorSlug: "vergil",
        providerName: "perseus",
      }),
    );
  });

  it("creates output directory when missing", () => {
    const previousWorkingDirectory = process.cwd();
    const temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "library-command-"),
    );

    try {
      process.chdir(temporaryDirectory);

      const logger: DeepMocked<LoggerService> = createMock<LoggerService>();
      const command = new LibraryCommand(logger, []);

      expect(command).toBeDefined();
      expect(existsSync(path.join(temporaryDirectory, "output"))).toBe(true);
    } finally {
      process.chdir(previousWorkingDirectory);
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("initializes when output directory already exists", () => {
    const previousWorkingDirectory = process.cwd();
    const temporaryDirectory = mkdtempSync(
      path.join(os.tmpdir(), "library-command-"),
    );
    const outputDirectory = path.join(temporaryDirectory, "output");

    try {
      mkdirSync(outputDirectory, { recursive: true });
      process.chdir(temporaryDirectory);

      const logger: DeepMocked<LoggerService> = createMock<LoggerService>();
      const command = new LibraryCommand(logger, []);

      expect(command).toBeDefined();
      expect(existsSync(outputDirectory)).toBe(true);
    } finally {
      process.chdir(previousWorkingDirectory);
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
