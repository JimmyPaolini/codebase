import { describe, expect, it } from "vitest";

import * as core from "./index.js";
import {
  ConfigurationFileNotFoundError,
  InvalidConfigurationError,
  InvalidLimitValueError,
  UnknownConfigurationFileTypeError,
} from "./index.js";

describe("codometer-core index", () => {
  // The defining invariant of the core layer, and the only runtime claim a
  // contracts package can make about itself: everything it ships is either an
  // error somebody throws or a vocabulary somebody reads. A service or a
  // NestJS module added here is neither, and fails this outright — which is
  // what stops the contracts leaf from quietly becoming a live package again.
  it("ships nothing but errors and vocabularies — no service, no module", () => {
    const shipped = Object.values(core);

    expect(shipped.length).toBeGreaterThan(0);

    for (const value of shipped) {
      const isError =
        typeof value === "function" && value.name.endsWith("Error");

      expect(isError || Array.isArray(value)).toBe(true);
    }
  });

  it("names the file a configuration was looked for in", () => {
    const error = new ConfigurationFileNotFoundError(
      "/repo/codometer.config.ts",
    );

    expect(error.name).toBe("ConfigurationFileNotFoundError");
    expect(error.message).toContain("/repo/codometer.config.ts");
  });

  it("names the extension a configuration cannot be read from", () => {
    const error = new UnknownConfigurationFileTypeError(
      "/repo/codometer.config.yaml",
    );

    expect(error.name).toBe("UnknownConfigurationFileTypeError");
    expect(error.message).toContain("/repo/codometer.config.yaml");
  });

  it("carries the schema issues a configuration was refused for", () => {
    const error = new InvalidConfigurationError("format: required");

    expect(error.name).toBe("InvalidConfigurationError");
    expect(error.message).toContain("format: required");
  });

  it("names the limit whose value could not be read", () => {
    const error = new InvalidLimitValueError("repository.size", "8 K");

    expect(error.name).toBe("InvalidLimitValueError");
    expect(error.message).toContain("repository.size");
    expect(error.message).toContain("8 K");
  });
});
