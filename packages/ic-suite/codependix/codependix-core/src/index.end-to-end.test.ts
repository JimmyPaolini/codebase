import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("codependix-core tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@codependix/core",
        tarballName: "codependix-core",
      });
    }).not.toThrow();
  });
});
