"use server";
// Acciones del CV builder: cuenta (registro, ingreso, salida) y datos del CV de la persona.
import { redirect } from "next/navigation";
import { cerrarSesionCuenta, cuentaActual, escribirDatos, ingresarCuenta, registrarCuenta } from "@/lib/servidor/cuentas-cv";
import { esperaPorIntentos, limpiarIntentos, registrarFallo } from "@/lib/servidor/limite";
import { errorCorreo } from "@/lib/validacion";
import { plantilla } from "@/lib/cv/plantillas";
import type { DatosCV } from "@/lib/cv/tipos";

export type EstadoCuenta = { estado: "inicial" | "error"; mensaje?: string; correo?: string; nombre?: string };

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
// Solo rutas internas del CV builder, para que «siguiente» no sirva para redirigir afuera.
// Son relativas a /cv-builder (el basePath lo agrega Next).
const destino = (f: FormData) => {
  const s = t(f, "siguiente");
  return /^\/[a-z-]*$/.test(s) ? s : "/";
};

export async function registrar(_e: EstadoCuenta, f: FormData): Promise<EstadoCuenta> {
  const correo = t(f, "correo");
  const nombre = t(f, "nombre");
  const clave = String(f.get("clave") ?? "");
  const volver = { correo, nombre };
  if (!nombre) return { estado: "error", mensaje: "Escribe tu nombre completo.", ...volver };
  const malCorreo = errorCorreo(correo);
  if (malCorreo) return { estado: "error", mensaje: malCorreo, ...volver };
  if (clave.length < 10 || clave.length > 200) return { estado: "error", mensaje: "La contraseña debe tener al menos 10 caracteres.", ...volver };
  const espera = await esperaPorIntentos("cv-registro", correo);
  if (espera) return { estado: "error", mensaje: `Demasiados intentos. Espera ${espera} min.`, ...volver };
  if (!(await registrarCuenta(correo, nombre, clave))) {
    await registrarFallo("cv-registro", correo);
    return { estado: "error", mensaje: "Ese correo ya tiene una cuenta. Ingresa con tu contraseña.", ...volver };
  }
  redirect("/mis-datos");
}

export async function ingresar(_e: EstadoCuenta, f: FormData): Promise<EstadoCuenta> {
  const correo = t(f, "correo");
  const clave = String(f.get("clave") ?? "");
  if (!correo || !clave) return { estado: "error", mensaje: "Escribe tu correo y tu contraseña.", correo };
  const espera = await esperaPorIntentos("cv", correo);
  if (espera) return { estado: "error", mensaje: `Demasiados intentos. Espera ${espera} min e inténtalo de nuevo.`, correo };
  if (!(await ingresarCuenta(correo, clave))) {
    await registrarFallo("cv", correo);
    return { estado: "error", mensaje: "El correo o la contraseña no coinciden.", correo };
  }
  await limpiarIntentos("cv", correo);
  redirect(destino(f));
}

export async function salir() {
  await cerrarSesionCuenta();
  redirect("/ingresar");
}

const MAX_BYTES = 200_000;

/** Guarda los datos (y, si viene, el paso del formulario o la plantilla). */
export async function guardarDatos(cambios: { datos?: DatosCV; paso?: number; plantilla?: string }): Promise<{ ok: boolean; error?: string }> {
  const c = await cuentaActual();
  if (!c) return { ok: false, error: "Tu sesión terminó. Vuelve a ingresar." };
  if (cambios.datos && JSON.stringify(cambios.datos).length > MAX_BYTES) return { ok: false, error: "Los datos son demasiado grandes." };
  const paso = Number.isInteger(cambios.paso) ? Math.max(0, Math.min(20, cambios.paso!)) : undefined;
  await escribirDatos(c.id, { datos: cambios.datos, paso, plantilla: cambios.plantilla ? plantilla(cambios.plantilla).id : undefined });
  return { ok: true };
}
