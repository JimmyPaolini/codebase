import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("conformetry-configuration tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@conformetry/configuration",
        tarballName: "conformetry-configuration",
      });
    }).not.toThrow();
  });
});
