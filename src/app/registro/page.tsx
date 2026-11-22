import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarcoIngreso } from "@/components/marco-ingreso";
import { FormularioRegistroCV } from "@/components/cv/formularios-cuenta";
import { cuentaActual } from "@/lib/servidor/cuentas-cv";

export const metadata: Metadata = { title: "Crear cuenta · CV Builder", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RegistroCV() {
  if (await cuentaActual()) redirect("/mis-datos");
  return (
    <MarcoIngreso titulo="Crea tu cuenta" bajada="Carga tus datos una vez y arma tu CV con cualquier plantilla.">
      <FormularioRegistroCV />
    </MarcoIngreso>
  );
}
