// Punto de entrada de la aplicación.
//
// Aquí se cargan los estilos globales, se importa el contenido educativo
// desde el JSON y se inicializa la navegación SPA. El flujo es:
//
//   database-concepts.json (datos) → renderSection() (DOM) → <main>
//
// El contenido educativo vive fuera del código TypeScript a propósito: los
// textos de la wiki pueden modificarse sin tocar la lógica de renderizado.

import './styles/main.css';

import wikiJson from './data/database-concepts.json';
import { renderSection } from './components/content';
import { initNavigation } from './components/navigation';
import type { WikiData } from './types';

// El JSON importado se ajusta a la interfaz WikiData: si el archivo no
// cumple la estructura declarada en types.ts, la compilación falla.
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

// Muestra una sección: reemplaza el contenido de <main>, actualiza el título
// del documento y regresa al inicio de la página.
// Es una función flecha (y no una declaración function) porque TypeScript
// solo conserva la validación "contentRoot no es null" dentro de funciones
// definidas después de la comprobación.
const showSection = (sectionId: string): void => {
  const section = data.sections.find((item) => item.id === sectionId) ?? data.sections[0];
  contentRoot.replaceChildren(renderSection(section));
  document.title = `${section.title} · ${data.site.name}`;
  window.scrollTo(0, 0);
};

// La navegación invoca showSection cada vez que cambia la sección activa,
// ya sea por un clic en el menú o por los botones atrás/adelante.
initNavigation(data.sections, showSection);
