import { SimulatorError } from './types';
import type { Assignment, ParsedQuery, SqlValueType, WhereCondition } from './types';

type TokenType = 'word' | 'number' | 'string' | 'symbol';

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = ['=', '>', '<', '>=', '<='];

export function parseSql(sql: string): ParsedQuery {
  const trimmed = sql.trim();
  if (!trimmed) throw new SimulatorError('La consulta está vacía. Escribe una instrucción SQL.');

  const withoutFinalSemicolon = trimmed.replace(/;+\s*$/, '');
  if (withoutFinalSemicolon.includes(';')) {
    throw new SimulatorError('Solo se puede ejecutar una consulta a la vez.');
  }

  const cursor = createCursor(tokenize(withoutFinalSemicolon));
  const first = cursor.advance();
  if (first.type !== 'word') {
    throw new SimulatorError('Consulta no válida. Debe iniciar con SELECT, INSERT, UPDATE o DELETE.');
  }

  switch (first.value.toUpperCase()) {
    case 'SELECT': {
      const query = parseSelect(cursor);
      ensureEnd(cursor);
      return query;
    }
    case 'INSERT': {
      const query = parseInsert(cursor);
      ensureEnd(cursor);
      return query;
    }
    case 'UPDATE': {
      const query = parseUpdate(cursor);
      ensureEnd(cursor);
      return query;
    }
    case 'DELETE': {
      const query = parseDelete(cursor);
      ensureEnd(cursor);
      return query;
    }
    default:
      throw new SimulatorError(
        `El comando "${first.value}" no está soportado. Usa SELECT, INSERT, UPDATE o DELETE.`,
      );
  }
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  while (position < sql.length) {
    const char = sql[position];

    if (/\s/.test(char)) {
      position++;
      continue;
    }

    if (char === "'") {
      const closing = sql.indexOf("'", position + 1);
      if (closing === -1) {
        throw new SimulatorError('Falta la comilla simple de cierre en un valor de texto.');
      }
      tokens.push({ type: 'string', value: sql.slice(position + 1, closing) });
      position = closing + 1;
      continue;
    }

    const twoChars = sql.slice(position, position + 2);
    if (twoChars === '>=' || twoChars === '<=') {
      tokens.push({ type: 'symbol', value: twoChars });
      position += 2;
      continue;
    }

    if ('*=<>(),'.includes(char)) {
      tokens.push({ type: 'symbol', value: char });
      position++;
      continue;
    }

    const wordMatch = sql.slice(position).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (wordMatch) {
      tokens.push({ type: 'word', value: wordMatch[0] });
      position += wordMatch[0].length;
      continue;
    }

    const numberMatch = sql.slice(position).match(/^-?\d+(\.\d+)?/);
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] });
      position += numberMatch[0].length;
      continue;
    }

    throw new SimulatorError(
      `El carácter "${char}" no es válido. Si es un valor de texto, escríbelo entre comillas simples.`,
    );
  }

  return tokens;
}

interface TokenCursor {
  peek(): Token | undefined;
  advance(): Token;
  isAtEnd(): boolean;
  matchSymbol(symbol: string): boolean;
  expectSymbol(symbol: string): void;
  matchKeyword(keyword: string): boolean;
  expectKeyword(keyword: string): void;
}

function createCursor(tokens: Token[]): TokenCursor {
  let position = 0;

  return {
    peek() {
      return tokens[position];
    },
    advance() {
      const token = tokens[position];
      if (!token) throw new SimulatorError('La consulta está incompleta.');
      position++;
      return token;
    },
    isAtEnd() {
      return position >= tokens.length;
    },
    matchSymbol(symbol) {
      const token = tokens[position];
      if (token && token.type === 'symbol' && token.value === symbol) {
        position++;
        return true;
      }
      return false;
    },
    expectSymbol(symbol) {
      const token = this.advance();
      if (token.type !== 'symbol' || token.value !== symbol) {
        throw new SimulatorError(`Se esperaba el símbolo "${symbol}" cerca de "${token.value}".`);
      }
    },
    matchKeyword(keyword) {
      const token = tokens[position];
      if (token && token.type === 'word' && token.value.toUpperCase() === keyword) {
        position++;
        return true;
      }
      return false;
    },
    expectKeyword(keyword) {
      const token = this.advance();
      if (token.type !== 'word' || token.value.toUpperCase() !== keyword) {
        throw new SimulatorError(`Se esperaba la palabra clave "${keyword}" cerca de "${token.value}".`);
      }
    },
  };
}

