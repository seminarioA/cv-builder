"use client";
// Ingreso y registro de las cuentas del CV builder.
import Link from "next/link";
import { useActionState } from "react";
import { CampoClave } from "@/components/campo-clave";
import { Alerta } from "@/components/iconos";
import { BotonIngreso } from "@/components/marco-ingreso";
import { ingresar, registrar, type EstadoCuenta } from "@/app/acciones";

function Error({ estado }: { estado: EstadoCuenta }) {
  if (estado.estado !== "error") return null;
  return (
    <p id="cv-error" className="ingreso__error" role="alert">
      <Alerta tamano={18} />
      <span>{estado.mensaje}</span>
    </p>
  );
}

function CampoCorreo({ valor }: { valor?: string }) {
  return (
    <div className="campo">
      <label htmlFor="cv-correo">Correo</label>
      <input
        id="cv-correo"
        name="correo"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={valor}
      />
    </div>
  );
}

export function FormularioIngresoCV({ siguiente }: { siguiente: string }) {
  const [estado, enviar] = useActionState<EstadoCuenta, FormData>(ingresar, { estado: "inicial" });
  return (
    <form action={enviar} className="ingreso__formulario" key={estado.mensaje}>
      <Error estado={estado} />
      <input type="hidden" name="siguiente" value={siguiente} />
      <CampoCorreo valor={estado.correo} />
      <div className="campo">
        <label htmlFor="cv-clave">Contraseña</label>
        <CampoClave id="cv-clave" nombre="clave" autoCompletar="current-password" requerido />
      </div>
      <BotonIngreso texto="Ingresar" cargando="Ingresando…" />
      <p className="pista">
        ¿No tienes cuenta? <Link href="/registro">Créala aquí</Link>.
      </p>
    </form>
  );
}

export function FormularioRegistroCV() {
  const [estado, enviar] = useActionState<EstadoCuenta, FormData>(registrar, { estado: "inicial" });
  return (
    <form action={enviar} className="ingreso__formulario" key={estado.mensaje}>
      <Error estado={estado} />
      <div className="campo">
        <label htmlFor="cv-nombres">Nombres</label>
        <input id="cv-nombres" name="nombres" autoComplete="given-name" required defaultValue={estado.nombres} />
      </div>
      <div className="campo">
        <label htmlFor="cv-apellidos">Apellidos</label>
        <input id="cv-apellidos" name="apellidos" autoComplete="family-name" required defaultValue={estado.apellidos} />
      </div>
      <CampoCorreo valor={estado.correo} />
      <div className="campo">
        <label htmlFor="cv-clave">Contraseña</label>
        <CampoClave id="cv-clave" nombre="clave" autoCompletar="new-password" requerido minimo={10} maximo={200} />
        <span className="pista">Al menos 10 caracteres.</span>
      </div>
      <BotonIngreso texto="Crear cuenta" cargando="Creando…" />
      <p className="pista">
        ¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link>.
      </p>
    </form>
  );
}
