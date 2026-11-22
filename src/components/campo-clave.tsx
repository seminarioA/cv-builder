"use client";

import { useState } from "react";
import { Ojo, OjoTachado } from "@/components/iconos";

type Props = {
  id: string;
  nombre: string;
  autoCompletar: "current-password" | "new-password";
  requerido?: boolean;
  minimo?: number;
  maximo?: number;
  describe?: string;
  invalido?: boolean;
};

/** Campo de contraseña con botón para mostrarla u ocultarla. La etiqueta la pone quien lo usa. */
export function CampoClave({ id, nombre, autoCompletar, requerido, minimo, maximo, describe, invalido }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="campo-clave">
      <input
        id={id}
        name={nombre}
        type={visible ? "text" : "password"}
        autoComplete={autoCompletar}
        autoCapitalize="none"
        spellCheck={false}
        required={requerido}
        minLength={minimo}
        maxLength={maximo}
        aria-describedby={describe}
        aria-invalid={invalido || undefined}
      />
      <button
        type="button"
        className="boton-icono"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <OjoTachado tamano={18} /> : <Ojo tamano={18} />}
      </button>
    </div>
  );
}
