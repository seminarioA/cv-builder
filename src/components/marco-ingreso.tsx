"use client";
import { useFormStatus } from "react-dom";
import { Logo } from "@/components/logo";

/** Marco de las pantallas de ingreso y registro: marca, título y contenido. */
export function MarcoIngreso({ titulo, bajada, children }: { titulo: string; bajada: string; children: React.ReactNode }) {
  return (
    <main id="contenido" className="panel-ingreso">
      <div className="ingreso">
        <div className="ingreso__marca">
          <Logo tamano={32} />
          <span>Los Andes Labs · CV Builder</span>
        </div>
        <div className="formulario ingreso__tarjeta">
          <header className="ingreso__cabeza">
            <h1>{titulo}</h1>
            <p>{bajada}</p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}

/** Botón principal con estado de carga visible. */
export function BotonIngreso({ texto, cargando }: { texto: string; cargando: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="boton boton--bloque ingreso__boton" disabled={pending} aria-busy={pending}>
      {pending && <span className="ingreso__giro" aria-hidden="true" />}
      {pending ? cargando : texto}
    </button>
  );
}
