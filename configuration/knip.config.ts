import type { KnipConfig } from "knip";

// Shared by every NestJS service/command package (conformetry and codometer).
const NESTJS_PACKAGE_IGNORE_DEPENDENCIES = [
  "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
  "@nestjs/testing",
  "vitest",
] as const;

const config: KnipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",

  // Globally ignored file patterns (tests, build output, caches)
  ignore: [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/dist/**",
    "**/node_modules/**",
    "**/.conformetry/**",
    "**/.nx/**",
    "**/coverage/**",
    "notepads/**",
  ],

  // Blank constants/types files are conformance placeholders; keep them out of unused-file checks only.
  // testing/mocks.ts files are conformance placeholders for project-level test utilities (used by future tests).
  ignoreFiles: [
    "**/src/**/*.constants.ts",
    "**/src/**/*.types.ts",
    "**/testing/mocks.ts",
  ],

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
    "@conformetry/nx", // Referenced in nx.json plugin configuration
  ],

  // devDependencies used via npx, CLI, or ESLint config (not directly imported)
  ignoreDependencies: [
    // Depended on so that pnpm links its `conformetry` bin into
    // node_modules/.bin, which it does only for root dependencies. Nothing
    // imports it.
    "@conformetry/cli",
    "@commitlint/config-conventional", // commitlint preset, referenced as string in extends array
    "@golevelup/ts-vitest", // Conformance-scaffolded test mock utility — imported in testing/mocks.ts which is in ignoreFiles
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
        "**/.claude/skills/**",
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
        "src/modules/database/data-source.constants.ts",
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
        "@nestjs/testing", // Used by command unit tests; tests are excluded from knip project scope
        "tsx", // TypeScript executor CLI (not used; project uses @swc-node/register instead)
        "vitest", // Knip misses vitest usage because tests are ignored
      ],
      project: "src/**/*.ts",
    },

    // logger: Shared pino-backed NestJS LoggerService and LoggerModule
    "packages/logger": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing", // Used by unit tests; tests are excluded from knip project scope
        "pino-pretty", // Referenced as a string transport target in LoggerService — knip can't trace string references
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
      ],
      project: "src/**/*.ts",
    },

    // callidescope packages: the call-stack linting CLI and the configuration
    // it reads.
    "packages/callidescope-cli": {
      entry: ["src/main.mjs", "src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        ...NESTJS_PACKAGE_IGNORE_DEPENDENCIES,
        // Registered by src/main.mjs and named on Nx command lines as strings,
        // so nothing knip can see imports either of them.
        "@swc-node/register",
        "@swc/core",
      ],
      project: "src/**/*.ts",
    },
    "packages/callidescope-configuration": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    // codometer packages: the measurement CLI and the configuration it reads
    "packages/codometer-cli": {
      entry: ["src/main.mjs", "src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        ...NESTJS_PACKAGE_IGNORE_DEPENDENCIES,
        "@swc-node/register", // Registered by src/main.mjs as a string, and used in Nx run-commands strings
        "@swc/core", // Required peer/runtime for @swc-node/register loaded via CLI string command
      ],
      project: "src/**/*.ts",
    },
    "packages/codometer-configuration": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },

    // conformetry packages: NestJS service/command application scaffolds
    "packages/conformetry-cli": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        "@golevelup/ts-vitest", // Used by unit tests; tests are excluded from knip project scope
        "@nestjs/testing", // Used by command unit tests; tests are excluded from knip project scope
        "vitest", // Knip misses vitest usage because tests are ignored
      ],
      project: "src/**/*.ts",
    },
    "packages/conformetry-core": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-files": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-configuration": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-generation": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-jupyter": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-json": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-markdown": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-nx": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "src/**/templates/**", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-python": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-text": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-typescript": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [...NESTJS_PACKAGE_IGNORE_DEPENDENCIES],
      project: "src/**/*.ts",
    },
    "packages/conformetry-validation": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      ignoreDependencies: [
        ...NESTJS_PACKAGE_IGNORE_DEPENDENCIES,
        // Named as a string in the language registry and imported on demand,
        // so no static import proves it is used.
        "@conformetry/text",
      ],
      project: "src/**/*.ts",
    },
  },
};

export default config;
