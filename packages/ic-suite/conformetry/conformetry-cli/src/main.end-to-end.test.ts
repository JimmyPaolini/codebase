import { describe, expect, it } from "vitest";

import {
  assertCommandLineBinaryRuns,
  assertTarballTypechecks,
} from "../testing/tarball";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({});
    });
  });

  describe("conformetry-cli tarball assertion", () => {
    it("installs from its tarball and typechecks under modern module resolution", () => {
      expect.hasAssertions();
      expect(() => {
        assertTarballTypechecks({
          packageName: "@conformetry/cli",
          tarballName: "conformetry-cli",
        });
      }).not.toThrow();
    });

    it("executes the binary from the installed tarball and produces expected help output", () => {
      expect.hasAssertions();

      const result = assertCommandLineBinaryRuns({
        binaryName: "conformetry",
        tarballName: "conformetry-cli",
      });

      expect(result.status).toBe(0);
      expect(result.output).toContain("Usage:");
      expect(result.output).toContain("--help");
    });
  });
});
