import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tinos } from "next/font/google";
import { ConstructorCV } from "@/components/cv/constructor-cv";
import { cuentaActual, leerDatos } from "@/lib/servidor/cuentas-cv";

// Tinos: mismas métricas que Times New Roman, para equipos que no la tienen instalada.
const tinos = Tinos({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--fuente-tinos", display: "block" });

export const metadata: Metadata = {
  title: "CV Builder",
  description: "Arma tu CV con plantillas profesionales y descárgalo en Word o PDF.",
};

export const dynamic = "force-dynamic";

export default async function PaginaCVBuilder() {
  const cuenta = await cuentaActual();
  if (!cuenta) redirect("/ingresar");
  const { datos, paso, plantilla } = await leerDatos(cuenta.id);
  // Quien todavía no empezó a cargar sus datos va primero al formulario por pasos.
  if (paso === 0) redirect("/mis-datos");
  return (
    <div className={tinos.variable}>
      <ConstructorCV cuenta={{ nombre: cuenta.nombre, correo: cuenta.correo }} datos={datos} plantillaInicial={plantilla} />
    </div>
  );
}
