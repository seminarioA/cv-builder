"use client";
// Vista previa del «Formato Harvard». Reproduce en CSS las medidas del .docx
// (src/lib/cv/harvard-docx.ts): carta 8,5×11 in, Times New Roman 12 pt con interlineado
// sencillo de Word (1,15), márgenes de 1134 twips a los lados y el encabezado vacío arriba.
//
// Dos cosas que el navegador no hace como Word y se resuelven aquí:
//  - Párrafos justificados: Word deja encoger los espacios hasta un 25 % antes de pasar una
//    palabra a la línea siguiente (medido en Word con un documento de calibración). Por eso
//    las líneas se cortan a mano y cada una se ajusta con word-spacing.
//  - Una sola hoja: se mide cada párrafo; los que no caben enteros (como en Word) quedan
//    fuera y se avisa. Los títulos se quedan con lo que les sigue.
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { nombreCompleto, type DatosCV } from "@/lib/cv/tipos";
import { empresaConRuc, fechasEducacion, fechasExperiencia, ubicacion } from "@/lib/cv/fechas";
import { textoHabilidad } from "@/lib/cv/habilidades";
import { useAlMontar } from "./animacion";
import e from "./harvard.module.css";

type Bloque = { clave: string; clase: string; contenido: ReactNode; conSiguiente?: boolean };

const PX = 4 / 3; // px por pt
// Alto útil de la página: del final del encabezado (27,95 pt) al pie (777,8 pt).
const ALTO_CUERPO = (777.8 - 27.95) * PX;
const ANCHO_TEXTO = 498.6 * PX;
const SANGRIA_VINETA = 36 * PX;
const COMPRESION_MAX = 0.25;

// Familia tipográfica real de la página, una vez cargadas las fuentes ("" mientras tanto).
const Fuente = createContext("");

let lienzo: CanvasRenderingContext2D | null = null;
function medidorTexto(familia: string) {
  lienzo ??= document.createElement("canvas").getContext("2d");
  const c = lienzo!;
  c.font = `16px ${familia}`;
  (c as CanvasRenderingContext2D & { fontKerning: string }).fontKerning = "none";
  return (s: string) => c.measureText(s).width;
}

// Corta el texto en líneas como Word y devuelve cada línea con el espacio que necesita.
export function cortarLineas(texto: string, ancho: number, medir: (s: string) => number) {
  const palabras = texto.split(/ +/).filter(Boolean);
  const espacio = medir(" ");
  const lineas: { texto: string; espaciado: number }[] = [];
  let actual: string[] = [];
  const ajuste = (ws: string[]) => {
    const natural = medir(ws.join(" "));
    const n = ws.length - 1;
    return { natural, n, cabe: natural <= ancho || (n > 0 && natural - COMPRESION_MAX * n * espacio <= ancho + 0.01) };
  };
  // Si sobra espacio, Word estira los espacios hasta el margen (menos en la última línea);
  // si falta, los encoge hasta el margen, también en la última línea.
  const cerrar = (ws: string[], ultima: boolean) => {
    const { natural, n } = ajuste(ws);
    const resto = ancho - natural;
    lineas.push({ texto: ws.join(" "), espaciado: n && (resto < 0 || !ultima) ? resto / n : 0 });
  };
  for (const p of palabras) {
    const prueba = [...actual, p];
    if (!actual.length || ajuste(prueba).cabe) actual = prueba;
    else {
      cerrar(actual, false);
      actual = [p];
    }
  }
  if (actual.length) cerrar(actual, true);
  return lineas;
}

function Justificado({ texto, ancho }: { texto: string; ancho: number }) {
  const familia = useContext(Fuente);
  if (!familia) return <div className={e.justificado}>{texto}</div>;
  const lineas = cortarLineas(texto, ancho, medidorTexto(familia));
  return (
    <>
      {lineas.map((l, i) => (
        <span key={i} className={e.linea} style={l.espaciado ? { wordSpacing: `${l.espaciado}px` } : undefined}>
          {l.texto}
        </span>
      ))}
    </>
  );
}

