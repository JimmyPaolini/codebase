import { describe, expect, it } from "vitest";

import { assertTarballTypechecks } from "../testing/tarball";

describe("conformetry-validation tarball assertion", () => {
  it("installs from its tarball and typechecks under modern module resolution", () => {
    expect.hasAssertions();
    expect(() => {
      assertTarballTypechecks({
        consumerSource: `
import * as validation from "@conformetry/validation";
import * as languages from "@conformetry/languages";

const languageSpecifiers = [
  "json",
  "jupyter",
  "languages",
  "markdown",
  "python",
  "text",
  "typescript",
] as const;

export { validation, languages, languageSpecifiers };
`,
        packageName: "@conformetry/validation",
        tarballName: "conformetry-validation",
      });
    }).not.toThrow();
  });
});
