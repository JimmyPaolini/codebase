import { createMock } from "@golevelup/ts-vitest";
import { describe, expect, it, vi } from "vitest";

import { TokenWordDataLoader } from "./token-word-loader.service";

import type { LiteratureService } from "./literature.service";
import type { Token, Word } from "@codebase/lexico-entities";

describe("token word data loader suite", () => {
  it("loads a single token word mapping", async () => {
    expect.hasAssertions();

    const word = { data: "amo", id: "word-1" } as Word;

    const token = { data: "amo", id: "token-1", word } as Token;

    const tokenNoWord = { data: "et", id: "token-2" } as Token;

    const mockLiteratureService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<LiteratureService["findTokensByIds"]>()
        .mockImplementation(async (ids) => {
          await Promise.resolve();
          const result: Token[] = [];
          if (ids.includes("token-1")) {
            result.push(token);
          }
          if (ids.includes("token-2")) {
            result.push(tokenNoWord);
          }
          return result;
        }),
    });

    const loader = new TokenWordDataLoader(mockLiteratureService);

    await expect(loader.loadTokenWord("token-1")).resolves.toBe(word);
    await expect(loader.loadTokenWord("token-2")).resolves.toBeNull();
    await expect(loader.loadTokenWord("token-missing")).resolves.toBeNull();

    await expect(loader.byTokenId.load("token-1")).resolves.toBe(word);
    await expect(loader.byTokenId.loadMany(["token-1"])).resolves.toStrictEqual(
      [word],
    );
  });

  it("loads token word mappings for a batch of token IDs", async () => {
    expect.hasAssertions();

    const word1 = { data: "amo", id: "word-1" } as Word;

    const token1 = { data: "amo", id: "token-1", word: word1 } as Token;

    const token2 = { data: "et", id: "token-2" } as Token;

    const tokenWithoutWord = { id: "token-4" } as Token;

    const mockLiteratureService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<LiteratureService["findTokensByIds"]>()
        .mockResolvedValue([token1, token2, tokenWithoutWord]),
    });

    const loader = new TokenWordDataLoader(mockLiteratureService);

    await expect(loader.loadTokenWords([])).resolves.toStrictEqual([]);
    await expect(
      loader.loadTokenWords(["token-1", "token-2", "token-3", "token-4"]),
    ).resolves.toStrictEqual([word1, null, null, null]);
  });
});
