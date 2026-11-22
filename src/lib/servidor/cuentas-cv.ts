import "server-only";
// Cuentas del CV builder: cada persona tiene la suya, con sus datos de CV.
// Separadas de los usuarios del panel para que una cuenta de CV nunca dé acceso al panel.
import { cookies } from "next/headers";
import { cache } from "react";
import { cifrarClave, hashToken, nuevoToken, verificarClave } from "./claves";
import { consultar, primera } from "./db";
import { CV_VACIO, normalizarCV, type DatosCV } from "@/lib/cv/tipos";

const COOKIE = "lal_cv";
const DURACION_DIAS = 30;

export type CuentaCV = { id: number; correo: string; nombre: string };
export type DatosGuardados = { datos: DatosCV; paso: number; plantilla: string };

async function abrirSesion(cuentaId: number) {
  const token = nuevoToken();
  const expira = new Date(Date.now() + DURACION_DIAS * 864e5);
  await consultar("delete from sesiones_cv where expira < now()");
  await consultar("insert into sesiones_cv (token_hash, cuenta_id, expira) values ($1, $2, $3)", [
    hashToken(token),
    cuentaId,
    expira.toISOString(),
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/cv-builder",
    expires: expira,
  });
}

/** Crea la cuenta y abre la sesión. Devuelve false si el correo ya está registrado. */
export async function registrarCuenta(correo: string, nombres: string, apellidos: string, clave: string): Promise<boolean> {
  const nombre = `${nombres.trim()} ${apellidos.trim()}`.trim();
  const fila = await primera<{ id: number }>(
    "insert into cuentas_cv (correo, nombre, clave_hash) values ($1, $2, $3) on conflict (correo) do nothing returning id",
    [correo.trim().toLowerCase(), nombre, await cifrarClave(clave)],
  );
  if (!fila) return false;
  // Los nombres y apellidos de la cuenta arrancan el CV.
  await consultar("insert into datos_cv (cuenta_id, datos) values ($1, $2)", [fila.id, JSON.stringify({ ...CV_VACIO, nombres: nombres.trim(), apellidos: apellidos.trim() })]);
  await abrirSesion(fila.id);
  return true;
}

export async function ingresarCuenta(correo: string, clave: string): Promise<boolean> {
  const c = await primera<{ id: number; clave_hash: string }>("select id, clave_hash from cuentas_cv where correo = $1", [
    correo.trim().toLowerCase(),
  ]);
  // Se verifica igual aunque no exista, para no revelar qué correos existen por el tiempo de respuesta.
  const ok = await verificarClave(clave, c?.clave_hash ?? "scrypt$00$00");
  if (!c || !ok) return false;
  await abrirSesion(c.id);
  return true;
}

export async function cerrarSesionCuenta() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await consultar("delete from sesiones_cv where token_hash = $1", [hashToken(token)]);
  jar.delete({ name: COOKIE, path: "/cv-builder" });
}

export const cuentaActual = cache(async (): Promise<CuentaCV | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const c = await primera<CuentaCV>(
    `select c.id, c.correo, c.nombre from sesiones_cv s join cuentas_cv c on c.id = s.cuenta_id
     where s.token_hash = $1 and s.expira > now()`,
    [hashToken(token)],
  );
  return c ?? null;
});

export async function leerDatos(cuentaId: number): Promise<DatosGuardados> {
  const f = await primera<{ datos: unknown; paso: number; plantilla: string }>(
    "select datos, paso, plantilla from datos_cv where cuenta_id = $1",
    [cuentaId],
  );
  return { datos: normalizarCV(f?.datos ?? CV_VACIO), paso: f?.paso ?? 0, plantilla: f?.plantilla ?? "harvard" };
}

export async function escribirDatos(cuentaId: number, cambios: { datos?: DatosCV; paso?: number; plantilla?: string }) {
  const actual = await leerDatos(cuentaId);
  const datos = cambios.datos ? normalizarCV(cambios.datos) : actual.datos;
  // El paso guardado es el más avanzado al que llegó: volver atrás para corregir no lo pierde.
  const paso = Math.max(actual.paso, cambios.paso ?? 0);
  await consultar(
    `insert into datos_cv (cuenta_id, datos, paso, plantilla, actualizado) values ($1, $2, $3, $4, now())
     on conflict (cuenta_id) do update set datos = excluded.datos, paso = excluded.paso, plantilla = excluded.plantilla, actualizado = now()`,
    [cuentaId, JSON.stringify(datos), paso, cambios.plantilla ?? actual.plantilla],
  );
}
