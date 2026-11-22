// CV builder: el .docx generado. Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crc32, escribirZip, leerZip } from "../src/lib/cv/zip.ts";
import { documentoHarvard } from "../src/lib/cv/harvard-docx.ts";
import { armarDocx, plantilla } from "../src/lib/cv/plantillas.ts";
import { CV_VACIO, normalizarCV, type DatosCV } from "../src/lib/cv/tipos.ts";
import { importarDocx, leerEmpresa, leerFechasMes, leerUbicacion } from "../src/lib/cv/importar-docx.ts";
import { duracion, fechasEducacion, fechasExperiencia } from "../src/lib/cv/fechas.ts";
import { leerHabilidad, textoHabilidad } from "../src/lib/cv/habilidades.ts";

const CV_EJEMPLO: DatosCV = normalizarCV({
  nombre: "María Quispe",
  enlaceNombre: "https://www.linkedin.com/in/ejemplo/",
  correo: "maria.quispe@correo.com",
  telefono: "+51 900 000 000",
  perfil: "Estudiante de Ingeniería.",
  educacion: [{ institucion: "UNIVERSIDAD NACIONAL", titulo: "Ingeniería de Sistemas", ciudad: "Lima", pais: "Perú", inicio: "2022", actual: true }],
  habilidades: [
    { titulo: "Hard Skills", items: [{ nombre: "Python", nivel: "Intermedio", detalle: "FastAPI, pandas" }, { nombre: "SQL", nivel: "Avanzado", detalle: "" }] },
    { titulo: "Soft Skills", items: [{ nombre: "Trabajo en Equipo", nivel: "", detalle: "" }] },
  ],
  experiencia: [
    { empresa: "Empresa S.A.C.", ruc: "20123456789", cargo: "Practicante", ciudad: "Lima", pais: "Perú", modalidad: "Remoto", inicio: "2025-03", fin: "2025-08", logros: ["Diseñé dashboards.", "Implementé consultas."] },
    { empresa: "Universidad", cargo: "Asistente", ciudad: "Piura", pais: "Perú", modalidad: "Híbrido", inicio: "2026-01", actual: true, logros: ["Brindé apoyo."] },
  ],
  publicaciones: [{ titulo: "Título,", enlace: "https://doi.org/" }],
});

const base = new Uint8Array(readFileSync(new URL("../public/plantillas/harvard.docx", import.meta.url)));

