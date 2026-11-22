"use client";
// Editores de cada parte de los datos del CV. Los usan el formulario por pasos (Mis datos)
// y la barra lateral del CV builder, así ambos editan exactamente lo mismo.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilaHabilidad, IntervaloAños, IntervaloMeses, Lugar } from "./campos-cv";
import { useAlMontar, useFlip, useQuitarAnimado } from "./animacion";
import { esBlanda } from "@/lib/cv/habilidades";
import { INSTITUCIONES, SIGLAS } from "@/lib/cv/instituciones";
import {
  nuevaEducacion,
  nuevaExperiencia,
  nuevoId,
  TITULOS_POR_DEFECTO,
  type DatosCV,
  type Educacion,
  type Experiencia,
  type GrupoHabilidades,
  type Publicacion,
  type Titulos,
} from "@/lib/cv/tipos";
import { guardarDatos } from "@/app/acciones";
import e from "./constructor-cv.module.css";

export type Editor = {
  cv: DatosCV;
  set: <K extends keyof DatosCV>(k: K, v: DatosCV[K]) => void;
};

export type EstadoGuardado = "" | "guardando" | "guardado" | "error";

// Guarda en la cuenta un momento después del último cambio. Devuelve el estado para mostrarlo.
export function useAutoguardado(cv: DatosCV, extra: { paso?: number; plantilla?: string }, listo = true) {
  const [estado, setEstado] = useState<EstadoGuardado>("");
  // Lo que ya está en la cuenta: si no cambió nada, no se guarda.
  const guardado = useRef(JSON.stringify({ cv, ...extra }));
  const ultimo = useRef<{
    datos: DatosCV;
    paso?: number;
    plantilla?: string;
  } | null>(null);
  useEffect(() => {
    if (!listo) return;
    const ahora = JSON.stringify({ cv, ...extra });
    if (ahora === guardado.current) return;
    guardado.current = ahora;
    setEstado("guardando");
    ultimo.current = { datos: cv, ...extra };
    const t = setTimeout(async () => {
      const r = await guardarDatos({ datos: cv, ...extra }).catch(() => ({
        ok: false,
      }));
      setEstado(r.ok ? "guardado" : "error");
      ultimo.current = null;
    }, 700);
    return () => clearTimeout(t);
    // extra se compara por valor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv, extra.paso, extra.plantilla, listo]);

  // Si cierra la pestaña antes de que se guarde, se intenta igual.
  useEffect(() => {
    const salir = () => {
      if (ultimo.current) void guardarDatos(ultimo.current);
    };
    window.addEventListener("pagehide", salir);
    return () => window.removeEventListener("pagehide", salir);
  }, []);
  return estado;
}

export function TextoGuardado({ estado }: { estado: EstadoGuardado }) {
  const t = {
    "": "Se guarda solo mientras escribes",
    guardando: "Guardando…",
    guardado: "Guardado",
    error: "No se pudo guardar; revisa tu conexión",
  }[estado];
  return (
    <span className={e.estado} role="status" data-estado={estado}>
      <span key={estado} className={estado ? e.entraSuave : undefined}>
        {t}
      </span>
    </span>
  );
}

export function mover<T>(lista: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

export function Campo({
  etiqueta,
  valor,
  cambiar,
  tipo = "text",
  pista,
  filas,
  placeholder,
  modo,
  lista,
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  tipo?: string;
  pista?: string;
  filas?: number;
  placeholder?: string;
  modo?: "numeric" | "email" | "tel" | "url";
  lista?: string; // id de un <datalist> con sugerencias que se filtran al escribir
}) {
  return (
    <label className={`campo ${e.campo}`}>
      <span className={e.etiqueta}>{etiqueta}</span>
      {filas ? (
        <textarea rows={filas} value={valor} placeholder={placeholder} onChange={(ev) => cambiar(ev.target.value)} />
      ) : (
        <input
          type={tipo}
          inputMode={modo}
          list={lista}
          autoComplete={lista ? "off" : undefined}
          value={valor}
          placeholder={placeholder}
          onChange={(ev) => cambiar(ev.target.value)}
        />
      )}
      {pista && <span className="pista">{pista}</span>}
    </label>
  );
}

function Herramientas({ i, total, mover: m, quitar }: { i: number; total: number; mover: (d: number) => void; quitar: () => void }) {
  return (
    <div className={e.herramientas}>
      <button type="button" onClick={() => m(-1)} disabled={i === 0} aria-label="Subir">
        ↑
      </button>
      <button type="button" onClick={() => m(1)} disabled={i === total - 1} aria-label="Bajar">
        ↓
      </button>
      <button type="button" onClick={quitar} aria-label="Quitar" className={e.quitar}>
        ✕
      </button>
    </div>
  );
}

// Envoltorio de cada elemento de una lista: entra, sale y se desliza con animación.
export function ItemAnimado({
  id,
  saliendo,
  className,
  children,
}: {
  id: string;
  saliendo: boolean;
  className: string;
  children: ReactNode;
}) {
  const animar = useAlMontar();
  return (
    <div
      data-flip={id}
      className={`${className} ${animar ? e.entra : ""} ${saliendo ? e.saliendo : ""}`}
      aria-hidden={saliendo || undefined}
    >
      {children}
    </div>
  );
}

function Lista<T extends { id: string }>({
  items,
  cambiar,
  nombre,
  titulo,
  nuevo,
  agregar,
  render,
}: {
  items: T[];
  cambiar: (l: T[]) => void;
  nombre: string;
  titulo: (x: T) => string;
  nuevo: () => T;
  agregar: string;
  render: (x: T, set: (p: Partial<T>) => void) => ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const ultimos = useRef(items);
  ultimos.current = items;
  const { saliendo, quitar } = useQuitarAnimado();
  useFlip(caja);
  return (
    <>
      <div ref={caja} className={e.lista}>
        {items.map((x, i) => (
          <ItemAnimado key={x.id} id={x.id} saliendo={saliendo.has(x.id)} className={e.elemento}>
            <div className={e.cabeceraElemento}>
              <strong>{titulo(x) || `${nombre} ${i + 1}`}</strong>
              <Herramientas
                i={i}
                total={items.length}
                mover={(d) => cambiar(mover(items, i, d))}
                quitar={() => quitar(x.id, () => cambiar(ultimos.current.filter((y) => y.id !== x.id)))}
              />
            </div>
            {render(x, (p) => cambiar(ultimos.current.map((y) => (y.id === x.id ? { ...y, ...p } : y))))}
          </ItemAnimado>
        ))}
      </div>
      <button type="button" className={`boton boton--secundario boton--chico ${e.agregar}`} onClick={() => cambiar([...items, nuevo()])}>
        + {agregar}
      </button>
    </>
  );
}

// Filas de habilidades de un grupo, con las mismas animaciones que las listas.
function FilasHabilidades({ g, s }: { g: GrupoHabilidades; s: (p: Partial<GrupoHabilidades>) => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const ultimos = useRef(g.items);
  ultimos.current = g.items;
  const { saliendo, quitar } = useQuitarAnimado();
  const blanda = esBlanda(g.titulo);
  useFlip(caja);
  return (
    <>
      <div ref={caja} className={e.habilidades}>
        {g.items.map((h, i) => (
          <ItemAnimado key={h.id} id={h.id} saliendo={saliendo.has(h.id)} className={e.filaAnimada}>
            <FilaHabilidad
              h={h}
              blanda={blanda}
              cambiar={(c) =>
                s({
                  items: ultimos.current.map((y) => (y.id === h.id ? { ...y, ...c } : y)),
                })
              }
              quitar={() => quitar(h.id, () => s({ items: ultimos.current.filter((y) => y.id !== h.id) }))}
              subir={i > 0 ? () => s({ items: mover(g.items, i, -1) }) : undefined}
              bajar={i < g.items.length - 1 ? () => s({ items: mover(g.items, i, 1) }) : undefined}
            />
          </ItemAnimado>
        ))}
      </div>
      <button
        type="button"
        className={`boton-texto ${e.agregar}`}
        onClick={() =>
          s({
            items: [
              ...g.items,
              {
                id: nuevoId(),
                nombre: "",
                nivel: blanda ? "" : "Intermedio",
                detalle: "",
              },
            ],
          })
        }
      >
        + Agregar habilidad
      </button>
    </>
  );
}

export function EditorDatos({ cv, set }: Editor) {
  return (
    <>
      <Campo etiqueta="Nombre completo" valor={cv.nombre} cambiar={(v) => set("nombre", v)} />
      <Campo
        etiqueta="Enlace del nombre"
        tipo="url"
        valor={cv.enlaceNombre}
        cambiar={(v) => set("enlaceNombre", v)}
        placeholder="https://www.linkedin.com/in/…"
        pista="En el Word, tu nombre abre este enlace (por ejemplo, tu LinkedIn)."
      />
      <div className={e.dosCampos}>
        <Campo etiqueta="Correo" tipo="email" valor={cv.correo} cambiar={(v) => set("correo", v)} />
        <Campo etiqueta="Teléfono" tipo="tel" valor={cv.telefono} cambiar={(v) => set("telefono", v)} placeholder="+51 …" />
      </div>
    </>
  );
}

export function EditorPerfil({ cv, set }: Editor) {
  return (
    <Campo
      etiqueta="Resumen profesional"
      filas={8}
      valor={cv.perfil}
      cambiar={(v) => set("perfil", v)}
      pista="3 a 5 líneas: qué estudias o haces, en qué tienes experiencia y qué te distingue."
    />
  );
}

export function EditorEducacion({ cv, set }: Editor) {
  return (
    <>
      <Lista<Educacion>
        items={cv.educacion}
        cambiar={(l) => set("educacion", l)}
        nombre="Estudio"
        titulo={(x) => x.institucion}
        agregar="Agregar estudio"
        nuevo={nuevaEducacion}
        render={(x, s) => (
          <>
            <Campo
              etiqueta="Institución"
              valor={x.institucion}
              cambiar={(v) => s({ institucion: v })}
              lista="cv-instituciones"
              placeholder="Busca por nombre o sigla: San Marcos, PUCP, SENATI…"
            />
            <Campo
              etiqueta="Carrera o grado"
              valor={x.titulo}
              cambiar={(v) => s({ titulo: v })}
              placeholder="Ingeniería de Sistemas, 9no Semestre"
            />
            <Lugar ciudad={x.ciudad} pais={x.pais} cambiar={(v) => s(v)} />
            <IntervaloAños x={x} cambiar={(v) => s(v)} />
          </>
        )}
      />
      <datalist id="cv-instituciones">
        {INSTITUCIONES.map((n) => (
          <option key={n} value={n} label={SIGLAS[n]} />
        ))}
      </datalist>
    </>
  );
}

export function EditorHabilidades({ cv, set }: Editor) {
  return (
    <>
      <Lista<GrupoHabilidades>
        items={cv.habilidades}
        cambiar={(l) => set("habilidades", l)}
        nombre="Grupo"
        titulo={(x) => x.titulo}
        agregar="Agregar grupo"
        nuevo={() => ({
          id: nuevoId(),
          titulo: cv.habilidades.length ? "Soft Skills" : "Hard Skills",
          items: [],
        })}
        render={(g, s) => (
          <>
            <label className={`campo ${e.campo}`}>
              <span className={e.etiqueta}>Título del grupo</span>
              <input list="cv-grupos" value={g.titulo} onChange={(ev) => s({ titulo: ev.target.value })} />
            </label>
            <FilasHabilidades g={g} s={s} />
          </>
        )}
      />
      <datalist id="cv-grupos">
        <option value="Hard Skills" />
        <option value="Soft Skills" />
        <option value="Habilidades técnicas" />
        <option value="Habilidades blandas" />
        <option value="Idiomas" />
      </datalist>
    </>
  );
}

export function EditorExperiencia({ cv, set }: Editor) {
  return (
    <Lista<Experiencia>
      items={cv.experiencia}
      cambiar={(l) => set("experiencia", l)}
      nombre="Experiencia"
      titulo={(x) => x.empresa}
      agregar="Agregar experiencia"
      nuevo={nuevaExperiencia}
      render={(x, s) => (
        <>
          <div className={e.empresaRuc}>
            <Campo etiqueta="Empresa" valor={x.empresa} cambiar={(v) => s({ empresa: v })} />
            <Campo
              etiqueta="RUC (opcional)"
              valor={x.ruc}
              cambiar={(v) => s({ ruc: v.replace(/[^\d-]/g, "").slice(0, 13) })}
              placeholder="20123456789"
              modo="numeric"
            />
          </div>
          <Campo etiqueta="Cargo" valor={x.cargo} cambiar={(v) => s({ cargo: v })} />
          <Lugar ciudad={x.ciudad} pais={x.pais} modalidad={x.modalidad} cambiar={(v) => s(v)} />
          <IntervaloMeses x={x} cambiar={(v) => s(v)} />
          <Campo
            etiqueta="Logros"
            filas={5}
            valor={x.logros.join("\n")}
            cambiar={(v) => s({ logros: v.split("\n") })}
            pista="Uno por línea; cada línea es una viñeta. Empieza con un verbo: Diseñé, Lideré, Implementé…"
          />
        </>
      )}
    />
  );
}

export function EditorPublicaciones({ cv, set }: Editor) {
  return (
    <Lista<Publicacion>
      items={cv.publicaciones}
      cambiar={(l) => set("publicaciones", l)}
      nombre="Publicación"
      titulo={(x) => x.titulo}
      agregar="Agregar publicación"
      nuevo={() => ({ id: nuevoId(), titulo: "", enlace: "" })}
      render={(x, s) => (
        <>
          <Campo etiqueta="Título" valor={x.titulo} cambiar={(v) => s({ titulo: v })} />
          <Campo etiqueta="Enlace" tipo="url" valor={x.enlace} cambiar={(v) => s({ enlace: v })} placeholder="https://doi.org/…" />
        </>
      )}
    />
  );
}

export function EditorTitulos({ cv, set }: Editor) {
  return (
    <>
      {(Object.keys(TITULOS_POR_DEFECTO) as (keyof Titulos)[]).map((k) => (
        <Campo key={k} etiqueta={TITULOS_POR_DEFECTO[k]} valor={cv.titulos[k]} cambiar={(v) => set("titulos", { ...cv.titulos, [k]: v })} />
      ))}
    </>
  );
}
