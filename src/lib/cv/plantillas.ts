// Plantillas del CV builder. Cada una tiene una base .docx en public/plantillas (servida en /cv-builder/plantillas)
// (estilos, numeración y fuentes del original) y una función que arma su document.xml.
// Para agregar una: su generador en src/lib/cv, su vista en src/components/cv y una entrada aquí.
import type { DatosCV } from "./tipos.ts";
import { documentoHarvard, propiedades, relacionesConEnlaces } from "./harvard-docx.ts";
import { escribirZip, leerZip } from "./zip.ts";

export type IdPlantilla = "harvard";

export type Plantilla = {
  id: IdPlantilla;
  nombre: string;
  descripcion: string;
  base: string;
  documento: (cv: DatosCV) => { documento: string; relaciones: { id: string; destino: string }[] };
};

export const PLANTILLAS: Plantilla[] = [
  {
    id: "harvard",
    nombre: "Formato Harvard",
    descripcion: "Clásica en Times New Roman, una columna, fechas a la derecha.",
    base: "/cv-builder/plantillas/harvard.docx",
    documento: documentoHarvard,
  },
];

export function plantilla(id: string): Plantilla {
  return PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0];
}

// Arma el .docx: copia la base y reemplaza el documento, sus enlaces y las propiedades.
export async function armarDocx(base: Uint8Array, p: Plantilla, cv: DatosCV): Promise<Uint8Array> {
  const archivos = await leerZip(base);
  const enc = new TextEncoder();
  const { documento, relaciones } = p.documento(cv);
  const rels = new TextDecoder().decode(archivos.get("word/_rels/document.xml.rels"));
  archivos.set("word/document.xml", enc.encode(documento));
  archivos.set("word/_rels/document.xml.rels", enc.encode(relacionesConEnlaces(rels, relaciones)));
  archivos.set("docProps/core.xml", enc.encode(propiedades(cv)));
  return escribirZip(archivos);
}

export function nombreArchivo(cv: DatosCV, extension: string): string {
  const limpio = cv.nombre.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ");
  return `${limpio ? `CV - ${limpio}` : "CV"}.${extension}`;
}
