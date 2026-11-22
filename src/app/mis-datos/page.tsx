import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioPasos } from "@/components/cv/formulario-pasos";
import { cuentaActual, leerDatos } from "@/lib/servidor/cuentas-cv";

export const metadata: Metadata = { title: "Mis datos · CV Builder", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MisDatos() {
  const cuenta = await cuentaActual();
  if (!cuenta) redirect("/ingresar?siguiente=/mis-datos");
  const { datos, paso } = await leerDatos(cuenta.id);
  return <FormularioPasos cuenta={{ nombre: cuenta.nombre, correo: cuenta.correo }} datos={datos} pasoGuardado={paso} />;
}
