// 🏷️ Types

import type { CssResult } from "../css/css.types";
import type { DiscoveryResult } from "../discovery/discovery.types";
import type { HclResult } from "../hcl/hcl.types";
import type { JsonResult } from "../json/json.types";
import type { JupyterResult } from "../jupyter/jupyter.types";
import type { MarkdownResult } from "../markdown/markdown.types";
import type { PythonResult } from "../python/python.types";
import type { ShellResult } from "../shell/shell.types";
import type { SqlResult } from "../sql/sql.types";
import type { TomlResult } from "../toml/toml.types";
import type { TypescriptResult } from "../typescript/typescript.types";
import type { YamlResult } from "../yaml/yaml.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/** Arguments accepted when running every language analyzer. */
export interface AnalyzeLanguagesArguments {
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: DiscoveryResult;
  workingDirectory: string;
}

/** What every language analyzer reported, keyed by language. */
export interface LanguageResults {
  css: CssResult;
  hcl: HclResult;
  json: JsonResult;
  jupyter: JupyterResult;
  markdown: MarkdownResult;
  python: PythonResult;
  shell: ShellResult;
  sql: SqlResult;
  toml: TomlResult;
  typescript: TypescriptResult;
  yaml: YamlResult;
}
