// ♟️ Constants

/**
 * The sixteen orientation names every letter is keyed by, in the order
 * `LetterUtilitiesService.orientations` enumerates them: each corner —
 * Southeast, Southwest, Northeast, Northwest — unturned, then turned a
 * quarter, a half, and three quarters clockwise.
 */
export const LETTER_ORIENTATION_NAMES = [
  "Southeast",
  "SoutheastQuarter",
  "SoutheastHalf",
  "SoutheastThreeQuarter",
  "Southwest",
  "SouthwestQuarter",
  "SouthwestHalf",
  "SouthwestThreeQuarter",
  "Northeast",
  "NortheastQuarter",
  "NortheastHalf",
  "NortheastThreeQuarter",
  "Northwest",
  "NorthwestQuarter",
  "NorthwestHalf",
  "NorthwestThreeQuarter",
] as const;
