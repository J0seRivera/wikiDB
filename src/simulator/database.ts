import type { Database, Table } from './types';

export const USERS_TABLE = 'usuarios';

function createUsuariosTable(): Table {
  return {
    name: USERS_TABLE,
    columns: [
      { name: 'id', type: 'number' },
      { name: 'nombre', type: 'text' },
      { name: 'edad', type: 'number' },
      { name: 'ciudad', type: 'text' },
    ],
    rows: [
      { id: 1, nombre: 'Ana', edad: 22, ciudad: 'Guatemala' },
      { id: 2, nombre: 'Carlos', edad: 25, ciudad: 'Quetzaltenango' },
      { id: 3, nombre: 'María', edad: 30, ciudad: 'Antigua' },
      { id: 4, nombre: 'José', edad: 28, ciudad: 'Guatemala' },
      { id: 5, nombre: 'Luis', edad: 35, ciudad: 'Escuintla' },
    ],
  };
}

export function createInitialDatabase(): Database {
  return { tables: { [USERS_TABLE]: createUsuariosTable() } };
}

export function resetDatabase(database: Database): void {
  database.tables = { [USERS_TABLE]: createUsuariosTable() };
}
