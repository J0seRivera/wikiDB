// Renderizado del contenido educativo.
//
// Este módulo convierte los datos tipados del JSON en elementos del DOM:
//
//   JSON → contenido tipado (WikiData) → renderBlock() → DOM
//
// Cada tipo de bloque tiene su propia función de renderizado (párrafo, lista,
// tabla, código, aviso, destacado, tarjetas, diagrama, imagen y recurso
// externo). Todos los
// textos se insertan con textContent, nunca con innerHTML: el contenido no
// puede interpretarse como HTML, una buena práctica incluso trabajando con
// datos propios.
//
// El helper createElement() se exporta porque otros componentes (diagramas y
// simulador) construyen sus interfaces con la misma convención.

import type {
  CardsBlock,
  CodeBlock,
  ContentBlock,
  HighlightBlock,
  ImageBlock,
  ResourceBlock,
  TableBlock,
  Topic,
  WikiSection,
} from '../types';
import { renderDiagram } from './diagrams';
import { renderSimulator } from './simulatorUI';

// Vite resuelve estas importaciones como URLs finales del asset (con hash en
// producción). El JSON solo guarda el id; aquí se traduce a la ruta real.
import clienteServidorImg from '../assets/cliente-servidor.jpg';
import entidadRelacionImg from '../assets/entidad-relacion.jpg';
import escalabilidadImg from '../assets/escalabilidad-h-v.webp';

const IMAGE_SOURCES: Record<string, string> = {
  'cliente-servidor': clienteServidorImg,
  'entidad-relacion': entidadRelacionImg,
  escalabilidad: escalabilidadImg,
};

export function createElement(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderParagraph(text: string): HTMLElement {
  return createElement('p', 'content-block', text);
}

// Los avisos combinan un símbolo (ℹ / ⚠) con el texto: el significado no
// depende únicamente del color, lo que mejora la accesibilidad.
function renderNotice(tone: 'info' | 'warning', text: string): HTMLElement {
  const icons = { info: 'ℹ', warning: '⚠' } as const;
  const notice = createElement('p', `notice notice--${tone}`);
  notice.append(
    createElement('span', 'notice__icon', icons[tone]),
    createElement('span', 'notice__text', text),
  );
  return notice;
}

function renderList(style: 'bulleted' | 'numbered', items: string[]): HTMLElement {
  const list = createElement(style === 'numbered' ? 'ol' : 'ul', 'content-block block-list');
  for (const item of items) list.append(createElement('li', undefined, item));
  return list;
}

// Las tablas van dentro de un contenedor con overflow-x: así pueden hacer
// scroll horizontal ellas solas en móvil sin deformar el resto de la página.
function renderTable(block: TableBlock): HTMLElement {
  const wrapper = createElement('div', 'table-wrapper');
  const table = createElement('table', 'data-table');

  if (block.caption) table.append(createElement('caption', undefined, block.caption));

  const headRow = document.createElement('tr');
  for (const header of block.headers) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = header;
    headRow.append(th);
  }
  const thead = document.createElement('thead');
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (const row of block.rows) {
    const tr = document.createElement('tr');
    for (const cell of row) tr.append(createElement('td', undefined, cell));
    tbody.append(tr);
  }
  table.append(tbody);

  wrapper.append(table);
  return wrapper;
}

// Se separó del bloque 'code' para reutilizarla dentro de las tarjetas.
function renderCodeFigure(code: string, caption?: string): HTMLElement {
  const figure = createElement('figure', 'code-block');
  if (caption) figure.append(createElement('figcaption', 'code-block__caption', caption));

  const pre = document.createElement('pre');
  const codeElement = document.createElement('code');
  codeElement.textContent = code;
  pre.append(codeElement);
  figure.append(pre);

  return figure;
}

function renderCode(block: CodeBlock): HTMLElement {
  return renderCodeFigure(block.code, block.caption);
}

function renderHighlight(block: HighlightBlock): HTMLElement {
  const aside = createElement('aside', 'highlight');
  if (block.title) aside.append(createElement('p', 'highlight__title', block.title));
  aside.append(createElement('p', 'highlight__text', block.text));
  return aside;
}

