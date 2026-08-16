import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import type { Provider, Type } from "@nestjs/common";

/**
 * Resolved command test module artifacts.
 */
export interface CommandTestHarness<CommandType> {
  command: CommandType;
  logger: DeepMocked<LoggerService>;
  testingModule: TestingModule;
}

/**
 * Options to build a command testing module.
 */
interface CreateCommandTestHarnessOptions<CommandType> {
  additionalProviders?: Provider[];
  commandType: Type<CommandType>;
}

/**
 * Options for resetting shared vitest state in command tests.
 */
interface ResetCommandTestHarnessOptions {
  unstubGlobals?: boolean;
  useRealTimers?: boolean;
}

/**
 * Creates a Nest testing module for command tests with a mocked logger.
 */
export async function createCommandTestHarness<CommandType>({
  additionalProviders = [],
  commandType,
}: CreateCommandTestHarnessOptions<CommandType>): Promise<
  CommandTestHarness<CommandType>
> {
  const testingModule = await Test.createTestingModule({
    providers: [
      commandType,
      {
        provide: LoggerService,
        useValue: createMock<LoggerService>(),
      },
      ...additionalProviders,
    ],
  }).compile();

  const command = await testingModule.resolve(commandType);
  const logger: DeepMocked<LoggerService> = testingModule.get(LoggerService);

  return {
    command,
    logger,
    testingModule,
  };
}

/**
 * Applies the common mock reset sequence used by command unit tests.
 */
export function resetCommandTestHarness({
  unstubGlobals = true,
  useRealTimers = false,
}: ResetCommandTestHarnessOptions = {}): void {
  vi.restoreAllMocks();
  vi.clearAllMocks();

  if (unstubGlobals) {
    vi.unstubAllGlobals();
  }

  if (useRealTimers) {
    vi.useRealTimers();
  }
}
