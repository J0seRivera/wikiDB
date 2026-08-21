export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface NoticeBlock {
  type: 'notice';
  tone: 'info' | 'warning';
  text: string;
}

export interface ListBlock {
  type: 'list';
  style?: 'bulleted' | 'numbered';
  items: string[];
}

export interface TableBlock {
  type: 'table';
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface CodeBlock {
  type: 'code';
  caption?: string;
  code: string;
}

export type ContentBlock =
  | ParagraphBlock
  | NoticeBlock
  | ListBlock
  | TableBlock
  | CodeBlock;

export interface Topic {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

export interface WikiSection {
  id: string;
  title: string;
  intro?: string;
  widget?: 'simulador';
  topics: Topic[];
}

export interface SiteInfo {
  name: string;
  tagline: string;
  footerNote: string;
}

export interface WikiData {
  site: SiteInfo;
  sections: WikiSection[];
}
