// ♟️ Constants

import type { RenderOptions } from "mustache";

/**
 * Mustache options used for every render.
 *
 * Escaping is disabled. Mustache HTML-escapes `{{field}}` by default, so a
 * substitution containing `&`, `<`, or `>` would be written into generated
 * source as `&amp;` and corrupt it. Passing `escape` per call leaves
 * mustache's global `escape` untouched, so nothing else in the process is
 * affected, and templates keep using `{{field}}` rather than `{{{field}}}`.
 */
export const MUSTACHE_RENDER_OPTIONS: RenderOptions = {
  escape: String,
};
