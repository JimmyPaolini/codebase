/**
 * Prettier configuration for the codebase
 * @see https://prettier.io/docs/configuration
 */
import type { Config } from "prettier";

const config: Config = {
  // Line length that Prettier will wrap on
  printWidth: 80,

  // Number of spaces per indentation level
  tabWidth: 2,

  // Use spaces instead of tabs
  useTabs: false,

  // Print semicolons at the ends of statements
  semi: true,

  // Use single quotes instead of double quotes
  singleQuote: false,

  // Change when properties in objects are quoted
  quoteProps: "as-needed",

  // Use single quotes instead of double quotes in JSX
  jsxSingleQuote: false,

  // Print trailing commas wherever possible in multi-line comma-separated syntactic structures
  trailingComma: "all",

  // Print spaces between brackets in object literals
  bracketSpacing: true,

  // Put the > of a multi-line HTML (HTML, JSX, Vue, Angular) element at the end of the last line
  bracketSameLine: false,

  // Include parentheses around a sole arrow function parameter
  arrowParens: "always",

  // Format only a segment of a file
  rangeStart: 0,
  rangeEnd: Infinity,

  // Specify which parser to use
  // parser: undefined, // Prettier automatically infers the parser from the file path

  // Specify the file name to use to infer which parser to use
  // filepath: undefined,

  // Prettier can restrict itself to only format files that contain a special comment, called a pragma
  requirePragma: false,

  // Prettier can insert a special @format marker at the top of files specifying that the file has been formatted with Prettier
  insertPragma: false,

  // By default, Prettier will wrap markdown text as-is since some services use a linebreak-sensitive renderer
  proseWrap: "preserve",

  // Specify the global whitespace sensitivity for HTML files
  htmlWhitespaceSensitivity: "css",

  // Whether or not to indent the code inside <script> and <style> tags in Vue files
  vueIndentScriptAndStyle: false,

  // End of line
  endOfLine: "lf",

  // Control whether Prettier formats quoted code embedded in the file
  embeddedLanguageFormatting: "auto",

  // Enforce single attribute per line in HTML, Vue and JSX
  singleAttributePerLine: true,

  // File-specific overrides
  overrides: [
    {
      // Config files that support JSONC (trailing commas and comments)
      files: [
        "**/*.jsonc",
        "**/nx.json",
        "**/project.json",
        "**/tsconfig*.json",
        "**/.vscode/*.json",
        ".devcontainer/**/*.json",
      ],
      options: {
        parser: "jsonc",
        trailingComma: "all",
      },
    },
    {
      // Standard JSON files (package.json, etc) - no trailing commas
      files: ["**/package.json", "**/*.json"],
      options: {
        trailingComma: "none",
      },
    },
  ],
};

export default config;
