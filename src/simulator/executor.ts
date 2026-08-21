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

function validateValue(column: Column, value: SqlValueType): void {
  if (column.type === 'number' && typeof value !== 'number') {
    throw new SimulatorError(`La columna "${column.name}" espera un valor numérico.`);
  }
  if (column.type === 'text' && typeof value !== 'string') {
    throw new SimulatorError(`La columna "${column.name}" espera un texto entre comillas simples.`);
  }
}

function resolveCondition(table: Table, condition: WhereCondition): ResolvedCondition {
  const column = getColumn(table, condition.column);
  validateValue(column, condition.value);
  return { columnName: column.name, operator: condition.operator, value: condition.value };
}

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

function nextId(rows: Row[]): number {
  return rows.reduce((max, row) => Math.max(max, Number(row['id'])), 0) + 1;
}

function executeSelect(database: Database, query: Extract<ParsedQuery, { kind: 'select' }>): QueryResult {
  const table = getTable(database, query.table);

  const resultColumns = query.columns.includes('*')
    ? table.columns.map((column) => column.name)
    : query.columns.map((name) => getColumn(table, name).name);

  const condition = query.where ? resolveCondition(table, query.where) : null;
  const matchingRows = condition
    ? table.rows.filter((row) => rowMatches(row, condition))
    : table.rows;

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

  const totalBefore = table.rows.length;
  table.rows = table.rows.filter((row) => !rowMatches(row, condition));

  return { kind: 'delete', rowsAffected: totalBefore - table.rows.length };
}