// Tarjetas flexibles: cada una puede combinar título, texto, lista y código
// (por ejemplo, los comandos DDL/DML o los tipos de datos).
function renderCards(block: CardsBlock): HTMLElement {
  const grid = createElement('div', 'card-grid');

  for (const card of block.cards) {
    const article = createElement('article', 'info-card');
    article.append(createElement('h3', 'info-card__title', card.title));
    if (card.text) article.append(createElement('p', 'info-card__text', card.text));
    if (card.items) {
      const list = createElement('ul', 'info-card__list');
      for (const item of card.items) list.append(createElement('li', undefined, item));
      article.append(list);
    }
    if (card.code) article.append(renderCodeFigure(card.code));
    grid.append(article);
  }

  return grid;
}

// Imagen educativa proporcionada por el desarrollador. El alt viaja en el
// JSON y es obligatorio: describe el propósito educativo de la imagen.
function renderImage(block: ImageBlock): HTMLElement {
  const src = IMAGE_SOURCES[block.id];
  if (!src) throw new Error(`Imagen desconocida: ${block.id}`);

  const figure = createElement('figure', 'edu-image');
  const img = document.createElement('img');
  img.src = src;
  img.alt = block.alt;
  img.loading = 'lazy';
  figure.append(img);
  if (block.caption) figure.append(createElement('figcaption', undefined, block.caption));
  return figure;
}

// Recurso externo complementario: una tarjeta con texto y un enlace para
// seguir practicando fuera de la wiki. El enlace abre en pestaña nueva y
// lleva rel="noopener noreferrer": el sitio externo no obtiene acceso a
// window.opener y la aplicación sigue funcionando de forma independiente.
// Reutiliza los estilos existentes (.highlight + .button--primary); solo se
// ajusta el display del enlace en CSS porque es un <a> y no un <button>.
function renderResource(block: ResourceBlock): HTMLElement {
  const aside = createElement('aside', 'highlight resource-card');
  aside.append(createElement('p', 'highlight__title', block.title));
  aside.append(createElement('p', 'highlight__text', block.text));

  const link = document.createElement('a');
  link.className = 'button button--primary';
  link.href = block.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = block.linkLabel;
  aside.append(link);

  return aside;
}

// Punto único de despacho: según el tipo de bloque, delega al renderer
// correspondiente. Agregar un tipo nuevo de contenido = agregar una interfaz
// en types.ts + un caso aquí + su función de renderizado.
function renderBlock(block: ContentBlock): HTMLElement {
  switch (block.type) {
    case 'paragraph':
      return renderParagraph(block.text);
    case 'notice':
      return renderNotice(block.tone, block.text);
    case 'list':
      return renderList(block.style ?? 'bulleted', block.items);
    case 'table':
      return renderTable(block);
    case 'code':
      return renderCode(block);
    case 'highlight':
      return renderHighlight(block);
    case 'cards':
      return renderCards(block);
    case 'diagram':
      return renderDiagram(block.id);
    case 'image':
      return renderImage(block);
    case 'resource':
      return renderResource(block);
  }
}

function renderTopic(topic: Topic): HTMLElement {
  const article = createElement('article', 'topic');
  article.id = `tema-${topic.id}`;
  article.append(createElement('h2', 'topic__title', topic.title));
  for (const block of topic.blocks) article.append(renderBlock(block));
  return article;
}

// Renderiza una sección completa. Si la sección declara un widget (como el
// simulador), este se inserta antes de los temas de lectura.
export function renderSection(section: WikiSection): HTMLElement {
  const sectionElement = createElement('section', 'wiki-section');
  sectionElement.id = `seccion-${section.id}`;

  sectionElement.append(createElement('h1', 'wiki-section__title', section.title));
  if (section.intro) sectionElement.append(createElement('p', 'wiki-section__intro', section.intro));

  if (section.widget === 'simulador') sectionElement.append(renderSimulator());

  for (const topic of section.topics) sectionElement.append(renderTopic(topic));

  return sectionElement;
}
