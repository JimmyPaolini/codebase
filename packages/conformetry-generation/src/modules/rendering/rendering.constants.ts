// ♟️ Constants

/**
 * Matches `{{field}}` placeholders inside template *contents*.
 *
 * The field excludes braces so the match cannot run greedily across two
 * adjacent placeholders. Note this still matches the inner `{{name}}` of a
 * triple-brace `{{{name}}}`, leaving the outer braces in place — templates
 * should not rely on Handlebars-style triple-brace escaping.
 */
export const CONTENT_PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/gu;

/**
 * Matches `__field__` placeholders inside template *paths*.
 *
 * Paths use a different syntax from contents because `{{` and `}}` are not
 * portable across filesystems.
 */
export const PATH_PLACEHOLDER_PATTERN = /__(\w+)__/gu;
