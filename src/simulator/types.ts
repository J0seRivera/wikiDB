export class SimulatorError extends Error {}

export type ColumnType = 'number' | 'text';

export type SqlValueType = number | string;

export interface Column {
  name: string;
  type: ColumnType;
}

export type Row = Record<string, SqlValueType>;

export interface Table {
  name: string;
  columns: Column[];
  rows: Row[];
}

export interface Database {
  tables: Record<string, Table>;
}

export type ComparisonOperator = '=' | '>' | '<' | '>=' | '<=';

export interface WhereCondition {
  column: string;
  operator: ComparisonOperator;
  value: SqlValueType;
}

export interface SelectQuery {
  kind: 'select';
  columns: string[];
  table: string;
  where?: WhereCondition;
}

export interface Assignment {
  column: string;
  value: SqlValueType;
}

export interface InsertQuery {
  kind: 'insert';
  table: string;
  columns: string[];
  values: SqlValueType[];
}

export interface UpdateQuery {
  kind: 'update';
  table: string;
  assignments: Assignment[];
  where?: WhereCondition;
}

export interface DeleteQuery {
  kind: 'delete';
  table: string;
  where: WhereCondition;
}

export type ParsedQuery = SelectQuery | InsertQuery | UpdateQuery | DeleteQuery;

export interface SelectResult {
  kind: 'select';
  columns: string[];
  rows: Row[];
}

export interface MutationResult {
  kind: 'insert' | 'update' | 'delete';
  rowsAffected: number;
}

export interface ErrorResult {
  kind: 'error';
  message: string;
}

export type QueryResult = SelectResult | MutationResult | ErrorResult;
