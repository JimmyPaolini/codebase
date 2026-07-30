import { execSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tsCompiler from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHECK_MODE = process.argv.includes("--check");

// 🔎 File discovery

const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);
const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);
const ALL_EXTENSIONS = new Set([...TS_EXTENSIONS, ...JS_EXTENSIONS]);

const EXCLUDE_PATHS = [
  "node_modules/",
  "dist/",
  ".nx/",
  "build/",
  "coverage/",
  "notepads/",
  // Generator template stubs — not real source
  "/templates/",
];

const trackedFiles = execSync("git ls-files")
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);

const measuredTrackedFiles = trackedFiles
  .filter((filePath) => fs.existsSync(filePath))
  .filter(
    (filePath) =>
      !EXCLUDE_PATHS.some((excludedPath) => filePath.includes(excludedPath)),
  );

const sourceFilePaths = measuredTrackedFiles.filter((filePath) => {
  const extension = path.extname(filePath);
  return (
    ALL_EXTENSIONS.has(extension) &&
    !EXCLUDE_PATHS.some((x) => filePath.includes(x))
  );
});

const tsFilePaths = sourceFilePaths.filter((filePath) =>
  TS_EXTENSIONS.has(path.extname(filePath)),
);
const jsFilePaths = sourceFilePaths.filter((filePath) =>
  JS_EXTENSIONS.has(path.extname(filePath)),
);

const testFilePaths = sourceFilePaths.filter((filePath) =>
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/.test(
    filePath,
  ),
);

// 🗄️ TypeScript / JavaScript AST analysis

// Uses the TypeScript compiler API directly rather than ts-morph so each
// file's AST is created and discarded independently — memory stays O(1).

const jsts = {
  asyncFunctions: 0,
  classes: 0,
  constants: 0,
  decorators: 0,
  enums: 0,
  exported: 0,
  externalPackages: new Set<string>(),
  functions: 0,
  genericDeclarations: 0,
  imports: 0,
  interfaces: 0,
  jsFiles: jsFilePaths.length,
  lines: 0,
  methods: 0,
  syncFunctions: 0,
  testFiles: testFilePaths.length,
  todos: 0,
  tsFiles: tsFilePaths.length,
};

/**
 * Records class declarations and tracks export and generic usage metrics.
 */
function handleClass(node: tsCompiler.Node, stats: typeof jsts): void {
  stats.classes++;
  if (hasExportKeyword(node)) stats.exported++;
  if (hasTypeParameters(node)) stats.genericDeclarations++;
}

/**
 * Records enum declarations and whether they are exported.
 */
function handleEnum(node: tsCompiler.Node, stats: typeof jsts): void {
  stats.enums++;
  if (hasExportKeyword(node)) stats.exported++;
}

/**
 * Records function-like declarations and splits counts by scope and async usage.
 */
function handleFunction(
  node: tsCompiler.Node,
  stats: typeof jsts,
  insideClass: boolean,
): void {
  if (insideClass) stats.methods++;
  else {
    stats.functions++;
    if (hasExportKeyword(node)) stats.exported++;
  }
  if (hasAsyncKeyword(node)) stats.asyncFunctions++;
  else stats.syncFunctions++;
  if (hasTypeParameters(node)) stats.genericDeclarations++;
}

/**
 * Records imports and tracks referenced external package names.
 */
function handleImport(node: tsCompiler.Node, stats: typeof jsts): void {
  stats.imports++;
  const importDeclaration = node as tsCompiler.ImportDeclaration;
  const specifier = (
    importDeclaration.moduleSpecifier as tsCompiler.StringLiteral
  ).text;
  if (specifier && !specifier.startsWith(".") && !specifier.startsWith("/")) {
    const packageName = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : (specifier.split("/")[0] ?? specifier);
    stats.externalPackages.add(packageName);
  }
}

/**
 * Records interface declarations with export and generic metadata.
 */
function handleInterface(node: tsCompiler.Node, stats: typeof jsts): void {
  stats.interfaces++;
  if (hasExportKeyword(node)) stats.exported++;
  if (hasTypeParameters(node)) stats.genericDeclarations++;
}

/**
 * Records methods and accessors while capturing async usage.
 */
function handleMethodOrAccessor(
  node: tsCompiler.Node,
  stats: typeof jsts,
): void {
  stats.methods++;
  if (hasAsyncKeyword(node)) stats.asyncFunctions++;
  else stats.syncFunctions++;
}

/**
 * Records type alias export and generic metadata.
 */
function handleTypeAlias(node: tsCompiler.Node, stats: typeof jsts): void {
  if (hasExportKeyword(node)) stats.exported++;
  if (hasTypeParameters(node)) stats.genericDeclarations++;
}

/**
 * Records constant variable declarations and exported constant counts.
 */
