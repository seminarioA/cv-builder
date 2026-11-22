// Lee un CV en Word con el Formato Harvard (nombre, contacto, títulos centrados, filas con
// ubicación y fechas a la derecha, viñetas) y lo convierte en datos de perfil.
// No depende del DOM: funciona en el navegador y en las pruebas de Node.
import { leerZip } from "./zip.ts";
import { leerEmpresa, MESES } from "./fechas.ts";

export { leerEmpresa };
import { leerHabilidad } from "./habilidades.ts";
import { MODALIDADES, type Modalidad } from "./lugares.ts";
import { CV_VACIO, nuevaEducacion, nuevaExperiencia, nuevoId, TITULOS_POR_DEFECTO, type DatosCV, type Titulos } from "./tipos.ts";

type P = {
  texto: string;
  negrita: boolean;
  derecha: boolean;
  vineta: boolean;
  titulo: boolean;
  enlaces: { texto: string; destino: string }[];
  campo: string; // destino de un campo HYPERLINK
};

const des = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

function textoDe(xml: string): string {
  let t = "";
  for (const m of xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) t += m[1] !== undefined ? des(m[1]) : " ";
  return t;
}

function parrafos(documento: string, rels: Map<string, string>): P[] {
  const cuerpo = documento.slice(documento.indexOf("<w:body>"));
  const lista: P[] = [];
  for (const m of cuerpo.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const x = m[1];
    const ppr = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(x)?.[1] ?? "";
    const runs = x.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, "");
    const primerRun = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/.exec(runs.replace(/<w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar[^>]*\/><\/w:r>/g, ""))?.[1] ?? "";
    const enlaces = [...runs.matchAll(/<w:hyperlink [^>]*r:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/g)].map((h) => ({
      texto: textoDe(h[2]).trim(),
      destino: rels.get(h[1]) ?? "",
    }));
    lista.push({
      texto: textoDe(runs).replace(/\s+/g, " ").trim(),
      negrita: /<w:b\/>|<w:b w:val="(1|true)"\/>/.test(/<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(primerRun)?.[1] ?? ppr),
      derecha: /<w:jc w:val="(right|end)"\/>/.test(ppr),
      vineta: /<w:numPr>/.test(ppr),
      titulo: /<w:pStyle w:val="(T[^"]*tulo\d|Heading\d)"\/>/i.test(ppr),
      enlaces,
      campo: /HYPERLINK\s+"([^"]+)"/.exec(runs)?.[1] ?? "",
    });
  }
  return lista;
}

type Clave = keyof Titulos;
function seccionDe(titulo: string): Clave | null {
  const t = titulo.toLowerCase();
  if (/perfil|resumen|sobre m|objetivo/.test(t)) return "perfil";
  if (/educaci|formaci|estudio|acad/.test(t)) return "educacion";
  if (/habilidad|skill|competencia|conocimiento/.test(t)) return "habilidades";
  if (/experiencia|laboral|trabajo/.test(t)) return "experiencia";
  if (/publicaci|investigaci|art[ií]culo/.test(t)) return "publicaciones";
  return null;
}

export function leerUbicacion(s: string): { ciudad: string; pais: string; modalidad: Modalidad } {
  const m = /^(.*?)\s*(?:\(([^)]*)\))?\s*$/.exec(s.trim())!;
  const sinTilde = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const modalidad = (MODALIDADES.find((x) => sinTilde(x) === sinTilde(m[2] ?? "")) ?? "") as Modalidad;
  const [ciudad = "", ...resto] = m[1].split(",").map((x) => x.trim());
  return { ciudad, pais: resto.join(", "), modalidad };
}

