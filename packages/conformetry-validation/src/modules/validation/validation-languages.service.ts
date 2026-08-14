import { Injectable } from "@nestjs/common";
import { LazyModuleLoader } from "@nestjs/core";

import {
  LANGUAGE_PACKAGES,
  TEXT_LANGUAGE_PACKAGE,
} from "./validation.constants";
import { MissingLanguagePackageError } from "./validation.errors";

import type { LanguageModuleLoader, LanguagePackage } from "./validation.types";
import type { ConformetryLanguageValidator } from "@jimmypaolini/conformetry-core";
import type { Type } from "@nestjs/common";

/**
 * Loads the language validators a run actually needs, and only those.
 *
 * A package is imported when an extension it claims turns up in the templates
 * being validated, so a consumer checking only TypeScript never loads the
 * Python bridge — which would otherwise demand a `python3` binary on the
 * machine to validate files that repository does not have.
 */
@Injectable()
export class ValidationLanguagesService {
  // 🏗 Dependency Injection

  constructor(private readonly lazyModuleLoader: LazyModuleLoader) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an untrusted export to a class Nest can construct. */
  private isConstructable<Value>(value: unknown): value is Type<Value> {
    return typeof value === "function";
  }

  /** Imports a language package and resolves its validator through Nest. */
  private async loadValidator(args: {
    languagePackage: LanguagePackage;
    loadLanguageModule: LanguageModuleLoader;
  }): Promise<ConformetryLanguageValidator> {
    const { languagePackage } = args;
    let moduleNamespace: unknown;

    try {
      moduleNamespace = await args.loadLanguageModule(
        languagePackage.specifier,
      );
    } catch (error) {
      throw new MissingLanguagePackageError({
        extensions: languagePackage.extensions,
        // The underlying reason is carried through: "not installed" and "failed
        // to load" are different problems with different fixes.
        reason: `it could not be loaded (${error instanceof Error ? error.message : String(error)})`,
        specifier: languagePackage.specifier,
      });
    }

    const moduleClass = this.readExport<unknown>({
      languagePackage,
      moduleNamespace,
      name: languagePackage.moduleExport,
    });
    const serviceClass = this.readExport<ConformetryLanguageValidator>({
      languagePackage,
      moduleNamespace,
      name: languagePackage.serviceExport,
    });
    const moduleReference = await this.lazyModuleLoader.load(() => moduleClass);

    return moduleReference.get<ConformetryLanguageValidator>(serviceClass);
  }

  /**
   * Reads a named export from a dynamically imported module.
   *
   * The module arrives untyped — its shape cannot be known at compile time,
   * which is the price of not importing it — so the export is narrowed here
   * rather than trusted.
   */
  private readExport<Value>(args: {
    languagePackage: LanguagePackage;
    moduleNamespace: unknown;
    name: string;
  }): Type<Value> {
    const namespace: Record<string, unknown> =
      typeof args.moduleNamespace === "object" && args.moduleNamespace !== null
        ? { ...args.moduleNamespace }
        : {};
    const value = namespace[args.name];

    if (!this.isConstructable<Value>(value)) {
      throw new MissingLanguagePackageError({
        extensions: args.languagePackage.extensions,
        reason: `it does not export ${args.name}`,
        specifier: args.languagePackage.specifier,
      });
    }

    return value;
  }

  // 🌎 Public Methods

  /**
   * Resolves a validator for every extension in play.
   *
   * An extension a known package claims loads that package, and failing to
   * load it is an error rather than a silent skip: the alternative is quietly
   * checking less than the caller believes. An extension nobody claims falls
   * back to text, compared line by line, so no template file goes unchecked.
   */
  public async resolveValidators(args: {
    extensions: string[];
    loadLanguageModule?: LanguageModuleLoader;
  }): Promise<ConformetryLanguageValidator[]> {
    const loadLanguageModule =
      args.loadLanguageModule ??
      (async (specifier: string): Promise<unknown> => {
        const moduleNamespace: unknown = await import(specifier);

        return moduleNamespace;
      });
    const required = LANGUAGE_PACKAGES.filter((languagePackage) => {
      return languagePackage.extensions.some((extension) => {
        return args.extensions.includes(extension);
      });
    });
    const validators: ConformetryLanguageValidator[] = [];

    // Sequential, not `Promise.all`: language packages share modules — jupyter
    // imports markdown, python, and json — and concurrent lazy loads of an
    // overlapping graph hand back half-initialized instances.
    for (const languagePackage of required) {
      validators.push(
        await this.loadValidator({ languagePackage, loadLanguageModule }),
      );
    }
    const claimed = new Set(
      validators.flatMap((validator) => {
        return [...validator.descriptor.fileExtensions];
      }),
    );
    const unclaimed = args.extensions.filter((extension) => {
      return !claimed.has(extension);
    });

    if (unclaimed.length === 0) {
      return validators;
    }

    const textValidator = await this.loadValidator({
      languagePackage: TEXT_LANGUAGE_PACKAGE,
      loadLanguageModule,
    });

    return [
      ...validators,
      {
        // The descriptor is widened to the extensions nothing else claimed, so
        // the dispatch that follows routes them here.
        descriptor: {
          ...textValidator.descriptor,
          fileExtensions: [
            ...textValidator.descriptor.fileExtensions,
            ...unclaimed,
          ],
        },
        validateDocument: (document) =>
          textValidator.validateDocument(document),
      },
    ];
  }
}
