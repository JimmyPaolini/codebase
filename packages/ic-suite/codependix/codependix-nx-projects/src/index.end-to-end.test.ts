import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("codependix-nx-projects tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@codependix/nx-projects",
        tarballName: "codependix-nx-projects",
      });
    }).not.toThrow();
  });
});
