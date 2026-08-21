// Tipos e interfaces del contenido educativo.
//
// El archivo database-concepts.json contiene únicamente datos (sin HTML y sin
// lógica). Estas interfaces describen la estructura que debe tener ese JSON:
// al importarlo y ajustarlo con `as WikiData`, TypeScript verifica en tiempo
// de compilación que las secciones y sus bloques tengan la forma esperada.
//
// La jerarquía del contenido es:
//
//   WikiData
//     └── WikiSection  (una sección de la navegación, p. ej. "Fundamentos")
//           └── Topic  (un tema dentro de la sección, renderizado como artículo)
//                 └── ContentBlock  (la unidad mínima: párrafo, lista, tabla,
//                                     código, aviso, destacado, tarjetas,
//                                     diagrama, imagen o recurso externo)

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

export interface HighlightBlock {
  type: 'highlight';
  title?: string;
  text: string;
}

export interface InfoCard {
  title: string;
  text?: string;
  items?: string[];
  code?: string;
}

export interface CardsBlock {
  type: 'cards';
  cards: InfoCard[];
}

export interface DiagramBlock {
  type: 'diagram';
  id: string;
}

// Las imágenes educativas se referencian por id: el JSON guarda el dato y
// content.ts resuelve ese id a la URL real del archivo (importada por Vite).
// El texto alt viaja en el JSON porque es contenido educativo.
export interface ImageBlock {
  type: 'image';
  id: string;
  alt: string;
  caption?: string;
}

// Recurso externo complementario (un sitio para seguir practicando, por
// ejemplo). El JSON guarda solo datos: título, texto y enlace; el DOM y los
// atributos de seguridad los construye content.ts.
export interface ResourceBlock {
  type: 'resource';
  title: string;
  text: string;
  linkLabel: string;
  href: string;
}

export type ContentBlock =
  | ParagraphBlock
  | NoticeBlock
  | ListBlock
  | TableBlock
  | CodeBlock
  | HighlightBlock
  | CardsBlock
  | DiagramBlock
  | ImageBlock
  | ResourceBlock;

export interface Topic {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

// widget permite que una sección aloje un componente interactivo en lugar de
// solo bloques de lectura. Hoy el único valor es 'simulador'.
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