function bloques(cv: DatosCV): Bloque[] {
  const b: Bloque[] = [];
  const titulo = (clave: string, texto: string) => b.push({ clave, clase: e.titulo, contenido: texto, conSiguiente: true });
  const vineta = (clave: string, texto: string) =>
    b.push({ clave, clase: e.vineta, contenido: <Justificado texto={texto} ancho={ANCHO_TEXTO - SANGRIA_VINETA} /> });

  const nombre = nombreCompleto(cv);
  if (nombre || cv.enlaceNombre.trim()) b.push({ clave: "nombre", clase: e.nombre, contenido: nombre });
  const contacto = [cv.correo.trim(), cv.telefono.trim()].filter(Boolean);
  if (contacto.length) b.push({ clave: "contacto", clase: e.contacto, contenido: contacto.join(" • ") });

  if (cv.perfil.trim()) {
    titulo("t-perfil", cv.titulos.perfil);
    b.push({ clave: "perfil", clase: "", contenido: <Justificado texto={cv.perfil.trim()} ancho={ANCHO_TEXTO} /> });
  }

  if (cv.educacion.length) {
    titulo("t-edu", cv.titulos.educacion);
    for (const x of cv.educacion) {
      b.push({
        clave: `${x.id}-1`,
        clase: `${e.fila} ${e.filaEdu}`,
        contenido: (
          <>
            <div className={e.negrita} style={{ marginRight: "-27.15pt" }}>{x.institucion}</div>
            <div className={`${e.derecha} ${e.chico}`}>{ubicacion(x)}</div>
          </>
        ),
      });
      b.push({
        clave: `${x.id}-2`,
        clase: `${e.fila} ${e.filaEdu}`,
        contenido: (
          <>
            <div style={{ marginRight: "-13pt" }}>{x.titulo}</div>
            <div className={`${e.derecha} ${e.chico}`}>{fechasEducacion(x)}</div>
          </>
        ),
      });
    }
  }

  const grupos = cv.habilidades.filter((g) => g.titulo.trim() || g.items.some((i) => textoHabilidad(i)));
  if (grupos.length) {
    titulo("t-hab", cv.titulos.habilidades);
    for (const g of grupos) {
      if (g.titulo.trim()) b.push({ clave: g.id, clase: e.negrita, contenido: g.titulo });
      for (const h of g.items) {
        const t = textoHabilidad(h);
        if (t) vineta(`${g.id}-${h.id}`, t);
      }
    }
  }

  if (cv.experiencia.length) {
    titulo("t-exp", cv.titulos.experiencia);
    for (const x of cv.experiencia) {
      b.push({
        clave: `${x.id}-1`,
        clase: e.fila,
        contenido: (
          <>
            <div className={e.negrita}>{empresaConRuc(x)}</div>
            <div className={e.derecha}>{ubicacion(x)}</div>
          </>
        ),
      });
      b.push({
        clave: `${x.id}-2`,
        clase: e.fila,
        contenido: (
          <>
            <div>{x.cargo}</div>
            <div className={e.derecha}>{fechasExperiencia(x)}</div>
          </>
        ),
      });
      x.logros.forEach((l, n) => l.trim() && vineta(`${x.id}-l${n}`, l.trim()));
    }
  }

  const pubs = cv.publicaciones.filter((x) => x.titulo.trim() || x.enlace.trim());
  if (pubs.length) {
    titulo("t-pub", cv.titulos.publicaciones);
    for (const x of pubs) {
      b.push({
        clave: x.id,
        clase: `${e.vineta} ${e.izquierda}`,
        contenido: (
          <>
            {x.titulo.trim() ? `${x.titulo.trim()} ` : ""}
            {x.enlace.trim() && <span className={e.enlace}>{x.enlace.trim()}</span>}
          </>
        ),
      });
    }
  }
  return b;
}

