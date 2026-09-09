// 🏷️ Types

import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";
import type {
  CommentMeasurement,
  DocumentationCommentCounter,
  LanguageCommentCounter,
} from "@codometer/languages";

/**
 * Every declared `comment`-selector custom statistic, split into the two
 * shapes `@codometer/languages` measures.
 */
export interface CommentCounters {
  documentationCounters: DocumentationCommentCounter[];
  languageCounters: LanguageCommentCounter[];
}

/** Input to the custom statistics step. */
export interface CustomizationInput {
  /**
   * Every `comment`-selector counter's own measurements, keyed by its
   * statistic's label.
   *
   * Built by measuring the counters `buildCommentCounters` returns, then
   * merging the two results back together by label — the languages package
   * measures a documentation counter and a plain-language counter through two
   * different calls, but a label belongs to exactly one custom statistic
   * either way.
   */
  commentCounts: Record<string, CommentMeasurement[]>;
  /** Every file of the target being counted over. */
  files: string[];
  statistics: ResolvedCodometerCustomStatistic[];
  /** What the TypeScript analyzer tallied, keyed by counter label. */
  symbolCounts: Record<string, number>;
}
