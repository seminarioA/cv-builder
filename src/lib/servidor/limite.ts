import "server-only";
import { headers } from "next/headers";

// Límite de intentos en memoria (por proceso). Suficiente para un solo servidor; si se escala
// a varias instancias, mover a la base o a Redis.
const intentos = new Map<string, { n: number; desde: number }>();
const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO = 8;

async function clave(ambito: string, correo: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${ambito}:${ip}:${correo.trim().toLowerCase()}`;
}

/** Devuelve los minutos de espera si se superó el límite, o 0 si puede intentar. */
export async function esperaPorIntentos(ambito: string, correo: string): Promise<number> {
  const k = await clave(ambito, correo);
  const r = intentos.get(k);
  if (!r || Date.now() - r.desde > VENTANA_MS) return 0;
  return r.n >= MAXIMO ? Math.ceil((VENTANA_MS - (Date.now() - r.desde)) / 60000) : 0;
}

export async function registrarFallo(ambito: string, correo: string) {
  const k = await clave(ambito, correo);
  const r = intentos.get(k);
  if (!r || Date.now() - r.desde > VENTANA_MS) intentos.set(k, { n: 1, desde: Date.now() });
  else r.n += 1;
}

export async function limpiarIntentos(ambito: string, correo: string) {
  intentos.delete(await clave(ambito, correo));
}
