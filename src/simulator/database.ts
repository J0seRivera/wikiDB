// Base de datos educativa en memoria.
//
// El simulador no usa un motor real: la "base de datos" es un objeto
// JavaScript que vive mientras la página está abierta. Recargar borra los
// cambios, y el botón "Restablecer datos" vuelve al estado inicial sin
// recargar.
//
// createUsuariosTable() devuelve un objeto nuevo cada vez que se llama. Eso
// es intencional: si todas las bases compartieran la misma referencia a las
// filas, un INSERT hecho por el usuario contaminaría el estado inicial y el
// botón de restablecer no funcionaría.

import type { Database, Table } from './types';

// Nombre único de tabla del simulador; también lo usa la interfaz para
// dibujar el panel "Datos actuales".
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

// Reemplaza el contenido de la base existente (misma referencia) con una
// copia fresca del estado inicial.
export function resetDatabase(database: Database): void {
  database.tables = { [USERS_TABLE]: createUsuariosTable() };
}
