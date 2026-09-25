/* cspell:words FULLTEXT */

import {
  AdjectivalForm,
  AdverbForm,
  FiniteVerbForm,
  type Form,
  GerundForm,
  InfinitiveForm,
  NominalForm,
  ParticipleForm,
  SupineForm,
} from "@codebase/lexico-entities";

import {
  ENCLITIC_FALSE_POSITIVES,
  ENCLITIC_SUFFIXES,
  SCORE_TRANSLATION_FULLTEXT,
} from "./search.constants";

import type { LexemeSearchResult } from "./search.entities";
import type { EncliticDecompositionResult } from "./search.types";

/**
 * Calculates search relevance score for English translation text matching.
 */
export function calculateEnglishMatchScore(
  translationText: string,
  cleanQuery: string,
): number {
  const text = translationText.toLowerCase();
  if (text === cleanQuery) {
    return 1;
  }
  if (text.startsWith(cleanQuery)) {
    return 0.8;
  }
  return SCORE_TRANSLATION_FULLTEXT;
}

/**
 * Decomposes possible Latin enclitic suffixes (-que, -ve, -ne) from a query string.
 */
export function decomposeEnclitic(
  rawQuery: string,
): EncliticDecompositionResult {
  const normalized = rawQuery.trim().toLowerCase();
  if (ENCLITIC_FALSE_POSITIVES.has(normalized)) {
    return { enclitic: null, stem: normalized };
  }

  for (const suffix of ENCLITIC_SUFFIXES) {
    const minLength = suffix.length + 1;
    if (normalized.endsWith(suffix) && normalized.length > minLength) {
      return {
        enclitic: suffix,
        stem: normalized.slice(0, -suffix.length),
      };
    }
  }

  return { enclitic: null, stem: normalized };
}

/**
 * Formats grammatical and morphological description strings from a lexical Form.
 */
export function formatFormIdentifier(form: Form): null | string {
  if (form instanceof FiniteVerbForm) {
    const parts = [
      `${form.person} person`,
      form.number,
      form.tense,
      form.voice,
      form.mood,
    ];
    return parts.join(" ");
  }

  return formatDeclinedForm(form);
}

/**
 * Merges a candidate search result into a deduplication map, keeping the highest score tier.
 */
export function mergeSearchResult(
  map: Map<string, LexemeSearchResult>,
  candidate: LexemeSearchResult,
): void {
  const existing = map.get(candidate.lexeme.id);
  if (!existing) {
    map.set(candidate.lexeme.id, candidate);
    return;
  }

  if (candidate.score > existing.score) {
    const mergedIdentifiers = [
      ...new Set([...existing.identifiers, ...candidate.identifiers]),
    ];
    map.set(candidate.lexeme.id, {
      enclitic: candidate.enclitic ?? existing.enclitic ?? null,
      identifiers: mergedIdentifiers,
      lexeme: candidate.lexeme,
      score: candidate.score,
      source: candidate.source,
    });
  } else {
    existing.identifiers = [
      ...new Set([...existing.identifiers, ...candidate.identifiers]),
    ];
    if (!existing.enclitic && candidate.enclitic) {
      existing.enclitic = candidate.enclitic;
    }
  }
}

/**
 * Formats nominal, adjectival, and participial declined forms.
 */
function formatDeclinedForm(form: Form): null | string {
  if (form instanceof NominalForm) {
    return [form.case, form.number].join(" ");
  }
  if (form instanceof AdjectivalForm) {
    return [form.case, form.number, form.gender].join(" ");
  }
  if (form instanceof ParticipleForm) {
    return [form.tense, form.voice, "participle"].join(" ");
  }
  return formatNonFiniteForm(form);
}

/**
 * Formats non-finite verb and uninflected forms like infinitives, gerunds, supines, and adverbs.
 */
function formatNonFiniteForm(form: Form): null | string {
  if (form instanceof InfinitiveForm) {
    return [form.tense, form.voice, "infinitive"].join(" ");
  }
  if (form instanceof GerundForm) {
    return [form.case, "gerund"].join(" ");
  }
  if (form instanceof SupineForm) {
    return [form.case, "supine"].join(" ");
  }
  if (form instanceof AdverbForm) {
    return [form.degree, "adverb"].join(" ");
  }
  return null;
}
