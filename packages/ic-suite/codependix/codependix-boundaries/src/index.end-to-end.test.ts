import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("codependix-boundaries tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@codependix/boundaries",
        tarballName: "codependix-boundaries",
      });
    }).not.toThrow();
  });
});
