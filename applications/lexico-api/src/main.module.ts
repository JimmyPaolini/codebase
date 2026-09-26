import path from "node:path";

import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";

import { DatabaseModule } from "@codebase/lexico-entities";
import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./main.constants";

/**
 * Root NestJS application module for the Lexico GraphQL API.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: path.join(process.cwd(), "src/schema.gql"),
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    DatabaseModule,
    LoggerModule,
  ],
})
export class MainModule {}
