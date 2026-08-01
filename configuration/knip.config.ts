import type { KnipConfig } from "knip";

const config: KnipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",

  // Globally ignored file patterns (tests, build output, caches)
  ignore: [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/dist/**",
    "**/node_modules/**",
    "**/.nx/**",
    "**/coverage/**",
    "notepads/**",
  ],

  // Blank constants/types files are conformance placeholders; keep them out of unused-file checks only.
  ignoreFiles: ["**/src/**/*.constants.ts", "**/src/**/*.types.ts"],

  // Binaries invoked via project.json targets or scripts, not imported in code
  ignoreBinaries: [
    "terraform", // Terraform CLI, used for infrastructure provisioning
    "oxfmt", // Oxfmt CLI, invoked via nx:run-commands oxfmt target
    "oxlint", // Oxlint CLI, invoked via nx:run-commands oxlint target
    "gitleaks", // Gitleaks CLI, used for detecting hardcoded secrets
    "trivy", // Trivy CLI, used for security scanning (container images & infrastructure)
    "uv", // uv Python package manager, used in lint-staged for nbstripout
    "unset", // Shell builtin, used in project.json pre-commit command
    "diff", // Used by root scripts and shell checks
    "squawk",
    "gh", // GitHub CLI, used by scripts/orchestrate-agents.ts to run Copilot sessions
    "openwiki",
    "@jimmypaolini/conformetry-nx", // Referenced in nx.json plugin configuration
  ],

  // devDependencies used via npx, CLI, or ESLint config (not directly imported)
  ignoreDependencies: [
    "@commitlint/config-conventional", // commitlint preset, referenced as string in extends array
    "@nx/eslint-plugin", // Loaded dynamically by Nx ESLint integration
    "@nx/js", // Nx JavaScript/TypeScript plugin (auto-detected by Nx)
    "@nx/web", // Nx web plugin (auto-detected by Nx)
    "@semantic-release/commit-analyzer", // semantic-release plugin, referenced in release.config.cjs
    "@semantic-release/github", // semantic-release plugin
    "@semantic-release/npm", // semantic-release plugin
    "@semantic-release/release-notes-generator", // semantic-release plugin
    "@swc/helpers", // SWC runtime helpers, required by @swc-node/register for compiled TS
    "commitlint-plugin-gitmoji", // commitlint plugin, referenced as string in plugins array
    "commitlint-plugin-tense", // commitlint plugin, referenced as string in plugins array
    "markdownlint-cli2", // Markdown linter CLI, invoked via nx:run-commands in project.json
    "jscpd", // Duplicate-code detection CLI, invoked via nx:run-commands in project.json
    "pino-pretty", // Referenced as string transport target in LoggerService — knip can't trace string references
    "stylelint-config-standard", // stylelint preset, referenced as string in extends array
    "stylelint-config-tailwindcss", // stylelint preset, referenced as string in extends array
    "stylelint", // CSS linter CLI, invoked via nx:run-commands in project.json
    "tslib", // TypeScript helper library, implicit runtime dependency for compiled TS
    "unplugin-swc", // Vite plugin for SWC transformation with emitDecoratorMetadata support (caelundas/vitest.config.ts)
    "squawk-cli",
    "skills", // skills.sh CLI, invoked via pnpm exec skills for skill management
    "view", // pnpm sub-command used as `pnpm view pnpm version` in upgrade-dependencies workflow
  ],

  // Allow exports that are only used in the same file (common for barrel re-exports)
  ignoreExportsUsedInFile: true,

  // JimmyPaolini is a GitHub profile page with no buildable code — skip analysis
  ignoreWorkspaces: ["applications/JimmyPaolini", "applications/affirmations"],

  workspaces: {
    // Root workspace: scripts, base configs, and Nx configuration files
    ".": {
      entry: [
        ".pnpmfile.mjs",
        "scripts/**/*.{js,mjs,ts,sh}",
        ".devcontainer/scripts/**/*.{js,mjs,ts,sh}",
        "configuration/vitest.config.ts",
        "configuration/commitlint.config.ts",
        "configuration/dependency-cruiser.cjs",
        "configuration/eslint.config.ts",
        "configuration/eslint.config.js",
        "configuration/lint-staged.config.ts",
        "configuration/oxfmt.config.ts",
        "configuration/oxlint.config.ts",
        "configuration/fallow.config.jsonc", // fallow static analysis config
        "configuration/prettier.config.ts",
        "configuration/stylelint.config.cjs",
        "configuration/syncpack.config.cjs",
        "release.config.cjs",
        "validate-branch-name.config.cjs",
        ".pnpmfile.mjs",
      ],
      ignore: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/dist/**",
        "**/coverage/**",
        "applications/JimmyPaolini/**",
        "pnpm-workspace.yaml", // Catalog dependencies are shared across workspace; knip would flag all as unused in root
        "configuration/conformetry-templates/**", // Generator templates are placeholder files, not executable workspace code
        // Skill scripts are invoked by the skill framework, not imported in code
        "**/.agents/skills/**",
        "**/.github/skills/**",
      ],
      ignoreBinaries: [
        "view", // pnpm sub-command: `pnpm view pnpm version` in upgrade-dependencies workflow
      ],
      project: "**/*.{js,ts,mjs,cjs}",
    },

    // caelundas: Node.js CLI for astronomical calendar generation
    "applications/caelundas": {
      ignore: [
        "src/**/*.test.ts",
        "src/**/*.integration.test.ts",
        "src/**/*.end-to-end.test.ts",
        "output/**", // Generated calendar output files
        "testing/**", // Test fixtures and setup
      ],
      ignoreDependencies: [
        "pino-pretty", // Referenced as string transport target in LoggerService — knip can't trace string references
      ],
      project: "src/**/*.ts",
    },

    // lexico: TanStack Start SSR web application with Supabase backend
    "applications/lexico": {
      ignore: [
        "src/lib/auth.ts", // Supabase auth utilities (used at runtime)
        "src/lib/bookmarks.ts", // Bookmark feature module (used at runtime)
      ],
      ignoreDependencies: [
        "vitest", // Used by tests and Vitest config; Knip may miss it when test sources are excluded
      ],
      project: "src/**/*.{ts,tsx}",
    },

    // lexico-components: Shared React component library (shadcn/ui)
    "packages/lexico-components": {
      entry: ["src/components/**/*.tsx"],
      project: ["src/**/*.ts", "src/**/*.tsx"],
    },

    // lexico-entities: Shared TypeORM entities
    "packages/lexico-entities": {
      entry: [
        "src/index.ts",
        "scripts/**/*.ts",
        "src/modules/database/data-source.ts",
        "src/modules/database/migrations/**/*.ts",
      ],
      ignore: [
        "src/modules/database/database.module.ts", // Conformance-generated module stub, not yet exported
        "src/modules/entities/entities.module.ts", // Conformance-generated module stub, not yet exported
      ],
      ignoreDependencies: [
        "@testcontainers/postgresql", // Used by integration helper in packages/lexico-entities/testing (outside knip project scope)
        "pg", // TypeORM postgres driver — loaded dynamically by TypeORM, not directly imported
      ],
      project: ["src/**/*.ts", "scripts/**/*.ts"],
    },

    // lexico-ingestion: Data ingestion CLI for the Lexico database
    "applications/lexico-ingestion": {
      ignore: [
        "src/**/*.test.ts",
        "src/**/*.integration.test.ts",
        "src/**/*.end-to-end.test.ts",
        "testing/**", // Test fixtures and setup
      ],
      ignoreDependencies: [
        "@nestjs/testing", // Used by command/logger unit tests; tests are excluded from knip project scope
        "pino-pretty", // Referenced as string transport target in LoggerService — knip can't trace string references
        "tsx", // TypeScript executor CLI (not used; project uses @swc-node/register instead)
        "vitest", // Knip misses vitest usage because tests are ignored
      ],
      project: "src/**/*.ts",
    },

    // synchronization: NestJS CLI tool for codebase config synchronization commands
    "tools/synchronization": {
      entry: ["src/main.ts", "src/files.ts"], // Main CLI entry + public file-list constant exports
      ignore: [
        "src/**/*.test.ts",
        "testing/**", // Test fixtures and setup
      ],
      ignoreDependencies: [
        "@swc-node/register", // Used in Nx run-commands strings (`node --import @swc-node/register/esm-register`)
        "@swc/core", // Required peer/runtime for @swc-node/register loaded via CLI string command
        "pino-pretty", // Referenced as string transport target in LoggerService — knip can't trace string references
      ],
      project: "src/**/*.ts",
    },

    // conformetry packages: NestJS service/command application scaffolds
    "packages/conformetry": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing", // Used by logger unit tests; tests are excluded from knip project scope
        "pino-pretty", // Referenced as string transport target in LoggerService — knip can't trace string references
        "vitest", // Knip misses vitest usage because tests are ignored
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-configuration": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-generation": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-validation": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-nx": {
      entry: ["src/index.ts", "src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "src/**/templates/**", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-typescript": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-python": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-markdown": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-json": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-text": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing",
        "pino-pretty",
        "vitest",
      ],
      project: "src/**/*.ts",
    },

    // conformance: Nx generator plugin for scaffolding React components
    "tools/conformance": {
      entry: [
        "src/main.ts", // Shared Nx generator export surface + CLI bootstrap
      ],
      ignore: [
        "src/**/templates/**", // Template files (EJS syntax, not valid TS)
        "src/**/*.test.ts",
      ],
      ignoreBinaries: [
        "python3", // Used by ValidatorPythonBridgeService to execute python validator bridge
      ],
      ignoreDependencies: [
        "@nestjs/common", // Peer dependency — consumed by generated NestJS modules, not the generator itself
        "@nestjs/config", // Peer dependency — consumed by generated NestJS modules, not the generator itself
        "react", // Peer dependency — consumed by generated components, not the generator itself
      ],
      project: "src/**/*.ts",
    },
  },
};

export default config;
