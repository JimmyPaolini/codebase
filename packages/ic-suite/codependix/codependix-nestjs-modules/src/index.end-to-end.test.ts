import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("codependix-nestjs-modules tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        packageName: "@codependix/nestjs-modules",
        tarballName: "codependix-nestjs-modules",
      });
    }).not.toThrow();
  });
});