function handleVariable(node: tsCompiler.Node, stats: typeof jsts): void {
  const statement = node as tsCompiler.VariableStatement;
  const isConst =
    (statement.declarationList.flags & tsCompiler.NodeFlags.Const) !== 0;
  if (isConst) {
    const count = statement.declarationList.declarations.length;
    stats.constants += count;
    if (hasExportKeyword(node)) stats.exported += count;
  }
}

/**
 * Returns true when a node includes the async modifier.
 */
function hasAsyncKeyword(node: tsCompiler.Node): boolean {
  const modifiers = tsCompiler.canHaveModifiers(node)
    ? tsCompiler.getModifiers(node)
    : undefined;
  return (
    modifiers?.some((m) => m.kind === tsCompiler.SyntaxKind.AsyncKeyword) ??
    false
  );
}

/**
 * Returns true when a node includes the export modifier.
 */
function hasExportKeyword(node: tsCompiler.Node): boolean {
  const modifiers = tsCompiler.canHaveModifiers(node)
    ? tsCompiler.getModifiers(node)
    : undefined;
  return (
    modifiers?.some((m) => m.kind === tsCompiler.SyntaxKind.ExportKeyword) ??
    false
  );
}

/**
 * Returns true when a declaration includes at least one type parameter.
 */
function hasTypeParameters(node: tsCompiler.Node): boolean {
  const nodeWithTypeParameters = node as tsCompiler.Node & {
    typeParameters?: unknown[];
  };
  return (
    "typeParameters" in node &&
    Array.isArray(nodeWithTypeParameters.typeParameters) &&
    nodeWithTypeParameters.typeParameters.length > 0
  );
}

const nodeHandlers: Partial<
  Record<
    tsCompiler.SyntaxKind,
    (node: tsCompiler.Node, stats: typeof jsts, insideClass: boolean) => unknown
  >
> = {
  [tsCompiler.SyntaxKind.ArrowFunction]: handleFunction,
  [tsCompiler.SyntaxKind.ClassDeclaration]: (node, stats) => {
    handleClass(node, stats);
    return true;
  },
  [tsCompiler.SyntaxKind.ClassExpression]: (node, stats) => {
    handleClass(node, stats);
    return true;
  },
  [tsCompiler.SyntaxKind.Decorator]: (_, stats) => {
    stats.decorators++;
  },
  [tsCompiler.SyntaxKind.EnumDeclaration]: handleEnum,
  [tsCompiler.SyntaxKind.FunctionDeclaration]: handleFunction,
  [tsCompiler.SyntaxKind.FunctionExpression]: handleFunction,
  [tsCompiler.SyntaxKind.GetAccessor]: handleMethodOrAccessor,
  [tsCompiler.SyntaxKind.ImportDeclaration]: handleImport,
  [tsCompiler.SyntaxKind.InterfaceDeclaration]: handleInterface,
  [tsCompiler.SyntaxKind.MethodDeclaration]: handleMethodOrAccessor,
  [tsCompiler.SyntaxKind.SetAccessor]: handleMethodOrAccessor,
  [tsCompiler.SyntaxKind.TypeAliasDeclaration]: handleTypeAlias,
  [tsCompiler.SyntaxKind.VariableStatement]: handleVariable,
};

/**
 * Traverses the AST and dispatches each node to a metric-specific handler.
 */
function walkNode(
  node: tsCompiler.Node,
  stats: typeof jsts,
  insideClass: boolean,
): void {
  const handler = nodeHandlers[node.kind];
  if (handler?.(node, stats, insideClass) === true) {
    tsCompiler.forEachChild(node, (child) => walkNode(child, stats, true));
    return;
  }
  tsCompiler.forEachChild(node, (child) => walkNode(child, stats, insideClass));
}

for (const filePath of sourceFilePaths) {
  const content = fs.readFileSync(filePath, "utf8");
  const extension = path.extname(filePath);
  const isTsx = extension === ".tsx" || extension === ".jsx";
  const isJs = JS_EXTENSIONS.has(extension);
  const scriptKind = isTsx
    ? tsCompiler.ScriptKind.TSX
    : isJs
      ? tsCompiler.ScriptKind.JS
      : tsCompiler.ScriptKind.TS;

  const sourceFile = tsCompiler.createSourceFile(
    filePath,
    content,
    tsCompiler.ScriptTarget.Latest,
    true, // setParentNodes — needed for parent checks in component detection
    scriptKind,
  );

  jsts.lines += content.split("\n").length;

  // Count TODO / FIXME in comments via full-text scan
  jsts.todos += (
    content.match(
      /\/\/.*\b(?:TODO|FIXME)\b|\/\*[\s\S]*?\b(?:TODO|FIXME)\b[\s\S]*?\*\//g,
    ) ?? []
  ).length;

  walkNode(sourceFile, jsts, false);
}

// 🐍 Python analysis

const py = JSON.parse(
  execSync("uv run python scripts/measure-code.py").toString().trim(),
) as {
  classes: number;
  constants: number;
  decorators: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
};

