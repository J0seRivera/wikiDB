import type { WikiSection } from '../types';

export function initNavigation(
  sections: WikiSection[],
  onSectionChange: (sectionId: string) => void,
): void {
  const navList = document.getElementById('nav-list');
  if (!navList) throw new Error('No se encontró el elemento <ul id="nav-list">.');

  const links = new Map<string, HTMLAnchorElement>();

  for (const section of sections) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#/${section.id}`;
    link.textContent = section.title;
    item.append(link);
    navList.append(item);
    links.set(section.id, link);
  }

  let currentId = '';

  function activate(sectionId: string): void {
    if (sectionId === currentId) return;
    currentId = sectionId;

    for (const [id, link] of links) {
      link.classList.toggle('is-active', id === sectionId);
      if (id === sectionId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    if (window.location.hash !== `#/${sectionId}`) {
      history.replaceState(null, '', `#/${sectionId}`);
    }

    onSectionChange(sectionId);
  }

  function sectionIdFromHash(): string {
    const candidate = window.location.hash.replace(/^#\/?/, '');
    return sections.some((section) => section.id === candidate) ? candidate : sections[0].id;
  }

  window.addEventListener('hashchange', () => activate(sectionIdFromHash()));
  activate(sectionIdFromHash());
}
