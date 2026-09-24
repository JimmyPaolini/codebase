import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("codometer-output tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@codometer/output",
        tarballName: "codometer-output",
      });
    }).not.toThrow();
  });
});
