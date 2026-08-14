import { LazyModuleLoader } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationLanguagesService } from "./validation-languages.service";

import type { LanguageModuleLoader } from "./validation.types";
import type {
  ConformetryLanguageValidator,
  PreparedValidationDocument,
} from "@jimmypaolini/conformetry-core";
import type { Type } from "@nestjs/common";

/** A package namespace shaped the way the real language packages are. */
function buildNamespace(args: {
  extensions: string[];
  moduleExport: string;
  name: string;
  serviceExport: string;
}): Record<string, unknown> {
  return {
    [args.moduleExport]: class {
      public readonly name = args.name;
    },
    [args.serviceExport]: buildValidatorClass({
      extensions: args.extensions,
      name: args.name,
    }),
  };
}

/**
 * Builds a stand-in validator class for one language.
 *
 * A class rather than an instance, because the service resolves the class out
 * of the imported namespace and asks Nest to construct it.
 */
function buildValidatorClass(args: {
  extensions: string[];
  name: string;
}): Type<ConformetryLanguageValidator> {
  return class {
    public readonly descriptor = {
      description: `${args.name} stand-in`,
      fileExtensions: args.extensions,
      name: args.name,
    };

    public validateDocument(): [] {
      return [];
    }
  };
}

const DOCUMENT: PreparedValidationDocument = {
  filename: ".gitignore",
  instance: "node_modules\n",
  instanceFilePath: "/w/packages/widgets/.gitignore",
  renderedTemplate: "node_modules\n",
  templateFilePath: "/w/configuration/templates/widget/.gitignore",
};

const NAMESPACES: Record<string, Record<string, unknown>> = {
  "@jimmypaolini/conformetry-text": buildNamespace({
    extensions: [".txt"],
    moduleExport: "TextValidatorModule",
    name: "text",
    serviceExport: "TextValidatorService",
  }),
  "@jimmypaolini/conformetry-typescript": buildNamespace({
    extensions: [".ts", ".tsx"],
    moduleExport: "TypescriptValidatorModule",
    name: "typescript",
    serviceExport: "TypescriptValidatorService",
  }),
};

/** Resolves only the packages this test knows; everything else is "missing". */
const loadLanguageModule: LanguageModuleLoader = async (specifier) => {
  // Awaited so the stand-in resolves on a later tick, as a real import does.
  const namespace = await Promise.resolve(NAMESPACES[specifier]);

  if (namespace === undefined) {
    throw new Error(`Cannot find module '${specifier}'`);
  }

  return namespace;
};

/**
 * Dependencies are mocked here; that the real graph wires is proven by the
 * workspace's own `conformetry-validate` run, which loads every language
 * package for real.
 */
describe(ValidationLanguagesService, () => {
  let service: ValidationLanguagesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidationLanguagesService,
        {
          // Stands in for Nest's own lazy loader: it constructs whichever
          // service class the module under test hands it.
          provide: LazyModuleLoader,
          useValue: {
            load: async () => {
              await Promise.resolve();

              return {
                get: (serviceClass: Type<ConformetryLanguageValidator>) =>
                  new serviceClass(),
              };
            },
          },
        },
      ],
    }).compile();

    service = await module.resolve(ValidationLanguagesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveValidators", () => {
    it("loads only the packages whose extensions are in play", async () => {
      const validators = await service.resolveValidators({
        extensions: [".ts"],
        loadLanguageModule,
      });

      expect(
        validators.map((validator) => validator.descriptor.name),
      ).toStrictEqual(["typescript"]);
    });

    it("loads nothing when no extension is claimed and none is left over", async () => {
      const validators = await service.resolveValidators({
        extensions: [],
        loadLanguageModule,
      });

      expect(validators).toStrictEqual([]);
    });

    it("falls back to text for extensions nothing claims", async () => {
      const validators = await service.resolveValidators({
        extensions: [".ts", ".gitignore"],
        loadLanguageModule,
      });
      const fallback = validators.at(-1);

      expect(validators).toHaveLength(2);
      expect(fallback?.descriptor.name).toBe("text");
      expect(fallback?.descriptor.fileExtensions).toContain(".gitignore");
      expect(fallback?.validateDocument(DOCUMENT)).toStrictEqual([]);
    });

    it("names the package and the extensions when one is not installed", async () => {
      await expect(
        service.resolveValidators({
          extensions: [".py"],
          loadLanguageModule,
        }),
      ).rejects.toThrow(
        /Validating \.py needs @jimmypaolini\/conformetry-python/,
      );
    });

    it("reports a package that loads but exports the wrong shape", async () => {
      await expect(
        service.resolveValidators({
          extensions: [".ts"],
          loadLanguageModule: async () => {
            await Promise.resolve();

            return { nothing: "useful" };
          },
        }),
      ).rejects.toThrow(/does not export TypescriptValidatorModule/);
    });

    it("reports a package that resolves to something that is not a module", async () => {
      await expect(
        service.resolveValidators({
          extensions: [".ts"],
          loadLanguageModule: async () => {
            await Promise.resolve();

            return "not a namespace";
          },
        }),
      ).rejects.toThrow(/does not export TypescriptValidatorModule/);
    });
  });
});
