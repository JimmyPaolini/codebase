import { describe, expect, it } from "vitest";

import {
  PYTHON_VALIDATOR_FILE_EXTENSIONS,
  PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR,
} from "./python-validator.constants";

describe("pythonValidatorConstants", () => {
  it("declares supported file extensions and plugin descriptor metadata", () => {
    expect(PYTHON_VALIDATOR_FILE_EXTENSIONS).toStrictEqual([".ipynb", ".py"]);
    expect(PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR).toStrictEqual({
      description: "Checks Python and notebook conformance against templates",
      fileExtensions: [".ipynb", ".py"],
      name: "python",
    });
  });
});
