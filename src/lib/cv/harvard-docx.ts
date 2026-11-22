// Plantilla «Formato Harvard»: arma word/document.xml con los mismos párrafos, estilos, viñetas y
// secciones de dos columnas del documento original. Los demás archivos del .docx (estilos,
// numeración, fuentes incrustadas, encabezados) se copian tal cual de la base, así que Word
// lo abre idéntico al original. Si cambias algo aquí, cambia también la vista previa
// (src/components/cv/harvard.tsx), que reproduce estas mismas medidas.
import type { DatosCV } from "./tipos.ts";
import { empresaConRuc, fechasEducacion, fechasExperiencia, ubicacion } from "./fechas.ts";
import { textoHabilidad } from "./habilidades.ts";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Un <w:t> que conserva los espacios de los extremos.
function t(s: string): string {
  return /^\s|\s$/.test(s) ? `<w:t xml:space="preserve">${esc(s)}</w:t>` : `<w:t>${esc(s)}</w:t>`;
}

type Parrafo = { ppr: string; runs: string };
// Una sección del documento: 1 columna o 2 columnas con su separación (en twips).
type Seccion = { columnas: 1 | 2; espacio: number; parrafos: Parrafo[] };

const NS =
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 wp14"';

// Márgenes de la primera sección del original; se repiten en todas para que las páginas 2+
// queden igual que la primera.
const PAGINA =
  '<w:pgSz w:w="12240" w:h="15840" w:code="1"/><w:pgMar w:top="284" w:right="1134" w:bottom="284" w:left="1134" w:header="283" w:footer="0" w:gutter="0"/><w:pgNumType w:start="1"/>';
const REFERENCIAS =
  '<w:headerReference w:type="even" r:id="rId13"/><w:headerReference w:type="default" r:id="rId14"/><w:footerReference w:type="even" r:id="rId15"/><w:footerReference w:type="default" r:id="rId16"/><w:headerReference w:type="first" r:id="rId17"/><w:footerReference w:type="first" r:id="rId18"/>';

function sectPr(s: Seccion, primera: boolean): string {
  const cols = s.columnas === 2 ? `<w:cols w:num="2" w:space="${s.espacio}"/>` : `<w:cols w:space="${s.espacio}"/>`;
  return primera
    ? `<w:sectPr>${REFERENCIAS}${PAGINA}${cols}<w:docGrid w:linePitch="326"/></w:sectPr>`
    : `<w:sectPr><w:type w:val="continuous"/>${PAGINA}${cols}</w:sectPr>`;
}

const B = "<w:b/><w:bCs/>";
const SZ22 = '<w:sz w:val="22"/><w:szCs w:val="22"/>';
const LINEA = '<w:spacing w:line="240" w:lineRule="auto"/>';
const IND0 = '<w:ind w:leftChars="0" w:left="0" w:firstLineChars="0" w:firstLine="0"/>';

class Relaciones {
  lista: { id: string; destino: string }[] = [];
  agregar(destino: string): string {
    const id = `rIdCv${this.lista.length + 1}`;
    this.lista.push({ id, destino });
    return id;
  }
}

function titulo(texto: string): Parrafo {
  const rpr = '<w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>';
  return {
    ppr: `<w:pStyle w:val="Ttulo1"/><w:spacing w:before="120" w:line="240" w:lineRule="auto"/><w:ind w:left="0" w:hanging="2"/>${rpr}`,
    runs: `<w:r>${rpr}${t(texto)}</w:r>`,
  };
}

function vineta(numId: number, runs: string): Parrafo {
  return {
    ppr: `<w:pStyle w:val="Prrafodelista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>${LINEA}<w:ind w:leftChars="0" w:firstLineChars="0"/><w:jc w:val="both"/>`,
    runs,
  };
}

// Fila de dos columnas: un párrafo a la izquierda y otro alineado a la derecha.
function fila(izq: Parrafo, der: Parrafo, espacio: number): Seccion {
  return { columnas: 2, espacio, parrafos: [izq, der] };
}

function izquierda(texto: string, negrita: boolean, derecha = 0): Parrafo {
  const rpr = negrita ? `<w:rPr>${B}</w:rPr>` : "";
  const ind = derecha
    ? `<w:ind w:leftChars="0" w:left="0" w:right="${derecha}" w:firstLineChars="0" w:firstLine="0"/>`
    : IND0;
  return { ppr: `<w:keepLines/>${LINEA}${ind}${rpr}`, runs: `<w:r>${rpr}${t(texto)}</w:r>` };
}

function derecha(texto: string, chico: boolean): Parrafo {
  const rpr = chico ? `<w:rPr>${SZ22}</w:rPr>` : "";
  return { ppr: `${LINEA}${IND0}<w:jc w:val="right"/>${rpr}`, runs: `<w:r>${rpr}${t(texto)}</w:r>` };
}

