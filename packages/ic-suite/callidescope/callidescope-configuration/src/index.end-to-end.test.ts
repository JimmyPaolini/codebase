import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("callidescope-configuration tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@callidescope/configuration",
        tarballName: "callidescope-configuration",
      });
    }).not.toThrow();
  });
});
