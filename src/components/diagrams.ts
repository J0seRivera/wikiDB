// Diagramas educativos construidos con HTML y CSS (sin librerías externas).
//
// Responsabilidad: generar los elementos visuales de la sección Modelos y
// Arquitectura. Cada diagrama se selecciona por su identificador, que llega
// desde el JSON mediante un bloque { "type": "diagram", "id": "..." }.
//
// Se usa HTML/CSS en lugar de SVG o librerías de diagramas porque los nodos
// son texto real: los lectores de pantalla pueden leerlo, el navegador lo
// reacomoda solo en pantallas pequeñas y el mantenimiento es sencillo en un
// proyecto académico.

import { createElement } from './content';

interface EntityAttribute {
  name: string;
  key?: 'PK' | 'FK';
}

export function renderDiagram(id: string): HTMLElement {
  const builders: Record<string, () => HTMLElement> = {
    'er-modelo': renderErModel,
    'modelo-logico': renderLogicalModel,
    'cliente-servidor': renderClientServer,
    escalabilidad: renderScalability,
    replicacion: renderReplication,
    disponibilidad: renderAvailability,
  };

  const builder = builders[id];
  if (!builder) throw new Error(`Diagrama desconocido: ${id}`);
  return builder();
}

// Estructura común de todos los diagramas: <figure> con rol de grupo, una
// etiqueta accesible y un <figcaption> que explica qué representa.
function diagramFigure(label: string, caption: string, ...canvasChildren: HTMLElement[]): HTMLElement {
  const figure = createElement('figure', 'diagram');
  figure.setAttribute('role', 'group');
  figure.setAttribute('aria-label', label);

  const canvas = createElement('div', 'diagram__canvas');
  canvas.append(...canvasChildren);
  figure.append(canvas, createElement('figcaption', undefined, caption));
  return figure;
}

function nodeBox(title: string, subtitle?: string, body?: string): HTMLElement {
  const box = createElement('div', 'node-box');
  box.append(createElement('p', 'node-box__title', title));
  if (subtitle) box.append(createElement('p', 'node-box__subtitle', subtitle));
  if (body) box.append(createElement('p', 'node-box__body', body));
  return box;
}

// Flecha vertical entre nodos. El tono 'fail'/'success' cambia el color del
// glifo, pero la etiqueta textual mantiene el significado sin depender del
// color (requisito de accesibilidad).
function flowArrow(label?: string, tone: 'normal' | 'fail' | 'success' = 'normal'): HTMLElement {
  const arrow = createElement('div', `flow-arrow${tone === 'normal' ? '' : ` flow-arrow--${tone}`}`);
  const glyphs = { normal: '↓', fail: '✕', success: '↓' };
  arrow.append(createElement('span', 'flow-arrow__glyph', glyphs[tone]));
  if (label) arrow.append(createElement('span', 'flow-arrow__label', label));
  return arrow;
}

// Conector en forma de ⊓ dibujado solo con bordes CSS: une visualmente un
// nodo superior con dos nodos inferiores sin usar imágenes.
function branch(): HTMLElement {
  return createElement('div', 'diagram-branch');
}

// Tarjeta de entidad/tabla con sus atributos. Las claves se marcan con las
// etiquetas de texto PK/FK (no solo con color).
function entityCard(name: string, attributes: EntityAttribute[], variant?: 'logical'): HTMLElement {
  const card = createElement(
    'div',
    `entity-card${variant ? ` entity-card--${variant}` : ''}`,
  );
  card.append(createElement('p', 'entity-card__name', name));

  const list = createElement('ul', 'entity-card__attributes');
  for (const attribute of attributes) {
    const item = createElement('li');
    if (attribute.key) {
      item.append(createElement('span', `key-badge key-badge--${attribute.key.toLowerCase()}`, attribute.key));
    }
    item.append(createElement('span', undefined, attribute.name));
    list.append(item);
  }
  card.append(list);
  return card;
}

// Modelo conceptual: entidades con atributos y una relación etiquetada.
function renderErModel(): HTMLElement {
  return diagramFigure(
    'Diagrama del modelo Entidad-Relación entre CLIENTE y PEDIDO',
    'La entidad CLIENTE realiza muchos PEDIDOS (relación uno a muchos). Las etiquetas PK y FK indican la clave primaria y la clave foránea.',
    entityCard('CLIENTE', [
      { name: 'id_cliente', key: 'PK' },
      { name: 'nombre' },
      { name: 'correo' },
    ]),
    flowArrow('realiza · relación 1:N'),
    entityCard('PEDIDO', [
      { name: 'id_pedido', key: 'PK' },
      { name: 'fecha' },
      { name: 'id_cliente', key: 'FK' },
    ]),
  );
}

