// Interfaz del simulador SQL.
//
// Este componente conecta al usuario con el motor educativo. El flujo de
// datos completo es:
//
//   SQL escrito en el textarea
//     → parser.parseSql()        genera la consulta estructurada
//     → executor.executeQuery()  la ejecuta sobre la base en memoria
//     → resultado tipado (QueryResult)
//     → este componente lo presenta (tabla de resultados o mensaje ✓/✕)
//
// La base de datos vive a nivel de módulo (variable `database`): así los
// cambios hechos con INSERT/UPDATE/DELETE persisten mientras el usuario
// navega por la SPA y solo se pierden al recargar la página.
//
// Los botones de ejemplos NO ejecutan la consulta automáticamente: cargan el
// texto en el editor para que el estudiante presione "Ejecutar consulta" y
// relacione la acción con su resultado.

import { executeQuery } from '../simulator/executor';
import { parseSql } from '../simulator/parser';
import { createInitialDatabase, resetDatabase, USERS_TABLE } from '../simulator/database';
import { SimulatorError } from '../simulator/types';
import type { Database, QueryResult, Row } from '../simulator/types';
import { createElement } from './content';

const EXAMPLES: { label: string; sql: string }[] = [
  { label: 'Mostrar todos', sql: 'SELECT * FROM usuarios;' },
  { label: 'Seleccionar nombres', sql: 'SELECT nombre FROM usuarios;' },
  { label: 'Mayores de 25', sql: 'SELECT * FROM usuarios WHERE edad > 25;' },
  { label: 'Usuarios de Guatemala', sql: "SELECT * FROM usuarios WHERE ciudad = 'Guatemala';" },
  {
    label: 'Insertar usuario',
    sql: "INSERT INTO usuarios (nombre, edad, ciudad)\nVALUES ('Pedro', 24, 'Cobán');",
  },
  { label: 'Actualizar usuario', sql: 'UPDATE usuarios\nSET edad = 29\nWHERE id = 4;' },
  { label: 'Eliminar usuario', sql: 'DELETE FROM usuarios\nWHERE id = 5;' },
];

let database: Database = createInitialDatabase();