function readIdentifier(cursor: TokenCursor): string {
  const token = cursor.advance();
  if (token.type !== 'word') {
    throw new SimulatorError(`Se esperaba un nombre y se encontró "${token.value}".`);
  }
  return token.value;
}

function readValue(cursor: TokenCursor): SqlValueType {
  const token = cursor.advance();
  if (token.type === 'number') return Number(token.value);
  if (token.type === 'string') return token.value;
  throw new SimulatorError('Se esperaba un valor: escribe un número o un texto entre comillas simples.');
}

function readCondition(cursor: TokenCursor): WhereCondition {
  const column = readIdentifier(cursor);

  const operatorToken = cursor.advance();
  if (operatorToken.type !== 'symbol' || !OPERATORS.includes(operatorToken.value)) {
    throw new SimulatorError('Se esperaba un operador de comparación: =, >, <, >= o <=.');
  }

  const value = readValue(cursor);
  return { column, operator: operatorToken.value as WhereCondition['operator'], value };
}

function parseSelect(cursor: TokenCursor): ParsedQuery {
  const columns: string[] = [];

  if (cursor.matchSymbol('*')) {
    columns.push('*');
  } else {
    do {
      columns.push(readIdentifier(cursor));
    } while (cursor.matchSymbol(','));
  }

  cursor.expectKeyword('FROM');
  const table = readIdentifier(cursor);

  let where: WhereCondition | undefined;
  if (cursor.matchKeyword('WHERE')) where = readCondition(cursor);

  return { kind: 'select', columns, table, where };
}

function parseInsert(cursor: TokenCursor): ParsedQuery {
  cursor.expectKeyword('INTO');
  const table = readIdentifier(cursor);

  if (cursor.matchKeyword('VALUES')) {
    throw new SimulatorError(
      'INSERT requiere la lista de columnas, por ejemplo: INSERT INTO usuarios (nombre, edad, ciudad) VALUES (...);',
    );
  }

  cursor.expectSymbol('(');
  const columns: string[] = [];
  do {
    columns.push(readIdentifier(cursor));
  } while (cursor.matchSymbol(','));
  cursor.expectSymbol(')');

  if (!cursor.matchKeyword('VALUES')) {
    throw new SimulatorError('INSERT requiere la cláusula VALUES.');
  }

  cursor.expectSymbol('(');
  const values: SqlValueType[] = [];
  do {
    values.push(readValue(cursor));
  } while (cursor.matchSymbol(','));
  cursor.expectSymbol(')');

  if (columns.length !== values.length) {
    throw new SimulatorError(
      `La consulta indica ${columns.length} columna(s) pero ${values.length} valor(es).`,
    );
  }

  return { kind: 'insert', table, columns, values };
}

function parseUpdate(cursor: TokenCursor): ParsedQuery {
  const table = readIdentifier(cursor);
  cursor.expectKeyword('SET');

  const assignments: Assignment[] = [];
  do {
    const column = readIdentifier(cursor);
    cursor.expectSymbol('=');
    const value = readValue(cursor);
    assignments.push({ column, value });
  } while (cursor.matchSymbol(','));

  let where: WhereCondition | undefined;
  if (cursor.matchKeyword('WHERE')) where = readCondition(cursor);

  return { kind: 'update', table, assignments, where };
}

function parseDelete(cursor: TokenCursor): ParsedQuery {
  cursor.expectKeyword('FROM');
  const table = readIdentifier(cursor);

  if (!cursor.matchKeyword('WHERE')) {
    throw new SimulatorError('DELETE requiere una condición WHERE para evitar eliminar todos los registros.');
  }

  const where = readCondition(cursor);
  return { kind: 'delete', table, where };
}

function ensureEnd(cursor: TokenCursor): void {
  if (!cursor.isAtEnd()) {
    throw new SimulatorError('Sintaxis no soportada: hay contenido adicional al final de la consulta.');
  }
}
