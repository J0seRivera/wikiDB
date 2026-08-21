// Navegación SPA basada en hashes (#/fundamentos).
//
// ¿Por qué hashes? Cambiar el hash no recarga la página y queda registrado
// en el historial del navegador, de modo que los botones atrás/adelante
// siguen funcionando sin necesidad de un router externo.
//
// Flujo completo:
//   clic en un enlace  →  cambia location.hash
//     →  se dispara el evento "hashchange"
//     →  se resuelve el id de la sección a partir del hash
//     →  se marca el enlace activo (clase CSS + aria-current="page")
//     →  se avisa a la aplicación con onSectionChange para renderizarla.

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

  // Marca el enlace activo y notifica qué sección debe mostrarse. El guard
  // evita renderizar dos veces la misma sección (por ejemplo, al hacer clic
  // en el enlace ya activo).
  function activate(sectionId: string): void {
    if (sectionId === currentId) return;
    currentId = sectionId;

    for (const [id, link] of links) {
      link.classList.toggle('is-active', id === sectionId);
      if (id === sectionId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    // Normaliza la URL si el hash inicial era inválido o no existía, para
    // que el enlace activo y la dirección siempre coincidan. Se usa
    // replaceState para no agregar entradas extra al historial.
    if (window.location.hash !== `#/${sectionId}`) {
      history.replaceState(null, '', `#/${sectionId}`);
    }

    onSectionChange(sectionId);
  }

  // Traduce el hash actual ("#/sql") a un id conocido. Si el hash no
  // corresponde a ninguna sección (o está vacío), se muestra la primera.
  function sectionIdFromHash(): string {
    const candidate = window.location.hash.replace(/^#\/?/, '');
    return sections.some((section) => section.id === candidate) ? candidate : sections[0].id;
  }

  window.addEventListener('hashchange', () => activate(sectionIdFromHash()));
  activate(sectionIdFromHash());
}
