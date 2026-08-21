import './styles/main.css';

import wikiJson from './data/database-concepts.json';
import { renderSection } from './components/content';
import { initNavigation } from './components/navigation';
import type { WikiData } from './types';

const data = wikiJson as WikiData;

const contentRoot = document.querySelector<HTMLElement>('#app-content');
if (!contentRoot) throw new Error('No se encontró el contenedor principal #app-content.');

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

setText('site-name', data.site.name);
setText('site-tagline', data.site.tagline);
setText('footer-note', data.site.footerNote);

const showSection = (sectionId: string): void => {
  const section = data.sections.find((item) => item.id === sectionId) ?? data.sections[0];
  contentRoot.replaceChildren(renderSection(section));
  document.title = `${section.title} · ${data.site.name}`;
  window.scrollTo(0, 0);
};

initNavigation(data.sections, showSection);