const sinTildes = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "Marzo 2025 – Agosto 2025 (6 meses)" → inicio 2025-03, fin 2025-08
export function leerFechasMes(s: string): { inicio: string; fin: string; actual: boolean; mostrarDuracion: boolean } {
  const meses = MESES.map(sinTildes);
  const encontradas: string[] = [];
  for (const m of sinTildes(s).matchAll(/([a-z]+)\.?\s+(?:de\s+)?(\d{4})/g)) {
    const i = meses.findIndex((x) => x.startsWith(m[1].slice(0, 3)));
    if (i >= 0) encontradas.push(`${m[2]}-${String(i + 1).padStart(2, "0")}`);
  }
  const actual = /actualidad|presente|actual|hoy/i.test(s);
  // Con «Actualidad» no se muestra duración; si luego se le pone fin, que salga.
  return { inicio: encontradas[0] ?? "", fin: actual ? "" : (encontradas[1] ?? ""), actual, mostrarDuracion: actual || /\(/.test(s) };
}

export function leerFechasAño(s: string): { inicio: string; fin: string; actual: boolean } {
  const años = [...s.matchAll(/\d{4}/g)].map((m) => m[0]);
  const actual = /presente|actualidad|actual|en curso/i.test(s);
  return { inicio: años[0] ?? "", fin: actual ? "" : (años[1] ?? ""), actual };
}

const pareceFecha = (s: string) => /\d{4}|actualidad|presente/i.test(s);

export function cvDesdeParrafos(ps: P[]): DatosCV {
  const cv: DatosCV = structuredClone(CV_VACIO);
  cv.titulos = { ...TITULOS_POR_DEFECTO };
  let seccion: Clave | "cabecera" | null = "cabecera";
  const perfil: string[] = [];
  for (const p of ps) {
    if (!p.texto && !p.enlaces.length) continue;
    if (p.titulo) {
      seccion = seccionDe(p.texto);
      if (seccion) cv.titulos[seccion] = p.texto;
      continue;
    }
    if (seccion === "cabecera") {
      if (!cv.nombre) {
        cv.nombre = p.texto;
        cv.enlaceNombre = p.campo || p.enlaces[0]?.destino || "";
        continue;
      }
      for (const parte of p.texto.split(/\s*[•|·]\s*/)) {
        if (/@/.test(parte) && !cv.correo) cv.correo = parte.trim();
        else if (/\d{3}/.test(parte) && !cv.telefono) cv.telefono = parte.trim();
      }
    } else if (seccion === "perfil") {
      perfil.push(p.texto);
    } else if (seccion === "educacion") {
      let e = cv.educacion.at(-1);
      if (!e || (p.negrita && !p.derecha)) cv.educacion.push((e = nuevaEducacion()));
      if (p.derecha && pareceFecha(p.texto)) Object.assign(e, leerFechasAño(p.texto));
      else if (p.derecha) Object.assign(e, leerUbicacion(p.texto));
      else if (p.negrita && !e.institucion) e.institucion = p.texto;
      else e.titulo = e.titulo ? `${e.titulo} ${p.texto}` : p.texto;
    } else if (seccion === "habilidades") {
      let g = cv.habilidades.at(-1);
      if (!p.vineta || !g) cv.habilidades.push((g = { id: nuevoId(), titulo: p.vineta ? "" : p.texto, items: [] }));
      if (p.vineta) g.items.push(leerHabilidad(p.texto, nuevoId()));
    } else if (seccion === "experiencia") {
      let x = cv.experiencia.at(-1);
      if (!x || (p.negrita && !p.derecha && !p.vineta)) cv.experiencia.push((x = nuevaExperiencia()));
      if (p.vineta) x.logros.push(p.texto);
      else if (p.derecha && pareceFecha(p.texto)) Object.assign(x, leerFechasMes(p.texto));
      else if (p.derecha) Object.assign(x, leerUbicacion(p.texto));
      else if (p.negrita && !x.empresa) Object.assign(x, leerEmpresa(p.texto));
      else x.cargo = x.cargo ? `${x.cargo} ${p.texto}` : p.texto;
    } else if (seccion === "publicaciones") {
      const enlace = p.enlaces[0];
      const titulo = enlace ? p.texto.replace(enlace.texto, "").trim() : p.texto;
      cv.publicaciones.push({ id: nuevoId(), titulo, enlace: enlace ? enlace.texto || enlace.destino : "" });
    }
  }
  cv.perfil = perfil.join(" ");
  return cv;
}

export async function importarDocx(bytes: Uint8Array): Promise<DatosCV> {
  const archivos = await leerZip(bytes);
  const doc = archivos.get("word/document.xml");
  if (!doc) throw new Error("El archivo no es un documento de Word (.docx).");
  const relsXml = new TextDecoder().decode(archivos.get("word/_rels/document.xml.rels") ?? new Uint8Array());
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship ([^>]*)\/>/g)) {
    const id = /Id="([^"]+)"/.exec(m[1])?.[1];
    const destino = /Target="([^"]+)"/.exec(m[1])?.[1];
    if (id && destino) rels.set(id, des(destino).replace(/%20$/, "").trim());
  }
  return cvDesdeParrafos(parrafos(new TextDecoder().decode(doc), rels));
}
