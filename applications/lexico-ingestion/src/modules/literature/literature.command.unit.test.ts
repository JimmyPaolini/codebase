import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetCommandTestHarness } from "../../../testing/command-harness";
import { setPromptsMockResponse } from "../../../testing/mocks";
import { LoggerService } from "../logger/logger.service";

import { LiteratureCommand } from "./literature.command";
import { LiteratureService } from "./literature.service";

import type { LibraryEntry } from "./literature.types";

const { promptsMock } = vi.hoisted(() => ({
  promptsMock: vi.fn<() => Promise<Record<string, unknown>>>(),
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

describe(LiteratureCommand, () => {
  let command: LiteratureCommand;
  let logger: DeepMocked<LoggerService>;

  const library: LibraryEntry[] = [
    {
      authorSlug: "ovid",
      fullPath: "/tmp/ovid/metamorphoses.md",
      pathParts: ["ovid"],
      provider: "perseus",
      textSlug: "metamorphoses",
      title: "Metamorphoses",
    },
    {
      authorSlug: "vergil",
      fullPath: "/tmp/vergil/aeneid.md",
      pathParts: ["vergil"],
      provider: "thelatinlibrary",
      textSlug: "aeneid",
      title: "Aeneid",
    },
    {
      authorSlug: "vergil",
      fullPath: "/tmp/vergil/aeneid-alt.md",
      pathParts: ["vergil"],
      provider: "perseus",
      textSlug: "aeneid",
      title: "Aeneid",
    },
  ];

  const literatureService = {
    ingestAllAuthors: vi.fn<(texts: LibraryEntry[]) => Promise<void>>(),
    scanLibrary: vi.fn<() => Promise<LibraryEntry[]>>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LiteratureService,
          useValue: literatureService,
        },
      ],
    }).compile();

    command = await module.resolve(LiteratureCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    resetCommandTestHarness({ unstubGlobals: false });
    setPromptsMockResponse(promptsMock, { provider: "ALL" });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiteratureCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    await module.resolve(LiteratureCommand);
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LiteratureCommand");
  });

  it.each([["perseus", "perseus"]] as const)(
    "should parse explicit provider option %s",
    async (providerInput, expectedProvider) => {
      literatureService.scanLibrary.mockResolvedValue(library);

      await expect(command.parseProvider(providerInput)).resolves.toBe(
        expectedProvider,
      );
      expect(promptsMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "invalid-provider",
      'Provider "invalid-provider" not found in the dataset.',
    ],
  ] as const)(
    "should throw for invalid explicit provider option %s",
    async (providerInput, expectedErrorMessage) => {
      literatureService.scanLibrary.mockResolvedValue(library);

      await expect(command.parseProvider(providerInput)).rejects.toThrow(
        expectedErrorMessage,
      );
    },
  );

  it("should return undefined when interactive provider selects all", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { provider: "ALL" });

    const provider = await command.parseProvider(undefined);

    expect(provider).toBeUndefined();
    expect(promptsMock).toHaveBeenCalledTimes(1);
  });

  it("should return undefined when provider prompt returns non-string", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { provider: 123 });

    const provider = await command.parseProvider(undefined);

    expect(provider).toBeUndefined();
  });

  it("should parse author constrained by provider", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    const author = await command.parseAuthor("ovid", "perseus");

    expect(author).toBe("ovid");
  });

  it("should return selected author from interactive prompt", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { author: "vergil" });

    const author = await command.parseAuthor(undefined, undefined);

    expect(author).toBe("vergil");
  });

  it("should return undefined when interactive author selects all", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { author: "ALL" });

    const author = await command.parseAuthor(undefined, undefined);

    expect(author).toBeUndefined();
  });

  it("should throw for invalid author in constrained provider", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    await expect(
      command.parseAuthor("ovid", "thelatinlibrary"),
    ).rejects.toThrow('Author "ovid" not found in the dataset.');
  });

  it("should parse explicit text option", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    const text = await command.parseText(
      "vergil/vergil/aeneid",
      "perseus",
      "vergil",
    );

    expect(text).toBe("vergil/vergil/aeneid");
  });

  it("should return selected text from interactive prompt", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { text: "vergil/vergil/aeneid" });

    const text = await command.parseText(undefined, "perseus", "vergil");

    expect(text).toBe("vergil/vergil/aeneid");
  });

  it("should return undefined when interactive text selects all", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { text: "ALL" });

    const text = await command.parseText(undefined, "perseus", "vergil");

    expect(text).toBeUndefined();
  });

  it("should return undefined when text prompt returns non-string", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { text: 999 });

    const text = await command.parseText(undefined, "perseus", "vergil");

    expect(text).toBeUndefined();
  });

  it("should normalize non-string provider and author arguments in parseText", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    setPromptsMockResponse(promptsMock, { text: "ALL" });

    const text = await command.parseText(
      undefined,
      123 as unknown as string,
      null as unknown as string,
    );

    expect(text).toBeUndefined();
  });

  it("should get text choices filtered by provider only", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    const getTextChoices = (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices.bind(command);

    const choices = await getTextChoices("thelatinlibrary", undefined);

    expect(choices).toStrictEqual([
      { title: "vergil/vergil/aeneid", value: "vergil/vergil/aeneid" },
    ]);
  });

  it("should get text choices filtered by author only", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    const getTextChoices = (
      command as unknown as {
        getTextChoices: (
          provider?: string,
          authorSlug?: string,
        ) => Promise<{ title: string; value: string }[]>;
      }
    ).getTextChoices.bind(command);

    const choices = await getTextChoices(undefined, "ovid");

    expect(choices).toStrictEqual([
      { title: "ovid/ovid/metamorphoses", value: "ovid/ovid/metamorphoses" },
    ]);
  });

  it("should select texts with only text filter", () => {
    const selectTextsToIngest = (
      command as unknown as {
        selectTextsToIngest: (args: {
          author: string | undefined;
          library: LibraryEntry[];
          provider: string | undefined;
          text: string | undefined;
        }) => LibraryEntry[];
      }
    ).selectTextsToIngest.bind(command);

    const selected = selectTextsToIngest({
      author: undefined,
      library,
      provider: undefined,
      text: "vergil/vergil/aeneid",
    });

    expect(selected).toHaveLength(1);
    expect(selected[0]?.textSlug).toBe("aeneid");
  });

  it("should prioritize known providers when deduplicating texts", () => {
    const deduplicateByProvider = (
      command as unknown as {
        deduplicateByProvider: (texts: LibraryEntry[]) => LibraryEntry[];
      }
    ).deduplicateByProvider.bind(command);

    const result = deduplicateByProvider([
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-unknown.md",
        pathParts: ["vergil"],
        provider: "unknown-provider",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-perseus.md",
        pathParts: ["vergil"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.provider).toBe("perseus");
  });

  it("should keep existing known provider when new provider has lower priority", () => {
    const deduplicateByProvider = (
      command as unknown as {
        deduplicateByProvider: (texts: LibraryEntry[]) => LibraryEntry[];
      }
    ).deduplicateByProvider.bind(command);

    const result = deduplicateByProvider([
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-perseus.md",
        pathParts: ["vergil"],
        provider: "perseus",
        textSlug: "aeneid",
        title: "Aeneid",
      },
      {
        authorSlug: "vergil",
        fullPath: "/tmp/vergil/aeneid-ttl.md",
        pathParts: ["vergil"],
        provider: "thelatinlibrary",
        textSlug: "aeneid",
        title: "Aeneid",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.provider).toBe("perseus");
  });

  it("should throw for invalid text option", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);

    await expect(
      command.parseText("missing/text", "perseus", "vergil"),
    ).rejects.toThrow('Text "missing/text" not found in the dataset.');
  });

  it("should run and ingest selected deduplicated texts", async () => {
    literatureService.scanLibrary.mockResolvedValue(library);
    literatureService.ingestAllAuthors.mockResolvedValue(undefined);

    const parseProviderSpy = vi
      .spyOn(command, "parseProvider")
      .mockResolvedValue("perseus");
    const parseAuthorSpy = vi
      .spyOn(command, "parseAuthor")
      .mockResolvedValue("vergil");
    const parseTextSpy = vi
      .spyOn(command, "parseText")
      .mockResolvedValue(undefined);

    await command.run([], {});

    expect(parseProviderSpy).toHaveBeenCalledWith(undefined);
    expect(parseAuthorSpy).toHaveBeenCalledWith(undefined, "perseus");
    expect(parseTextSpy).toHaveBeenCalledWith(undefined, "perseus", "vergil");

    expect(literatureService.ingestAllAuthors).toHaveBeenCalledTimes(1);

    const ingestedTexts = literatureService.ingestAllAuthors.mock.calls[0]?.[0];

    expect(ingestedTexts).toBeDefined();
    expect(ingestedTexts).toHaveLength(1);
    expect(ingestedTexts?.[0]?.provider).toBe("perseus");

    expect(logger.log).toHaveBeenCalledWith(
      "📚 Starting literature ingestion...",
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("📚 Literature ingestion complete in"),
    );
  });

  it("should stop early when library is empty", async () => {
    literatureService.scanLibrary.mockResolvedValue([]);

    await command.run([], {});

    expect(logger.warn).toHaveBeenCalledWith(
      "⚠️ No texts found in data/library directory.",
    );
    expect(literatureService.ingestAllAuthors).not.toHaveBeenCalled();
  });
});
