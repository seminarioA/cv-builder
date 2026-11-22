import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

// PostgreSQL: el esquema se aplica al arrancar (todo es «create … if not exists»).

type Fila = Record<string, unknown>;

// count(*) devuelve bigint y el código lo trata como número.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

// Se guarda en globalThis para que la recarga en caliente de Next no abra otro pool.
const global = globalThis as unknown as { __db?: Promise<pg.Pool> };

async function iniciar(): Promise<pg.Pool> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL.");
  const pool = new pg.Pool({ connectionString });
  // Sin este manejador, un corte de una conexión inactiva tumba el proceso.
  pool.on("error", (e) => console.error("Error en una conexión inactiva de PostgreSQL", e));
  try {
    await pool.query(readFileSync(path.join(process.cwd(), "src", "lib", "servidor", "esquema.sql"), "utf8"));
  } catch (e) {
    await pool.end().catch(() => {});
    throw e;
  }
  return pool;
}

function obtenerDb(): Promise<pg.Pool> {
  if (!global.__db) {
    global.__db = iniciar().catch((e) => {
      global.__db = undefined;
      throw e;
    });
  }
  return global.__db;
}

export async function consultar<T extends Fila = Fila>(sql: string, parametros: unknown[] = []): Promise<T[]> {
  const db = await obtenerDb();
  return (await db.query(sql, parametros)).rows as T[];
}

export async function primera<T extends Fila = Fila>(sql: string, parametros: unknown[] = []): Promise<T | undefined> {
  return (await consultar<T>(sql, parametros))[0];
}