// 📊 Repo size

let repoBytes = 0;
for (const trackedFile of measuredTrackedFiles) {
  try {
    repoBytes += fs.statSync(trackedFile).size;
  } catch {
    /* ignore */
  }
}
const repoSizeMiB = (repoBytes / 1024 / 1024).toFixed(1);

// 📂 Folder count

// Derive from git-tracked files so the count is consistent across environments
// (avoids counting untracked dirs like .venv, __pycache__, etc.)
const trackedFolders = new Set<string>();
for (const filePath of measuredTrackedFiles) {
  const parts = filePath.split("/");
  for (let index = 1; index < parts.length; index++) {
    trackedFolders.add(parts.slice(0, index).join("/"));
  }
}
const folders = trackedFolders.size;

// 🏷️ Badge builder

const encode = (s: number | string): string =>
  String(s).replaceAll("-", "--").replaceAll("_", "__").replaceAll(" ", "_");

const badge = (label: string, value: number | string, color: string): string =>
  `![${label}](https://img.shields.io/badge/${encode(label)}-${encode(value)}-${color}?style=flat-square)`;

// 📦 Badge block

const badges = [
  badge("Lines of Code", jsts.lines + py.lines, "22c55e"),
  badge("Repo Size", `${repoSizeMiB} MiB`, "6b7280"),
  badge("Folders", folders, "4a4a4a"),
  badge("Source Files", jsts.tsFiles + jsts.jsFiles + py.files, "3178c6"),
  badge("Test Files", jsts.testFiles, "10b981"),
  badge("External Packages", jsts.externalPackages.size, "8b5cf6"),
  badge("Classes", jsts.classes + py.classes, "7c3aed"),
  badge("Functions", jsts.functions + jsts.methods + py.functions, "16a34a"),
  badge("Sync Functions", jsts.syncFunctions, "4ade80"),
  badge("Async Functions", jsts.asyncFunctions, "059669"),
  badge("Interfaces", jsts.interfaces + py.protocols, "0ea5e9"),
  badge("Generic Declarations", jsts.genericDeclarations, "0369a1"),
  badge("Enums", jsts.enums, "f97316"),
  badge("Constants", jsts.constants + py.constants, "dc2626"),
  badge("Imports", jsts.imports + py.imports, "0284c7"),
  badge("Decorators", jsts.decorators + py.decorators, "db2777"),
  badge("Exported Symbols", jsts.exported, "ea580c"),
  badge("TODO Comments", jsts.todos, "ca8a04"),
].join("\n");

const BLOCK = `<!-- CODE_STATISTICS_START -->\n${badges}\n<!-- CODE_STATISTICS_END -->`;

// 🧹 Difference calculation

/**
 * Generates a difference comparing expected and actual content using the system diff command.
 */
function calculateDifference(expected: string, actual: string): string {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(__dirname, "..", ".tmp-"),
  );
  const expectedFile = path.join(temporaryDirectory, "expected.txt");
  const actualFile = path.join(temporaryDirectory, "actual.txt");

  fs.writeFileSync(expectedFile, expected, "utf8");
  fs.writeFileSync(actualFile, actual, "utf8");

  try {
    return execSync(`diff -u "${actualFile}" "${expectedFile}"`, {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error: unknown) {
    // diff exits with status 1 when files differ; capture the output anyway
    const executionError = error as Record<string, unknown>;
    if (executionError["status"] === 1) {
      const standardOutput = executionError["stdout"];
      return typeof standardOutput === "string" ? standardOutput : "";
    }

    throw error;
  } finally {
    try {
      fs.rmSync(temporaryDirectory, { recursive: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}

// ✏️ Write or check

const readme = fs.readFileSync("README.md", "utf8");

if (!readme.includes("<!-- CODE_STATISTICS_START -->")) {
  console.error(
    "ERROR: README.md is missing <!-- CODE_STATISTICS_START --> marker.",
  );
  process.exit(1);
}

const current = new RegExp(
  String.raw`<!-- CODE_STATISTICS_START -->[\s\S]*?<!-- CODE_STATISTICS_END -->`,
).exec(readme)?.[0];

if (CHECK_MODE) {
  if (current === BLOCK) {
    console.log("✅ README code stats are up to date.");
    process.exit(0);
  } else {
    const actualContent = current ?? "(no block found)";
    const difference = calculateDifference(BLOCK, actualContent);
    console.error(
      `❌ README code stats are stale.\n` +
        `   Run \`nx run codebase:measure-code:write\` locally and commit the result.\n\n${
          difference
        }`,
    );
    process.exit(1);
  }
} else {
  const updated = readme.replace(
    new RegExp(
      String.raw`<!-- CODE_STATISTICS_START -->[\s\S]*?<!-- CODE_STATISTICS_END -->`,
    ),
    BLOCK,
  );
  fs.writeFileSync("README.md", updated, "utf8");
  console.log("✅ README.md code stats updated.");
}
