import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarcoIngreso } from "@/components/marco-ingreso";
import { FormularioIngresoCV } from "@/components/cv/formularios-cuenta";
import { cuentaActual } from "@/lib/servidor/cuentas-cv";

export const metadata: Metadata = { title: "Ingresar · CV Builder", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function IngresarCV({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const { siguiente } = await searchParams;
  const destino = siguiente && /^\/[a-z-]*$/.test(siguiente) ? siguiente : "/";
  if (await cuentaActual()) redirect(destino);
  return (
    <MarcoIngreso titulo="Ingresa a CV Builder" bajada="Tus datos se guardan en tu cuenta y arman tu CV.">
      <FormularioIngresoCV siguiente={destino} />
    </MarcoIngreso>
  );
}
