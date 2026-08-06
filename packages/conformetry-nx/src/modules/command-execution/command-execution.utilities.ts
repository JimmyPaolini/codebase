import { CommandFactory } from "nest-commander";

import { NEST_APPLICATION_CONTEXT_OPTIONS } from "./command-execution.constants";

import type { RunGenerateCommandArguments } from "./command-execution.types";

/**
 * Invokes GenerateCommand.run with deterministic arguments.
 */
export async function runGenerateCommand(
  args: RunGenerateCommandArguments,
): Promise<void> {
  const conformetryModule = await import("@jimmypaolini/conformetry");
  const applicationContext = await CommandFactory.createWithoutRunning(
    conformetryModule.MainModule,
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
    }>(conformetryModule.GenerateCommand);

    await generateCommand.run(args.passedParameters, {
      config: args.configurationPath,
      name: args.generatorName,
      targetDirectoryPath: args.targetDirectoryPath,
    });
  } finally {
    await applicationContext.close();
  }
}
