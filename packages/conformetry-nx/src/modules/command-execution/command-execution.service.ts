import { GenerateCommand, MainModule } from "@jimmypaolini/conformetry";
import { CommandFactory } from "nest-commander";

import { NEST_APPLICATION_CONTEXT_OPTIONS } from "./command-execution.constants";

import type { RunGenerateCommandArguments } from "./command-execution.types";

/**
 * Invokes conformetry generation commands using the shared Nest application.
 */
export class CommandExecutionService {
  /**
   * Invokes GenerateCommand.run with deterministic arguments.
   */
  public async runGenerateCommand(
    args: RunGenerateCommandArguments,
  ): Promise<void> {
    const applicationContext = await CommandFactory.createWithoutRunning(
      MainModule,
      NEST_APPLICATION_CONTEXT_OPTIONS,
    );

    try {
      const generateCommand = applicationContext.get<{
        run: (
          passedParameters: string[],
          options: {
            config: string;
            name: string;
            targetDirectoryPath: string;
          },
        ) => Promise<void>;
      }>(GenerateCommand);

      await generateCommand.run(args.passedParameters, {
        config: args.configurationPath,
        name: args.generatorName,
        targetDirectoryPath: args.targetDirectoryPath,
      });
    } finally {
      await applicationContext.close();
    }
  }
}
