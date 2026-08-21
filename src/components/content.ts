import type { CodeBlock, ContentBlock, TableBlock, Topic, WikiSection } from '../types';
import { renderSimulator } from './simulatorUI';

export function createElement(tag: string, className?: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderParagraph(text: string): HTMLElement {
  return createElement('p', 'content-block', text);
}

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

function renderCode(block: CodeBlock): HTMLElement {
  const figure = createElement('figure', 'code-block');
  if (block.caption) figure.append(createElement('figcaption', 'code-block__caption', block.caption));

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = block.code;
  pre.append(code);
  figure.append(pre);

  return figure;
}

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
  }
}

function renderTopic(topic: Topic): HTMLElement {
  const article = createElement('article', 'topic');
  article.id = `tema-${topic.id}`;
  article.append(createElement('h2', 'topic__title', topic.title));
  for (const block of topic.blocks) article.append(renderBlock(block));
  return article;
}

export function renderSection(section: WikiSection): HTMLElement {
  const sectionElement = createElement('section', 'wiki-section');
  sectionElement.id = `seccion-${section.id}`;

  sectionElement.append(createElement('h1', 'wiki-section__title', section.title));
  if (section.intro) sectionElement.append(createElement('p', 'wiki-section__intro', section.intro));

  if (section.widget === 'simulador') sectionElement.append(renderSimulator());

  for (const topic of section.topics) sectionElement.append(renderTopic(topic));

  return sectionElement;
}
