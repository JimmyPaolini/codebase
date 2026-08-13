/**
 * Markdown AST node used by markdown validator services and tests.
 */
export interface MdastNode {
  [key: string]: unknown;
  alt?: string;
  children?: MdastNode[];
  depth?: number;
  lang?: null | string;
  language?: null | string;
  meta?: null | string;
  ordered?: boolean;
  position?: {
    end?: { column?: number; line?: number };
    start?: { column?: number; line?: number };
  };
  spread?: boolean;
  start?: number;
  title?: null | string;
  type: string;
  url?: string;
  value?: string;
}