// Reparte los bloques en páginas. `altos` incluye el espacio anterior; `antes` es ese espacio,
// que Word quita cuando el párrafo queda arriba de la página.
function paginar(lista: Bloque[], altos: number[], antes: number[]): number[][] {
  const paginas: number[][] = [[]];
  let usado = 0;
  const alto = (i: number, arriba: boolean) => altos[i] - (arriba ? antes[i] : 0);
  for (let i = 0; i < lista.length; i++) {
    const pagina = paginas[paginas.length - 1];
    let necesario = alto(i, pagina.length === 0);
    if (lista[i].conSiguiente && i + 1 < lista.length) necesario += alto(i + 1, false);
    if (pagina.length && usado + necesario > ALTO_CUERPO + 0.5) {
      paginas.push([i]);
      usado = alto(i, true);
    } else {
      pagina.push(i);
      usado += alto(i, pagina.length === 1);
    }
  }
  return paginas;
}

// La hoja del CV (entra con animación si aparece después de cargar).
function Hoja({ escala, desborda, children }: { escala: number; desborda: boolean; children: ReactNode }) {
  const animar = useAlMontar();
  return (
    <div
      className={`${e.marco} ${animar ? e.hojaNueva : ""} cv-marco`}
      data-desborda={desborda || undefined}
      style={{ width: `${612 * escala}pt`, height: `${792 * escala}pt` }}
    >
      {children}
    </div>
  );
}

export type Desborde = { parrafos: number; lineas: number } | null;

// El formato es de una sola hoja: se muestra solo la primera, con los párrafos que caben
// enteros (igual que Word). Lo que no cabe se informa con `alDesbordar` para avisar y no
// permitir descargas que saldrían en dos hojas.
export function VistaHarvard({
  cv,
  escala = 1,
  alDesbordar,
}: {
  cv: DatosCV;
  escala?: number;
  alDesbordar?: (d: Desborde) => void;
}) {
  const lista = useMemo(() => bloques(cv), [cv]);
  const medidor = useRef<HTMLDivElement>(null);
  const [hoja, setHoja] = useState<number[]>(lista.map((_, i) => i));
  const [desborde, setDesborde] = useState<Desborde>(null);
  const [familia, setFamilia] = useState("");

  useLayoutEffect(() => {
    let vivo = true;
    document.fonts?.ready.then(() => {
      if (vivo && medidor.current) setFamilia(getComputedStyle(medidor.current).fontFamily);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useLayoutEffect(() => {
    const nodos = medidor.current ? [...medidor.current.children] : [];
    if (nodos.length !== lista.length) return;
    const altos = nodos.map((n) => n.getBoundingClientRect().height);
    const antes = nodos.map((n) => parseFloat(getComputedStyle(n).paddingTop) || 0);
    const [primera, ...resto] = paginar(lista, altos, antes);
    const fuera = resto.flat();
    const alto = fuera.reduce((s, i) => s + altos[i], 0);
    setHoja(primera);
    setDesborde(fuera.length ? { parrafos: fuera.length, lineas: Math.max(1, Math.round(alto / (13.8 * PX))) } : null);
  }, [lista, familia]);

  useEffect(() => {
    alDesbordar?.(desborde);
  }, [desborde, alDesbordar]);

  return (
    <Fuente.Provider value={familia}>
      <div className={`${e.pagina} ${e.medidor}`} aria-hidden="true">
        <div ref={medidor} className={e.cuerpo}>
          {lista.map((b) => (
            <div key={b.clave} className={b.clase}>
              {b.contenido}
            </div>
          ))}
        </div>
      </div>
      <Hoja escala={escala} desborda={!!desborde}>
        <div className={`${e.pagina} cv-pagina`} style={{ transform: escala === 1 ? undefined : `scale(${escala})` }}>
          <div className={e.cuerpo}>
            {hoja.map((i, j) =>
              lista[i] ? (
                <div key={lista[i].clave} className={`${lista[i].clase} ${j === 0 ? e.arriba : ""}`}>
                  {lista[i].contenido}
                </div>
              ) : null,
            )}
          </div>
        </div>
      </Hoja>
      {desborde && (
        <p className={e.corte} role="status" style={{ width: `${612 * escala}pt` }}>
          No cabe en una hoja: quedan fuera {desborde.parrafos} {desborde.parrafos === 1 ? "párrafo" : "párrafos"} (unas{" "}
          {desborde.lineas} {desborde.lineas === 1 ? "línea" : "líneas"}). Acorta el texto para descargar.
        </p>
      )}
    </Fuente.Provider>
  );
}
