// Ejecutor de consultas sobre la base en memoria.
//
// Recibe una ParsedQuery (ya validada por el parser) y la aplica a la base:
//
//   SELECT → filtra con WHERE y proyecta las columnas pedidas.
//   INSERT → construye la fila, asigna el id y la agrega.
//   UPDATE → modifica las filas que cumplen la condición.
//   DELETE → conserva solo las filas que NO cumplen la condición.
//
// Este módulo es el ÚNICO autorizado a mutar la base de datos. Antes de
// tocar nada valida tablas, columnas y tipos; si algo falla lanza un
// SimulatorError con un mensaje pensado para el estudiante. Las validaciones
// se hacen siempre ANTES de modificar: así una consulta inválida nunca deja
// la tabla a medias.

import { SimulatorError } from './types';
import type {
  Column,
  ComparisonOperator,
  Database,
  ParsedQuery,
  QueryResult,
  Row,
  SqlValueType,
  Table,
  WhereCondition,
} from './types';

interface ResolvedCondition {
  columnName: string;
  operator: ComparisonOperator;
  value: SqlValueType;
}

export function executeQuery(database: Database, query: ParsedQuery): QueryResult {
  switch (query.kind) {
    case 'select':
      return executeSelect(database, query);
    case 'insert':
      return executeInsert(database, query);
    case 'update':
      return executeUpdate(database, query);
    case 'delete':
      return executeDelete(database, query);
  }
}

function getTable(database: Database, name: string): Table {
  const table = database.tables[name.toLowerCase()];
  if (!table) {
    const available = Object.keys(database.tables).join(', ');
    throw new SimulatorError(`La tabla "${name}" no existe. Tablas disponibles: ${available}.`);
  }
  return table;
}

function getColumn(table: Table, name: string): Column {
  const column = table.columns.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!column) {
    throw new SimulatorError(`La columna "${name}" no existe en la tabla "${table.name}".`);
  }
  return column;
}

// Comprueba que el literal del SQL coincida con el tipo declarado de la
// columna: números sin comillas, texto entre comillas simples.
function validateValue(column: Column, value: SqlValueType): void {
  if (column.type === 'number' && typeof value !== 'number') {
    throw new SimulatorError(`La columna "${column.name}" espera un valor numérico.`);
  }
  if (column.type === 'text' && typeof value !== 'string') {
    throw new SimulatorError(`La columna "${column.name}" espera un texto entre comillas simples.`);
  }
}

// Valida una condición WHERE contra el esquema y devuelve el nombre real de
// la columna (la búsqueda no distingue mayúsculas/minúsculas).
function resolveCondition(table: Table, condition: WhereCondition): ResolvedCondition {
  const column = getColumn(table, condition.column);
  validateValue(column, condition.value);
  return { columnName: column.name, operator: condition.operator, value: condition.value };
}

// Ordena cualquier par de valores: numéricos por magnitud y el resto como
// texto. Permite usar > < >= <= también sobre columnas de texto.
function compareValues(a: SqlValueType, b: SqlValueType): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function rowMatches(row: Row, condition: ResolvedCondition): boolean {
  const cell = row[condition.columnName];
  switch (condition.operator) {
    case '=':
      return cell === condition.value;
    case '>':
      return compareValues(cell, condition.value) > 0;
    case '<':
      return compareValues(cell, condition.value) < 0;
    case '>=':
      return compareValues(cell, condition.value) >= 0;
    case '<=':
      return compareValues(cell, condition.value) <= 0;
  }
}

// El id es autogenerado: máximo actual + 1. Así los ids nunca se repiten,
// aunque se eliminen filas intermedias.
function nextId(rows: Row[]): number {
  return rows.reduce((max, row) => Math.max(max, Number(row['id'])), 0) + 1;
}

function executeSelect(database: Database, query: Extract<ParsedQuery, { kind: 'select' }>): QueryResult {
  const table = getTable(database, query.table);

  // "*" se expande al esquema completo; las demás columnas se validan una
  // por una antes de leer filas.
  const resultColumns = query.columns.includes('*')
    ? table.columns.map((column) => column.name)
    : query.columns.map((name) => getColumn(table, name).name);

  const condition = query.where ? resolveCondition(table, query.where) : null;
  const matchingRows = condition
    ? table.rows.filter((row) => rowMatches(row, condition))
    : table.rows;

  // Proyección: cada fila devuelta contiene únicamente las columnas
  // solicitadas, en el orden pedido.
  const rows = matchingRows.map((row) => {
    const projected: Row = {};
    for (const name of resultColumns) projected[name] = row[name];
    return projected;
  });

  return { kind: 'select', columns: resultColumns, rows };
}

function executeInsert(database: Database, query: Extract<ParsedQuery, { kind: 'insert' }>): QueryResult {
  const table = getTable(database, query.table);

  for (const name of query.columns) {
    const column = getColumn(table, name);
    if (column.name === 'id') {
      throw new SimulatorError('La columna "id" se genera automáticamente y no debe incluirse en el INSERT.');
    }
  }

  // La fila se arma completa (con su id) y todos los valores se validan
  // ANTES de insertarla: si algo falla, la tabla queda intacta.
  const row: Row = { id: nextId(table.rows) };
  query.columns.forEach((name, index) => {
    const column = getColumn(table, name);
    validateValue(column, query.values[index]);
    row[column.name] = query.values[index];
  });

  table.rows.push(row);
  return { kind: 'insert', rowsAffected: 1 };
}

function executeUpdate(database: Database, query: Extract<ParsedQuery, { kind: 'update' }>): QueryResult {
  const table = getTable(database, query.table);

  // Igual que en INSERT: primero se resuelven y validan todas las
  // asignaciones, después se modifican las filas.
  const assignments = query.assignments.map((assignment) => ({
    column: getColumn(table, assignment.column),
    value: assignment.value,
  }));
  for (const assignment of assignments) validateValue(assignment.column, assignment.value);

  const condition = query.where ? resolveCondition(table, query.where) : null;

  let rowsAffected = 0;
  for (const row of table.rows) {
    if (condition && !rowMatches(row, condition)) continue;
    for (const assignment of assignments) row[assignment.column.name] = assignment.value;
    rowsAffected++;
  }

  return { kind: 'update', rowsAffected };
}

function executeDelete(database: Database, query: Extract<ParsedQuery, { kind: 'delete' }>): QueryResult {
  const table = getTable(database, query.table);
  const condition = resolveCondition(table, query.where);

  // Filtrado inverso: sobreviven las filas que NO cumplen la condición. El
  // conteo previo permite informar cuántas filas fueron eliminadas.
  const totalBefore = table.rows.length;
  table.rows = table.rows.filter((row) => !rowMatches(row, condition));

  return { kind: 'delete', rowsAffected: totalBefore - table.rows.length };
}