test("cv: crc32 conocido", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("cv: un zip escrito se lee igual", async () => {
  const a = new Map([
    ["[Content_Types].xml", new TextEncoder().encode("<Types/>")],
    ["word/document.xml", new TextEncoder().encode("ñandú ".repeat(500))],
  ]);
  const b = await leerZip(await escribirZip(a));
  assert.deepEqual([...b.keys()], [...a.keys()]);
  for (const [k, v] of a) assert.deepEqual(b.get(k), v);
});

test("cv: la base conserva estilos, numeración y fuentes, sin datos personales", async () => {
  const z = await leerZip(base);
  for (const p of ["word/styles.xml", "word/numbering.xml", "word/fontTable.xml", "word/fonts/font2.odttf", "word/header2.xml"]) {
    assert.ok(z.has(p), p);
  }
  assert.ok(![...z.keys()].some((k) => k.startsWith("customXml/")));
  const texto = new TextDecoder().decode(z.get("docProps/app.xml")) + new TextDecoder().decode(z.get("word/document.xml"));
  assert.doesNotMatch(texto, /@|mailto|linkedin|utp\.edu|researchgate|doi\.org/i);
});

test("cv: cada sección termina en un párrafo y la última en el cuerpo", () => {
  const { documento } = documentoHarvard(CV_EJEMPLO);
  const secciones = documento.match(/<w:sectPr>/g)!.length;
  // nombre…título de educación + 2 filas de educación + habilidades…título de experiencia
  // + (2 filas + viñetas) × 2 experiencias (las publicaciones van con las últimas viñetas)
  assert.equal(secciones, 1 + 2 + 1 + 3 * 2);
  assert.match(documento, /<\/w:p><w:sectPr><w:type w:val="continuous"\/>[^]*<\/w:sectPr><\/w:body>/);
  // Solo la primera sección lleva encabezados y pies.
  assert.equal(documento.match(/headerReference w:type="default"/g)!.length, 1);
});

test("cv: escapa el texto y agrega los enlaces", async () => {
  const cv = { ...CV_EJEMPLO, nombre: "Ana <&> \"B\"" };
  const z = await leerZip(await armarDocx(base, plantilla("harvard"), cv));
  const doc = new TextDecoder().decode(z.get("word/document.xml"));
  assert.match(doc, /Ana &lt;&amp;&gt; &quot;B&quot;/);
  const rels = new TextDecoder().decode(z.get("word/_rels/document.xml.rels"));
  assert.match(rels, /Target="mailto:maria\.quispe@correo\.com"/);
  assert.match(rels, /Target="https:\/\/doi\.org\/" TargetMode="External"/);
  for (const m of doc.matchAll(/r:id="(rIdCv\d+)"/g)) assert.match(rels, new RegExp(`Id="${m[1]}"`));
});

test("cv: un CV vacío sigue siendo un documento válido", () => {
  const { documento } = documentoHarvard(CV_VACIO);
  assert.match(documento, /<w:body><w:p><\/w:p><w:sectPr>/);
});

test("cv: normalizar completa lo que falta", () => {
  const cv = normalizarCV({ nombre: "X", experiencia: [{ empresa: "E" }], titulos: { perfil: "Resumen" } });
  assert.equal(cv.experiencia[0].logros.length, 0);
  assert.ok(cv.experiencia[0].id);
  assert.equal(cv.titulos.perfil, "Resumen");
  assert.equal(cv.titulos.educacion, "Educación");
});

test("cv: fechas y duración como en el CV", () => {
  assert.equal(duracion("2025-03", "2025-08"), "6 meses");
  assert.equal(duracion("2025-08", "2026-01"), "6 meses");
  assert.equal(duracion("2024-01", "2025-03"), "1 año y 3 meses");
  assert.equal(duracion("2023-01", "2024-12"), "2 años");
  assert.equal(fechasExperiencia({ inicio: "2025-03", fin: "2025-08", actual: false, mostrarDuracion: true }), "Marzo 2025 – Agosto 2025 (6 meses)");
  assert.equal(fechasExperiencia({ inicio: "2026-01", fin: "", actual: true, mostrarDuracion: true }), "Enero 2026 – Actualidad");
  assert.equal(fechasEducacion({ inicio: "2022", fin: "", actual: true }), "2022 - Presente");
  assert.deepEqual(leerFechasMes("Agosto 2025 – Enero 2026 (6 meses)"), { inicio: "2025-08", fin: "2026-01", actual: false, mostrarDuracion: true });
  assert.deepEqual(leerUbicacion("Lima, Perú (Hibrido)"), { ciudad: "Lima", pais: "Perú", modalidad: "Híbrido" });
});

test("cv: habilidades de ida y vuelta", () => {
  const h = leerHabilidad("Cloud (Intermedio): AWS (EC2, S3), Azure.", "x");
  assert.deepEqual(h, { id: "x", nombre: "Cloud", nivel: "Intermedio", detalle: "AWS (EC2, S3), Azure" });
  assert.equal(textoHabilidad(h), "Cloud (Intermedio): AWS (EC2, S3), Azure.");
  assert.equal(textoHabilidad({ id: "y", nombre: "Mejora Continua", nivel: "", detalle: "" }), "Mejora Continua.");
});

test("cv: un Word generado se importa con los mismos datos", async () => {
  const docx = await armarDocx(base, plantilla("harvard"), CV_EJEMPLO);
  const sinIds = (cv: DatosCV) =>
    JSON.parse(JSON.stringify(cv, (k, v) => (k === "id" ? undefined : v)));
  assert.deepEqual(sinIds(normalizarCV(await importarDocx(docx))), sinIds(CV_EJEMPLO));
});

test("cv: la empresa y el RUC van por separado; el RUC es opcional", () => {
  assert.deepEqual(leerEmpresa("ProEducate (RUC: 20614177641)"), { empresa: "ProEducate", ruc: "20614177641" });
  assert.deepEqual(leerEmpresa("Universidad Tecnológica del Perú (UTP)"), { empresa: "Universidad Tecnológica del Perú (UTP)", ruc: "" });
  const { documento } = documentoHarvard(CV_EJEMPLO);
  assert.match(documento, /Empresa S\.A\.C\. \(RUC: 20123456789\)/);
  assert.match(documento, /<w:t>Universidad<\/w:t>/);
});
