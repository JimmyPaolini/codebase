// 🚨 Errors

/**
 * Raised when a named anchor block is not present in a Markdown file.
 *
 * `AnchorsService.checkAnchor` and `replaceAnchorContent` still raise this for
 * any missing anchor — they are low-level primitives that know nothing about
 * auto-creation. `DeliveryService` is what decides whether this ever reaches a
 * caller: it only lets it surface when the file itself does not exist at all
 * (a project with no `README.md` is a genuinely more serious problem), and
 * intercepts a missing-but-creatable anchor before calling into these
 * primitives — auto-creating the `## 🕸️ Codependix` section on `--write` (see
 * `AnchorsService.insertAnchorSection`) and reporting it as stale on
 * `--check` instead.
 */
export class AnchorNotFoundError extends Error {
  constructor(anchorName: string, filePath: string) {
    super(`Anchor "${anchorName}" not found in ${filePath}`);
    this.name = "AnchorNotFoundError";
  }
}
