import fs, { globSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { workspaceRoot } from "@nx/devkit";

import { GeneratorService } from "../generator/generator.service";
import { JupyterNotebookApplicationCommand } from "../jupyter-notebook-application/jupyter-notebook-application.command";
import { NestjsCommandApplicationCommand } from "../nestjs-command-application/nestjs-command-application.command";
import { NestjsCommandModuleCommand } from "../nestjs-command-module/nestjs-command-module.command";
import { NestjsDataloaderModuleCommand } from "../nestjs-dataloader-module/nestjs-dataloader-module.command";
import { NestjsGraphqlApplicationCommand } from "../nestjs-graphql-application/nestjs-graphql-application.command";
import { NestjsGraphqlModuleCommand } from "../nestjs-graphql-module/nestjs-graphql-module.command";
import { NestjsServiceFileCommand } from "../nestjs-service-file/nestjs-service-file.command";
import { NestjsServiceModuleCommand } from "../nestjs-service-module/nestjs-service-module.command";
import { ReactComponentCommand } from "../react-component/react-component.command";

import { ValidatorFilesService } from "./validator-files.service";

import type {
  InstanceDirectoryValidationResult,
  WorkspaceProject,
} from "./validator.types";

/** Executes conformance validation rules against workspace projects. */
@Injectable()
export class ValidatorRulesService {
  // 🏗 Dependency Injection

  /** Creates the validator rules service with command and file dependencies. */
  constructor(
    private readonly generatorService: GeneratorService,
    private readonly jupyterNotebookApplicationCommand: JupyterNotebookApplicationCommand,
    private readonly nestjsCommandApplicationCommand: NestjsCommandApplicationCommand,
    private readonly nestjsCommandModuleCommand: NestjsCommandModuleCommand,
    private readonly nestjsDataloaderModuleCommand: NestjsDataloaderModuleCommand,
    private readonly nestjsGraphqlApplicationCommand: NestjsGraphqlApplicationCommand,
    private readonly nestjsGraphqlModuleCommand: NestjsGraphqlModuleCommand,
    private readonly nestjsServiceFileCommand: NestjsServiceFileCommand,
    private readonly nestjsServiceModuleCommand: NestjsServiceModuleCommand,
    private readonly reactComponentCommand: ReactComponentCommand,
    private readonly validatorFilesService: ValidatorFilesService,
  ) {}
  /** Resolves module directory paths for a project root. */
  private resolveProjectModuleDirectoryPaths(
    projectRootPath: string,
  ): string[] {
    const modulesRootPath = path.join(projectRootPath, "src", "modules");
    if (!fs.existsSync(modulesRootPath)) {
      return [];
    }

    return fs
      .readdirSync(modulesRootPath, { withFileTypes: true })
      .filter(
        (directoryEntry) =>
          directoryEntry.isDirectory() && directoryEntry.name !== "logger",
      )
      .map((directoryEntry) => path.join(modulesRootPath, directoryEntry.name));
  }
  /** Builds an absolute template directory path from workspace root. */
  private resolveTemplateDirectoryPath(templateDirectoryPath: string): string {
    return path.join(workspaceRoot, templateDirectoryPath);
  }
  /** Runs the jupyter-notebook-application rule. */
  private runJupyterNotebookApplicationRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (
      !workspaceProject.tags.includes("generator:jupyter-notebook-application")
    ) {
      return undefined;
    }

    const templateDirectoryPath = this.resolveTemplateDirectoryPath(
      this.jupyterNotebookApplicationCommand.templateDirectoryPath,
    );
    const projectName = path.basename(workspaceProject.rootPath);
    const pyprojectPath = path.join(
      workspaceProject.rootPath,
      "pyproject.toml",
    );
    const description = fs.existsSync(pyprojectPath)
      ? (/^description\s*=\s*["'](?<description>.*)["']$/mu.exec(
          fs.readFileSync(pyprojectPath, "utf8"),
        )?.groups?.["description"] ?? "")
      : "";
    const rootResult = this.validatorFilesService.validateInstanceDirectory({
      descriptionOverride: description,
      instanceDirectoryPath: workspaceProject.rootPath,
      nameOverride: projectName,
      templateDirectoryPath,
    });
    const sourceResult = this.validatorFilesService.validateInstanceDirectory({
      descriptionOverride: description,
      instanceDirectoryPath: path.join(workspaceProject.rootPath, "src"),
      nameOverride: projectName,
      templateDirectoryPath: path.join(templateDirectoryPath, "src"),
    });

    return [rootResult, sourceResult];
  }
  /** Runs the nestjs-command-application rule. */
  private runNestjsCommandApplicationRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (
      !workspaceProject.tags.includes("generator:nestjs-command-application")
    ) {
      return undefined;
    }

    return this.validateCommandApplicationDirectories({
      instanceDirectoryPaths: [workspaceProject.rootPath],
      templateDirectoryPath: this.resolveTemplateDirectoryPath(
        this.nestjsCommandApplicationCommand.templateDirectoryPath,
      ),
    });
  }
  /** Runs the nestjs-command-module rule. */
  private runNestjsCommandModuleRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (
      !workspaceProject.tags.includes(this.nestjsServiceModuleCommand.tag) ||
      !workspaceProject.tags.includes(this.nestjsCommandModuleCommand.tag)
    ) {
      return undefined;
    }

    const moduleDirectoryPaths = this.resolveProjectModuleDirectoryPaths(
      workspaceProject.rootPath,
    ).filter((moduleDirectoryPath) => {
      const moduleName = path.basename(moduleDirectoryPath);
      return fs.existsSync(
        path.join(moduleDirectoryPath, `${moduleName}.command.ts`),
      );
    });

    return moduleDirectoryPaths.map((moduleDirectoryPath) =>
      this.validatorFilesService.validateInstanceDirectory({
        instanceDirectoryPath: moduleDirectoryPath,
        templateDirectoryPath: this.resolveTemplateDirectoryPath(
          this.nestjsCommandModuleCommand.templateDirectoryPath,
        ),
      }),
    );
  }
  /** Runs the nestjs-dataloader-module rule. */
  private runNestjsDataloaderModuleRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (
      !workspaceProject.tags.includes(this.nestjsDataloaderModuleCommand.tag)
    ) {
      return undefined;
    }

    const moduleDirectoryPaths = this.resolveProjectModuleDirectoryPaths(
      workspaceProject.rootPath,
    ).filter((moduleDirectoryPath) => {
      const moduleName = path.basename(moduleDirectoryPath);
      return fs.existsSync(
        path.join(moduleDirectoryPath, `${moduleName}.dataloader.ts`),
      );
    });

    return moduleDirectoryPaths.map((moduleDirectoryPath) =>
      this.validatorFilesService.validateInstanceDirectory({
        instanceDirectoryPath: moduleDirectoryPath,
        templateDirectoryPath: this.resolveTemplateDirectoryPath(
          this.nestjsDataloaderModuleCommand.templateDirectoryPath,
        ),
      }),
    );
  }
  /** Runs the nestjs-graphql-application rule. */
  private runNestjsGraphqlApplicationRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (
      !workspaceProject.tags.includes("generator:nestjs-graphql-application")
    ) {
      return undefined;
    }

    return [
      this.validatorFilesService.validateInstanceDirectory({
        instanceDirectoryPath: workspaceProject.rootPath,
        templateDirectoryPath: this.resolveTemplateDirectoryPath(
          this.nestjsGraphqlApplicationCommand.templateDirectoryPath,
        ),
      }),
    ];
  }
  /** Runs the nestjs-graphql-module rule. */
  private runNestjsGraphqlModuleRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (!workspaceProject.tags.includes(this.nestjsGraphqlModuleCommand.tag)) {
      return undefined;
    }

    const moduleDirectoryPaths = this.resolveProjectModuleDirectoryPaths(
      workspaceProject.rootPath,
    ).filter((moduleDirectoryPath) => {
      const moduleName = path.basename(moduleDirectoryPath);
      return fs.existsSync(
        path.join(moduleDirectoryPath, `${moduleName}.resolver.ts`),
      );
    });

    return moduleDirectoryPaths.map((moduleDirectoryPath) =>
      this.validatorFilesService.validateInstanceDirectory({
        instanceDirectoryPath: moduleDirectoryPath,
        templateDirectoryPath: this.resolveTemplateDirectoryPath(
          this.nestjsGraphqlModuleCommand.templateDirectoryPath,
        ),
      }),
    );
  }
  /** Runs the nestjs-service-file rule. */
  private runNestjsServiceFileRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (!workspaceProject.tags.includes(this.nestjsServiceFileCommand.tag)) {
      return undefined;
    }

    const serviceImplementationFilePaths = globSync(
      path.join(workspaceProject.rootPath, "src/modules/*/*.service.ts"),
    );
    if (serviceImplementationFilePaths.length === 0) {
      return [];
    }

    const templateDirectoryPath = this.resolveTemplateDirectoryPath(
      this.nestjsServiceFileCommand.templateDirectoryPath,
    );
    const templateFilenames = fs
      .readdirSync(templateDirectoryPath, { withFileTypes: true })
      .filter((directoryEntry) => directoryEntry.isFile())
      .map((directoryEntry) => directoryEntry.name)
      .toSorted();

    return serviceImplementationFilePaths.map((serviceFilePath) =>
      this.validateServiceFilesForPath({
        serviceFilePath,
        templateDirectoryPath,
        templateFilenames,
      }),
    );
  }
  /** Runs the nestjs-service-module rule. */
  private runNestjsServiceModuleRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (!workspaceProject.tags.includes(this.nestjsServiceModuleCommand.tag)) {
      return undefined;
    }

    const moduleDirectoryPaths = this.resolveProjectModuleDirectoryPaths(
      workspaceProject.rootPath,
    ).filter((moduleDirectoryPath) => {
      const moduleName = path.basename(moduleDirectoryPath);
      return (
        !fs.existsSync(
          path.join(moduleDirectoryPath, `${moduleName}.command.ts`),
        ) &&
        !fs.existsSync(
          path.join(moduleDirectoryPath, `${moduleName}.resolver.ts`),
        ) &&
        fs.existsSync(
          path.join(moduleDirectoryPath, `${moduleName}.module.ts`),
        ) &&
        fs.existsSync(
          path.join(moduleDirectoryPath, `${moduleName}.service.ts`),
        )
      );
    });

    return moduleDirectoryPaths.map((moduleDirectoryPath) =>
      this.validatorFilesService.validateInstanceDirectory({
        instanceDirectoryPath: moduleDirectoryPath,
        templateDirectoryPath: this.resolveTemplateDirectoryPath(
          this.nestjsServiceModuleCommand.templateDirectoryPath,
        ),
      }),
    );
  }
  /** Runs the react-component rule. */
  private runReactComponentRule(
    workspaceProject: WorkspaceProject,
  ): InstanceDirectoryValidationResult[] | undefined {
    if (!workspaceProject.tags.includes(this.reactComponentCommand.tag)) {
      return undefined;
    }

    const componentFilePaths = globSync(
      path.join(workspaceProject.rootPath, "src/components/*.tsx"),
    ).filter((componentFilePath) => !componentFilePath.endsWith(".test.tsx"));
    if (componentFilePaths.length === 0) {
      return [];
    }

    const templateDirectoryPath = this.resolveTemplateDirectoryPath(
      this.reactComponentCommand.templateDirectoryPath,
    );
    const templateFilenames = fs
      .readdirSync(templateDirectoryPath, { withFileTypes: true })
      .filter((directoryEntry) => directoryEntry.isFile())
      .map((directoryEntry) => directoryEntry.name)
      .toSorted();

    return componentFilePaths.map((componentFilePath) => {
      const componentName = path.basename(componentFilePath, ".tsx");
      const substitutions =
        this.generatorService.buildNameSubstitutions(componentName);
      const results = templateFilenames.map((templateFilename) => {
        const instanceFilename = templateFilename.replaceAll(
          "__namePascalCase__",
          componentName,
        );
        const instanceFilePath = path.join(
          path.dirname(componentFilePath),
          instanceFilename,
        );
        const templateFilePath = path.join(
          templateDirectoryPath,
          templateFilename,
        );

        return {
          ...this.validatorFilesService.validateInstanceFile({
            data: {
              nameCamelCase: substitutions.nameCamelCase,
              nameKebabCase: substitutions.nameKebabCase,
              namePascalCase: substitutions.namePascalCase,
              nameSnakeCase: substitutions.nameSnakeCase,
            },
            instanceFilePath,
            templateFilePath,
          }),
          filename: instanceFilename,
        };
      });

      return {
        directoryName: path.relative(
          workspaceRoot,
          path.dirname(componentFilePath),
        ),
        results,
      };
    });
  }
  /** Validates command-application template files for instance directories. */
  private validateCommandApplicationDirectories(args: {
    instanceDirectoryPaths: string[];
    templateDirectoryPath: string;
  }): InstanceDirectoryValidationResult[] {
    const { instanceDirectoryPaths, templateDirectoryPath } = args;
    const templateFilenames = fs
      .readdirSync(templateDirectoryPath, { withFileTypes: true })
      .filter((node) => node.isFile())
      .map((node) => node.name)
      .toSorted();

    return instanceDirectoryPaths.map((instanceDirectoryPath) => {
      const directoryName = path.basename(instanceDirectoryPath);
      const relativeInstanceDirectoryPath = path.relative(
        workspaceRoot,
        instanceDirectoryPath,
      );
      const type = relativeInstanceDirectoryPath.split(path.sep)[0];
      const nameSubstitutions =
        this.generatorService.buildNameSubstitutions(directoryName);
      const substitutions = {
        nameCamelCase: nameSubstitutions.nameCamelCase,
        nameKebabCase: nameSubstitutions.nameKebabCase,
        namePascalCase: nameSubstitutions.namePascalCase,
        nameSnakeCase: nameSubstitutions.nameSnakeCase,
        type: type === undefined ? "applications" : type,
      };

      const results = templateFilenames.map((templateFilename) => {
        const instanceFilename = templateFilename.replaceAll(
          "__nameKebabCase__",
          substitutions.nameKebabCase,
        );
        const instanceFilePath = path.join(
          instanceDirectoryPath,
          instanceFilename,
        );
        const templateFilePath = path.join(
          templateDirectoryPath,
          templateFilename,
        );
        return {
          ...this.validatorFilesService.validateInstanceFile({
            data: substitutions,
            instanceFilePath,
            templateFilePath,
          }),
          filename: instanceFilename,
        };
      });

      return { directoryName, results };
    });
  }
  /** Validates service-file templates for a discovered service file path. */
  private validateServiceFilesForPath(args: {
    serviceFilePath: string;
    templateDirectoryPath: string;
    templateFilenames: string[];
  }): InstanceDirectoryValidationResult {
    const { serviceFilePath, templateDirectoryPath, templateFilenames } = args;
    const serviceName = path
      .basename(serviceFilePath)
      .replace(".service.ts", "");
    const nameSubstitutions =
      this.generatorService.buildNameSubstitutions(serviceName);
    const substitutions = {
      nameCamelCase: nameSubstitutions.nameCamelCase,
      nameKebabCase: nameSubstitutions.nameKebabCase,
      namePascalCase: nameSubstitutions.namePascalCase,
    };

    const results = templateFilenames.map((templateFilename) => {
      const templateFilePath = path.join(
        templateDirectoryPath,
        templateFilename,
      );
      const instanceFilename = templateFilename.replaceAll(
        "__nameKebabCase__",
        substitutions.nameKebabCase,
      );
      const instanceFilePath = path.join(
        path.dirname(serviceFilePath),
        instanceFilename,
      );
      return {
        ...this.validatorFilesService.validateInstanceFile({
          data: substitutions,
          instanceFilePath,
          templateFilePath,
        }),
        filename: instanceFilename,
      };
    });

    return {
      directoryName: path.relative(
        workspaceRoot,
        path.dirname(serviceFilePath),
      ),
      results,
    };
  }
  /** Runs a selected validation rule against a workspace project. */
  runRule(args: {
    ruleName: string;
    workspaceProject: WorkspaceProject;
  }): InstanceDirectoryValidationResult[] | undefined {
    const { ruleName, workspaceProject } = args;

    const ruleByName: Record<
      string,
      (
        project: WorkspaceProject,
      ) => InstanceDirectoryValidationResult[] | undefined
    > = {
      "jupyter-notebook-application": (project) =>
        this.runJupyterNotebookApplicationRule(project),
      "nestjs-command-application": (project) =>
        this.runNestjsCommandApplicationRule(project),
      "nestjs-command-module": (project) =>
        this.runNestjsCommandModuleRule(project),
      "nestjs-dataloader-module": (project) =>
        this.runNestjsDataloaderModuleRule(project),
      "nestjs-graphql-application": (project) =>
        this.runNestjsGraphqlApplicationRule(project),
      "nestjs-graphql-module": (project) =>
        this.runNestjsGraphqlModuleRule(project),
      "nestjs-service-file": (project) =>
        this.runNestjsServiceFileRule(project),
      "nestjs-service-module": (project) =>
        this.runNestjsServiceModuleRule(project),
      "react-component": (project) => this.runReactComponentRule(project),
    };
    const runRule = ruleByName[ruleName];

    if (runRule === undefined) {
      return undefined;
    }

    return runRule(workspaceProject);
  }
}
