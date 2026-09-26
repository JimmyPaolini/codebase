/* cspell:words puella */

import { describe, expect, it, vi } from "vitest";

import {
  In,
  Lexeme,
  NominalForm,
  PrincipalPart,
  Pronunciation,
  Translation,
} from "@codebase/lexico-entities";

import { createRepositoryMock } from "../../../testing/mocks";

import { LexemesService } from "./lexemes.service";

describe("lexemes service integration suite", () => {
  it("integrates single lexeme lookup eager-loading all relations", async () => {
    expect.hasAssertions();

    const lexeme = new Lexeme();
    lexeme.id = "lex-puella";
    lexeme.lemma = "puella";
    lexeme.partOfSpeech = "noun";

    const form = new NominalForm();
    form.case = "nominative";
    form.number = "singular";
    lexeme.forms = [form];

    const part = new PrincipalPart();
    part.name = "nominative";
    part.text = ["puella"];
    lexeme.principalParts = [part];

    const pronunciation = new Pronunciation();
    pronunciation.variant = "classical";
    pronunciation.phonemic = "/puˈel.la/";
    lexeme.pronunciations = [pronunciation];

    const translation = new Translation("girl, maiden", lexeme);
    lexeme.translations = [translation];

    const mockRepo = createRepositoryMock<Lexeme>();
    vi.spyOn(mockRepo, "findOne").mockResolvedValue(lexeme);

    const service = new LexemesService(mockRepo);
    const result = await service.findById("lex-puella");

    expect(mockRepo.findOne).toHaveBeenCalledWith({
      relations: {
        forms: true,
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { id: "lex-puella" },
    });
    expect(result).toBe(lexeme);
    expect(result?.forms).toHaveLength(1);
    expect(result?.principalParts).toHaveLength(1);
    expect(result?.translations).toHaveLength(1);
  });

  it("integrates batch lexemes lookup eager-loading relations for multiple IDs", async () => {
    expect.hasAssertions();

    const lexeme1 = new Lexeme();
    lexeme1.id = "lex-1";
    lexeme1.lemma = "amo";

    const lexeme2 = new Lexeme();
    lexeme2.id = "lex-2";
    lexeme2.lemma = "puella";

    const mockRepo = createRepositoryMock<Lexeme>();
    vi.spyOn(mockRepo, "find").mockResolvedValue([lexeme1, lexeme2]);

    const service = new LexemesService(mockRepo);
    const result = await service.findByIds(["lex-1", "lex-2"]);

    expect(mockRepo.find).toHaveBeenCalledWith({
      relations: {
        forms: true,
        inflection: true,
        principalParts: true,
        pronunciations: true,
        translations: true,
      },
      where: { id: In(["lex-1", "lex-2"]) },
    });
    expect(result).toStrictEqual([lexeme1, lexeme2]);
  });
});
