import { createConformetryGeneratorFactory } from "../../modules/nx-adapter/nx-generator-factory.utilities";

/**
 * Creates a minimal conformetry init generator for the current Nx workspace.
 */
export const conformetryInitGenerator = createConformetryGeneratorFactory({
  definition: {
    name: "conformetry-init",
    schemaPath: "packages/conformetry-nx/src/generators/init/schema.json",
    templateDirectoryPath:
      "packages/conformetry-nx/src/generators/init/templates",
  },
  resolveTargetDirectoryPath: ({ options }) => {
    if (typeof options["targetDirectoryPath"] === "string") {
      return options["targetDirectoryPath"];
    }

    return "generated";
  },
});