// Modelo lógico: mismas tablas pero mostrando cómo la relación se convierte
// en una clave foránea real. La variante 'logical' distingue visualmente
// ambos niveles del diseño.
function renderLogicalModel(): HTMLElement {
  return diagramFigure(
    'Diagrama del modelo lógico con las tablas cliente y pedido',
    'El modelo conceptual se convierte en tablas: cada entidad es una tabla y la relación se implementa con una clave foránea.',
    entityCard(
      'CLIENTE',
      [
        { name: 'id_cliente', key: 'PK' },
        { name: 'nombre' },
        { name: 'correo' },
      ],
      'logical',
    ),
    flowArrow('FOREIGN KEY (id_cliente) REFERENCES cliente'),
    entityCard(
      'PEDIDO',
      [
        { name: 'id_pedido', key: 'PK' },
        { name: 'fecha' },
        { name: 'id_cliente', key: 'FK' },
      ],
      'logical',
    ),
  );
}

function renderClientServer(): HTMLElement {
  return diagramFigure(
    'Diagrama de la arquitectura cliente-servidor',
    'Arquitectura cliente-servidor: cada componente cumple una función específica dentro del sistema.',
    nodeBox('CLIENTE', 'Frontend', 'Presenta la interfaz al usuario (HTML, CSS y JavaScript) y envía peticiones.'),
    flowArrow('Petición HTTP'),
    nodeBox('SERVIDOR', 'Backend', 'Procesa la lógica de negocio y atiende las peticiones de muchos clientes.'),
    flowArrow('Consultas SQL'),
    nodeBox('BASE DE DATOS', 'Persistencia', 'Almacena los datos de forma organizada, segura y duradera.'),
  );
}

// Dos paneles lado a lado (apilados en móvil por el grid auto-fit):
// vertical = un servidor más potente; horizontal = árbol de servidores.
function renderScalability(): HTMLElement {
  const verticalList = createElement('ul', 'scaling-list');
  for (const resource of ['más CPU', 'más RAM', 'más almacenamiento']) {
    verticalList.append(createElement('li', undefined, resource));
  }

  const verticalPanel = createElement('div', 'diagram-panel');
  verticalPanel.append(
    createElement('p', 'diagram-panel__title', 'Vertical (scale up)'),
    nodeBox('SERVIDOR ÚNICO'),
    flowArrow('se potencia con'),
    verticalList,
    createElement('p', 'diagram-panel__note', 'Un mismo servidor se hace más potente.'),
  );

  const pair = createElement('div', 'diagram-pair');
  pair.append(nodeBox('SERVIDOR 2'), nodeBox('SERVIDOR 3'));

  const horizontalTree = createElement('div', 'diagram-tree');
  horizontalTree.append(nodeBox('SERVIDOR 1'), branch(), pair);

  const horizontalPanel = createElement('div', 'diagram-panel');
  horizontalPanel.append(
    createElement('p', 'diagram-panel__title', 'Horizontal (scale out)'),
    horizontalTree,
    createElement('p', 'diagram-panel__note', 'Más servidores comparten la carga.'),
  );

  const columns = createElement('div', 'diagram-cols');
  columns.append(verticalPanel, horizontalPanel);

  return diagramFigure(
    'Comparación visual entre escalabilidad vertical y horizontal',
    'Escalabilidad vertical: potenciar un servidor. Escalabilidad horizontal: agregar más servidores que trabajen en conjunto.',
    columns,
  );
}

function renderReplication(): HTMLElement {
  const replicas = createElement('div', 'diagram-pair');
  replicas.append(
    nodeBox('RÉPLICA 1', 'Lecturas', 'Copia sincronizada que atiende consultas de lectura.'),
    nodeBox('RÉPLICA 2', 'Respaldo', 'Copia sincronizada lista para tomar el relevo.'),
  );

  return diagramFigure(
    'Diagrama de replicación Primary-Replica',
    'Replicación Primary-Replica: el servidor principal recibe las escrituras y propaga los cambios a las réplicas.',
    nodeBox('SERVIDOR PRINCIPAL', 'Primary', 'Recibe todas las escrituras.'),
    flowArrow('replica los cambios'),
    branch(),
    replicas,
  );
}

function renderAvailability(): HTMLElement {
  const pill = createElement('p', 'status-pill status-pill--success', '✓ Servicio disponible');

  return diagramFigure(
    'Diagrama de disponibilidad con redundancia y failover',
    'Disponibilidad: si el servidor principal falla, una réplica toma su lugar y el servicio permanece disponible.',
    nodeBox('SERVIDOR PRINCIPAL', 'Primary', 'Atiende el servicio normalmente.'),
    flowArrow('falla del servidor principal', 'fail'),
    nodeBox('SERVIDOR RÉPLICA', 'Failover', 'Detecta la falla y toma el relevo automáticamente.'),
    flowArrow('el servicio continúa', 'success'),
    pill,
  );
}
