import { describe, expect, it } from "vitest";

import { formatRepositoryBytes } from "./output-markdown.utilities";

describe(formatRepositoryBytes, () => {
  it.each([
    { bytes: 0, expected: "0.00 kB" },
    { bytes: 8000, expected: "8.00 kB" },
    // One byte under the switch-over: still kilobytes, even though the
    // rounded figure reads as a suspiciously whole "1000".
    { bytes: 999_999, expected: "1000.00 kB" },
    // Exactly at the switch-over: the boundary is `>=`, so this is the
    // smallest value that must render as megabytes.
    { bytes: 1_000_000, expected: "1.00 MB" },
    { bytes: 7_890_000, expected: "7.89 MB" },
  ])("formats $bytes as $expected", ({ bytes, expected }) => {
    expect(formatRepositoryBytes(bytes)).toBe(expected);
  });

  it("renders decimal kilobytes, matching what a limit string parses", () => {
    // `"8 KB"` in a configured limit is 8000 bytes, so 8000 must print back
    // as 8.00 kB rather than the 7.8125 a binary kilobyte would produce.
    expect(formatRepositoryBytes(8000)).toBe("8.00 kB");
  });
});