export function renderSimulator(): HTMLElement {
  const root = createElement('div', 'simulator');

  // Editor de consultas: un textarea sencillo es suficiente para el alcance
  // educativo del proyecto (sin editores externos ni resaltado de sintaxis).
  const editor = document.createElement('textarea');
  editor.id = 'sql-input';
  editor.className = 'simulator-editor';
  editor.rows = 6;
  editor.value = 'SELECT * FROM usuarios;';
  editor.spellcheck = false;
  editor.autocomplete = 'off';
  editor.setAttribute('autocapitalize', 'off');
  editor.setAttribute('aria-label', 'Consulta SQL');

  // Región viva: los lectores de pantalla anuncian los mensajes de resultado
  // sin mover el foco del usuario.
  const statusElement = createElement('p', 'query-status');
  statusElement.setAttribute('role', 'status');
  statusElement.setAttribute('aria-live', 'polite');

  const resultArea = createElement('div', 'simulator-result');
  const dataTableWrapper = createElement('div', 'simulator-data');

  const queryLabel = document.createElement('label');
  queryLabel.className = 'simulator-label';
  queryLabel.textContent = 'Escribe tu consulta SQL:';
  queryLabel.htmlFor = editor.id;

  const hint = createElement('p', 'simulator-hint', 'Consejo: presiona Ctrl + Enter para ejecutar la consulta.');

  const actions = createElement('div', 'simulator-actions');
  const runButton = createButton('Ejecutar consulta', 'primary');
  const clearButton = createButton('Limpiar', 'secondary');
  const resetButton = createButton('Restablecer datos', 'secondary');
  actions.append(runButton, clearButton, resetButton);

  const examplesTitle = createElement('p', 'simulator-label', 'Prueba estos ejemplos:');
  const examplesList = createElement('div', 'simulator-examples');
  for (const example of EXAMPLES) {
    const button = createButton(example.label, 'chip');
    button.addEventListener('click', () => loadExample(example.sql));
    examplesList.append(button);
  }

  // Tres paneles claramente separados: la consulta que se escribe, el
  // resultado de la última ejecución y el estado real de los datos. Verlos
  // juntos ayuda a entender que SELECT consulta y INSERT/UPDATE/DELETE
  // modifican la misma tabla.
  const queryCard = createElement('section', 'simulator-card');
  queryCard.append(
    createElement('h2', 'simulator-card__title', 'Consulta'),
    queryLabel,
    editor,
    hint,
    actions,
    examplesTitle,
    examplesList,
  );

  const resultCard = createElement('section', 'simulator-card');
  resultCard.append(createElement('h2', 'simulator-card__title', 'Resultado'), statusElement, resultArea);

  const dataCard = createElement('section', 'simulator-card');
  dataCard.append(
    createElement('h2', 'simulator-card__title', 'Datos actuales'),
    createElement('p', 'simulator-label', 'Datos actuales de la tabla usuarios'),
    dataTableWrapper,
  );

  root.append(queryCard, resultCard, dataCard);

  runButton.addEventListener('click', () => runQuery());
  clearButton.addEventListener('click', () => clearEditor());
  resetButton.addEventListener('click', () => resetData());
  editor.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runQuery();
    }
  });

  refreshDataTable();

  return root;

  function runQuery(): void {
    try {
      const query = parseSql(editor.value);
      showResult(executeQuery(database, query));
    } catch (error) {
      // SimulatorError contiene mensajes pensados para el estudiante y se
      // muestran tal cual. Cualquier otro error se registra en consola para
      // desarrollo y se muestra un mensaje genérico al usuario.
      if (error instanceof SimulatorError) {
        showResult({ kind: 'error', message: error.message });
      } else {
        console.error(error);
        showResult({ kind: 'error', message: 'Ocurrió un error inesperado al ejecutar la consulta.' });
      }
    }
    refreshDataTable();
  }

  function clearEditor(): void {
    editor.value = '';
    setStatus('info', 'El editor está listo. Escribe una consulta y presiona "Ejecutar consulta".');
    editor.focus();
  }

  function resetData(): void {
    resetDatabase(database);
    refreshDataTable();
    setStatus('success', '✓ Los datos de la tabla usuarios se restablecieron correctamente.');
  }

  function loadExample(sql: string): void {
    editor.value = sql;
    setStatus('info', 'Ejemplo cargado. Presiona "Ejecutar consulta" para verlo en acción.');
    editor.focus();
  }

  // Presenta el resultado según su tipo: SELECT dibuja una tabla; las
  // operaciones de escritura muestran cuántas filas fueron afectadas (o un
  // aviso si ninguna coincidió); los errores se muestran con ✕.
  function showResult(result: QueryResult): void {
    if (result.kind === 'error') {
      resultArea.replaceChildren();
      setStatus('error', `✕ Error: ${result.message}`);
      return;
    }

    if (result.kind === 'select') {
      if (result.rows.length === 0) {
        setStatus('info', 'La consulta se ejecutó correctamente, pero no devolvió registros.');
      } else {
        const count = `${result.rows.length} ${result.rows.length === 1 ? 'registro' : 'registros'}`;
        setStatus('success', `✓ Consulta ejecutada correctamente. ${count} devueltos.`);
        resultArea.replaceChildren(buildTable(result.columns, result.rows));
      }
      return;
    }

    resultArea.replaceChildren();

    if (result.kind === 'insert') {
      setStatus('success', '✓ Registro insertado correctamente.');
      return;
    }

    const action = result.kind === 'update' ? 'actualizado' : 'eliminado';
    if (result.rowsAffected === 0) {
      setStatus('info', `Ningún registro coincidió con la condición WHERE. No se ${action} ningún registro.`);
    } else {
      const count = `${result.rowsAffected} ${result.rowsAffected === 1 ? 'registro' : 'registros'}`;
      setStatus('success', `✓ ${count} ${action}${result.rowsAffected === 1 ? '' : 's'} correctamente.`);
    }
  }

  function setStatus(tone: 'success' | 'error' | 'info', message: string): void {
    statusElement.className = `query-status query-status--${tone}`;
    statusElement.textContent = message;
  }

  // Redibuja la tabla "Datos actuales" desde la base en memoria. Se llama
  // después de cada ejecución para que INSERT/UPDATE/DELETE se reflejen de
  // inmediato.
  function refreshDataTable(): void {
    const table = database.tables[USERS_TABLE];
    dataTableWrapper.replaceChildren(buildTable(table.columns.map((column) => column.name), table.rows));
  }
}

// Tabla HTML construida con textContent (nunca innerHTML): el contenido de
// las filas proviene del usuario y debe tratarse solo como texto.
function buildTable(columns: string[], rows: Row[]): HTMLElement {
  const wrapper = createElement('div', 'table-wrapper');
  const table = createElement('table', 'data-table');

  const headRow = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column;
    headRow.append(th);
  }
  const thead = document.createElement('thead');
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const column of columns) tr.append(createElement('td', undefined, String(row[column])));
    tbody.append(tr);
  }
  table.append(tbody);

  wrapper.append(table);
  return wrapper;
}

function createButton(label: string, variant: 'primary' | 'secondary' | 'chip'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button button--${variant}`;
  button.textContent = label;
  return button;
}
