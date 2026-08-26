// 🧰 Utilities

/**
 * The safety net: a callable nothing calls, promoted to a root anyway.
 *
 * No decorator claims it, no lifecycle name matches, and it is not exported
 * from a barrel or a bootstrap. Without orphan promotion it would simply vanish
 * from every measurement — and so would everything below it — which is exactly
 * the failure mode a missing entry-point rule would otherwise cause silently.
 * Promoted, it shows up as an `orphan` root, which is itself worth knowing:
 * an orphan is either dead code or a rule that needs adding.
 */
export function summarizeOrphanedWork(entries: readonly string[]): number {
  return entries.length;
}