export function documentoHarvard(cv: DatosCV): { documento: string; relaciones: { id: string; destino: string }[] } {
  const rel = new Relaciones();
  const secciones: Seccion[] = [];
  let actual: Seccion = { columnas: 1, espacio: 720, parrafos: [] };
  const p = (x: Parrafo) => actual.parrafos.push(x);
  const cerrar = (s: Seccion) => {
    if (actual.parrafos.length) secciones.push(actual);
    secciones.push(s);
    actual = { columnas: 1, espacio: 720, parrafos: [] };
  };

  // Nombre, con una línea debajo; enlaza al perfil si hay enlace.
  if (cv.nombre.trim() || cv.enlaceNombre.trim()) {
    const ppr = `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr>${LINEA}<w:ind w:left="0" w:hanging="2"/><w:jc w:val="center"/><w:rPr>${B}</w:rPr>`;
    const enlace = cv.enlaceNombre.trim();
    const run = `<w:r><w:rPr><w:rStyle w:val="Hipervnculo"/>${B}<w:color w:val="auto"/><w:u w:val="none"/></w:rPr>${t(cv.nombre)}</w:r>`;
    p({
      ppr,
      runs: enlace
        ? `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">HYPERLINK "${esc(enlace)}"</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run}<w:r><w:fldChar w:fldCharType="end"/></w:r>`
        : run,
    });
  }

  // Correo • teléfono
  const contacto: string[] = [];
  const rprC = `<w:rPr><w:color w:val="000000"/>${SZ22}</w:rPr>`;
  if (cv.correo.trim()) {
    const id = rel.agregar(`mailto:${cv.correo.trim()}`);
    contacto.push(
      `<w:hyperlink r:id="${id}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hipervnculo"/><w:color w:val="auto"/>${SZ22}<w:u w:val="none"/></w:rPr>${t(cv.correo.trim())}</w:r></w:hyperlink>`,
    );
  }
  if (cv.telefono.trim()) contacto.push(`<w:r>${rprC}${t(cv.telefono.trim())}</w:r>`);
  if (contacto.length) {
    p({
      ppr: `${LINEA}${IND0}<w:jc w:val="center"/>${rprC}`,
      runs: contacto.join(`<w:r>${rprC}${t(" • ")}</w:r>`),
    });
  }

  if (cv.perfil.trim()) {
    p(titulo(cv.titulos.perfil));
    p({
      ppr: '<w:pStyle w:val="Prrafodelista"/><w:ind w:left="0" w:hanging="2"/><w:jc w:val="both"/>',
      runs: `<w:r>${t(cv.perfil.trim())}</w:r>`,
    });
  }

  if (cv.educacion.length) {
    p(titulo(cv.titulos.educacion));
    for (const e of cv.educacion) {
      cerrar(fila(izquierda(e.institucion, true, -543), derecha(ubicacion(e), true), 567));
      cerrar(fila(izquierda(e.titulo, false, -260), derecha(fechasEducacion(e), true), 567));
    }
  }

  const grupos = cv.habilidades.filter((g) => g.titulo.trim() || g.items.some((i) => textoHabilidad(i)));
  if (grupos.length) {
    p(titulo(cv.titulos.habilidades));
    for (const g of grupos) {
      if (g.titulo.trim()) {
        p({ ppr: `${LINEA}<w:ind w:left="0" w:hanging="2"/><w:rPr>${B}</w:rPr>`, runs: `<w:r><w:rPr>${B}</w:rPr>${t(g.titulo)}</w:r>` });
      }
      for (const i of g.items.map(textoHabilidad).filter(Boolean)) p(vineta(2, `<w:r>${t(i)}</w:r>`));
    }
  }

  if (cv.experiencia.length) {
    p(titulo(cv.titulos.experiencia));
    for (const x of cv.experiencia) {
      cerrar(fila(izquierda(empresaConRuc(x), true), derecha(ubicacion(x), false), 720));
      cerrar(fila(izquierda(x.cargo, false), derecha(fechasExperiencia(x), false), 720));
      for (const l of x.logros.filter((l) => l.trim())) p(vineta(1, `<w:r>${t(l)}</w:r>`));
    }
  }

  const pubs = cv.publicaciones.filter((x) => x.titulo.trim() || x.enlace.trim());
  if (pubs.length) {
    p(titulo(cv.titulos.publicaciones));
    for (const x of pubs) {
      let runs = x.titulo.trim() ? `<w:r>${t(x.titulo.trim() + " ")}</w:r>` : "";
      const enlace = x.enlace.trim();
      if (enlace) {
        const id = rel.agregar(enlace);
        runs += `<w:hyperlink r:id="${id}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hipervnculo"/></w:rPr>${t(enlace)}</w:r></w:hyperlink>`;
      }
      // Como en el original: alineadas a la izquierda, no justificadas.
      p({
        ppr: '<w:pStyle w:val="Prrafodelista"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr><w:ind w:leftChars="0" w:firstLineChars="0"/>',
        runs,
      });
    }
  }
  if (actual.parrafos.length) secciones.push(actual);
  if (!secciones.length) secciones.push({ columnas: 1, espacio: 720, parrafos: [{ ppr: "", runs: "" }] });

  // La última sección va en el <w:body>; cada una de las otras, en su último párrafo.
  const cuerpo = secciones
    .map((s, i) =>
      s.parrafos
        .map((par, j) => {
          const fin = j === s.parrafos.length - 1 && i < secciones.length - 1 ? sectPr(s, i === 0) : "";
          const ppr = par.ppr + fin;
          return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${par.runs}</w:p>`;
        })
        .join(""),
    )
    .join("");
  const ultima = secciones[secciones.length - 1];
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:document ${NS}><w:body>${cuerpo}${sectPr(ultima, secciones.length === 1)}</w:body></w:document>`;
  return { documento, relaciones: rel.lista };
}

// Agrega los hipervínculos al document.xml.rels de la base.
export function relacionesConEnlaces(base: string, enlaces: { id: string; destino: string }[]): string {
  const extra = enlaces
    .map(
      (e) =>
        `<Relationship Id="${e.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(e.destino)}" TargetMode="External"/>`,
    )
    .join("");
  return base.replace("</Relationships>", `${extra}</Relationships>`);
}

export function propiedades(cv: DatosCV, ahora = new Date()): string {
  const fecha = ahora.toISOString().replace(/\.\d+Z$/, "Z");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(cv.nombre ? `CV - ${cv.nombre}` : "CV")}</dc:title><dc:creator>${esc(cv.nombre)}</dc:creator><cp:lastModifiedBy>${esc(cv.nombre)}</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${fecha}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${fecha}</dcterms:modified></cp:coreProperties>`;
}
