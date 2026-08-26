// ♟️ Constants

/** The handlers a computed member name selects between at runtime. */
export const REPORT_HANDLERS: Record<string, () => string> = {
  csv: () => "csv",
  json: () => "json",
};
