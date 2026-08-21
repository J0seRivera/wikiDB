// Tipos compartidos del simulador SQL.
//
// Aquí viven las tres familias de datos del motor:
//
//   1. Estructura de la base en memoria: Database → Table → Column/Row.
//   2. Consulta estructurada (ParsedQuery): el resultado de analizar el
//      texto SQL con parser.ts. Es una unión discriminada por `kind`.
//   3. Resultado de ejecución (QueryResult): lo que devuelve executor.ts y
//      que la interfaz traduce a tablas o mensajes.
//
// Al mantenerlos en un módulo propio, parser y executor comparten el mismo
// "contrato" sin conocerse entre sí.

// Error educativo del simulador: sus mensajes están escritos para guiar al
// estudiante (qué falló y cómo corregirlo). La interfaz los muestra tal
// cual; cualquier otro error se considera un fallo interno.
export class SimulatorError extends Error {}

export type ColumnType = 'number' | 'text';

// Valores permitidos en celdas y literales SQL del simulador.
export type SqlValueType = number | string;

export interface Column {
  name: string;
  type: ColumnType;
}

// Fila genérica: cada clave es el nombre de una columna.
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

// Condición WHERE ya separada en sus tres partes.
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

// DELETE exige WHERE por diseño: sin condición se borraría toda la tabla,
// así que el campo es obligatorio y el parser lo valida.
export interface DeleteQuery {
  kind: 'delete';
  table: string;
  where: WhereCondition;
}

// Unión discriminada por `kind`: permite que executor.ts use un switch
// exhaustivo sobre query.kind y que TypeScript deduzca el tipo concreto en
// cada rama.
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

// Resultado final que la interfaz presenta al usuario.
export type QueryResult = SelectResult | MutationResult | ErrorResult;
