"use client";
// Controles del CV builder: lugar (país y ciudad), fechas (mes y año) y habilidades.
import { cloneElement, useState, type ReactElement } from "react";
import { useAlMontar } from "./animacion";
import { CIUDADES, MODALIDADES, PAISES, type Modalidad } from "@/lib/cv/lugares";
import { duracion, MESES, partes } from "@/lib/cv/fechas";
import { HABILIDADES_BLANDAS, HABILIDADES_TECNICAS, NIVELES, type Habilidad } from "@/lib/cv/habilidades";
import e from "./constructor-cv.module.css";

const OTRA = "__otra__";
const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: AÑO_ACTUAL + 6 - 1960 }, (_, i) => String(AÑO_ACTUAL + 5 - i));

// Hace que su hijo entre con una animación cuando aparece (no al cargar la página).
function Aparece({ children }: { children: ReactElement<{ className?: string }> }) {
  const animar = useAlMontar();
  return animar
    ? cloneElement(children, {
        className: `${children.props.className ?? ""} ${e.entraSuave}`,
      })
    : children;
}

export function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className={e.etiqueta}>{children}</span>;
}

export function Lugar({
  ciudad,
  pais,
  modalidad,
  cambiar,
}: {
  ciudad: string;
  pais: string;
  modalidad?: Modalidad;
  cambiar: (p: { ciudad?: string; pais?: string; modalidad?: Modalidad }) => void;
}) {
  const lista = CIUDADES[pais] ?? [];
  const [otra, setOtra] = useState(false);
  const escribir = otra || !lista.length || (ciudad !== "" && !lista.includes(ciudad));
  return (
    <div className={`campo ${e.campo}`}>
      <Etiqueta>Ubicación</Etiqueta>
      <div className={e.fila3} data-modalidad={modalidad !== undefined}>
        <select aria-label="País" value={pais} onChange={(ev) => (setOtra(false), cambiar({ pais: ev.target.value, ciudad: "" }))}>
          <option value="">País…</option>
          {pais && !PAISES.includes(pais) && <option value={pais}>{pais}</option>}
          {PAISES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {escribir ? (
          <Aparece key="escribir">
            <div className={e.conBoton}>
              <input aria-label="Ciudad" placeholder="Ciudad" value={ciudad} onChange={(ev) => cambiar({ ciudad: ev.target.value })} />
              {lista.length > 0 && (
                <button type="button" title="Elegir de la lista" onClick={() => (setOtra(false), cambiar({ ciudad: "" }))}>
                  ☰
                </button>
              )}
            </div>
          </Aparece>
        ) : (
          <Aparece key="lista">
            <select
              aria-label="Ciudad"
              value={ciudad}
              onChange={(ev) =>
                ev.target.value === OTRA ? (setOtra(true), cambiar({ ciudad: "" })) : cambiar({ ciudad: ev.target.value })
              }
            >
              <option value="">Ciudad…</option>
              {lista.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option value={OTRA}>Otra ciudad…</option>
            </select>
          </Aparece>
        )}
        {modalidad !== undefined && (
          <select aria-label="Modalidad" value={modalidad} onChange={(ev) => cambiar({ modalidad: ev.target.value as Modalidad })}>
            <option value="">Modalidad…</option>
            {MODALIDADES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function MesAño({
  valor,
  cambiar,
  etiqueta,
  deshabilitado,
  className = "",
}: {
  valor: string;
  cambiar: (v: string) => void;
  etiqueta: string;
  deshabilitado?: boolean;
  className?: string;
}) {
  const p = partes(valor);
  const [mes, setMes] = useState(p ? String(p.mes) : "");
  const [año, setAño] = useState(p ? String(p.año) : "");
  const m = p ? String(p.mes) : mes;
  const a = p ? String(p.año) : año;
  const fijar = (nm: string, na: string) => {
    setMes(nm);
    setAño(na);
    cambiar(nm && na ? `${na}-${nm.padStart(2, "0")}` : "");
  };
  return (
    <div className={`${e.mesAño} ${className}`}>
      <select aria-label={`${etiqueta}: mes`} value={m} disabled={deshabilitado} onChange={(ev) => fijar(ev.target.value, a)}>
        <option value="">Mes</option>
        {MESES.map((x, i) => (
          <option key={x} value={String(i + 1)}>
            {x}
          </option>
        ))}
      </select>
      <select aria-label={`${etiqueta}: año`} value={a} disabled={deshabilitado} onChange={(ev) => fijar(m, ev.target.value)}>
        <option value="">Año</option>
        {AÑOS.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}

// Intervalo de meses (experiencia): inicio, fin o «Actualidad», y la duración calculada.
export function IntervaloMeses({
  x,
  cambiar,
}: {
  x: { inicio: string; fin: string; actual: boolean; mostrarDuracion: boolean };
  cambiar: (
    p: Partial<{
      inicio: string;
      fin: string;
      actual: boolean;
      mostrarDuracion: boolean;
    }>,
  ) => void;
}) {
  const d = !x.actual ? duracion(x.inicio, x.fin) : "";
  const invertido = !x.actual && x.inicio && x.fin && x.fin < x.inicio;
  return (
    <div className={`campo ${e.campo}`}>
      <Etiqueta>Fechas</Etiqueta>
      <div className={e.intervalo}>
        <MesAño etiqueta="Inicio" valor={x.inicio} cambiar={(v) => cambiar({ inicio: v })} />
        <span className={e.guion}>–</span>
        {x.actual ? (
          <Aparece key="actual">
            <span className={e.actualidad}>Actualidad</span>
          </Aparece>
        ) : (
          <Aparece key="fin">
            <MesAño etiqueta="Fin" valor={x.fin} cambiar={(v) => cambiar({ fin: v })} />
          </Aparece>
        )}
      </div>
      <div className={e.casillas}>
        <label>
          <input type="checkbox" checked={x.actual} onChange={(ev) => cambiar({ actual: ev.target.checked })} /> Trabajo aquí actualmente
        </label>
        {!x.actual && (
          <Aparece>
            <label>
              <input type="checkbox" checked={x.mostrarDuracion} onChange={(ev) => cambiar({ mostrarDuracion: ev.target.checked })} />{" "}
              Mostrar duración{d ? ` (${d})` : ""}
            </label>
          </Aparece>
        )}
      </div>
      {invertido && (
        <Aparece>
          <span className={e.aviso}>La fecha de fin es anterior a la de inicio.</span>
        </Aparece>
      )}
    </div>
  );
}

// Intervalo de años (educación): «2022 - Presente».
export function IntervaloAños({
  x,
  cambiar,
}: {
  x: { inicio: string; fin: string; actual: boolean };
  cambiar: (p: Partial<{ inicio: string; fin: string; actual: boolean }>) => void;
}) {
  return (
    <div className={`campo ${e.campo}`}>
      <Etiqueta>Años</Etiqueta>
      <div className={e.intervalo}>
        <select aria-label="Año de inicio" value={x.inicio} onChange={(ev) => cambiar({ inicio: ev.target.value })}>
          <option value="">Inicio</option>
          {AÑOS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <span className={e.guion}>–</span>
        {x.actual ? (
          <Aparece key="actual">
            <span className={e.actualidad}>Presente</span>
          </Aparece>
        ) : (
          <Aparece key="fin">
            <select aria-label="Año de fin" value={x.fin} onChange={(ev) => cambiar({ fin: ev.target.value })}>
              <option value="">Fin</option>
              {AÑOS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Aparece>
        )}
      </div>
      <div className={e.casillas}>
        <label>
          <input type="checkbox" checked={x.actual} onChange={(ev) => cambiar({ actual: ev.target.checked })} /> En curso
        </label>
      </div>
    </div>
  );
}

const TODAS_TECNICAS = Object.values(HABILIDADES_TECNICAS).flat();

// Una habilidad: nombre (de la lista o escrito), nivel y detalle.
export function FilaHabilidad({
  h,
  blanda,
  cambiar,
  quitar,
  subir,
  bajar,
}: {
  h: Habilidad;
  blanda: boolean;
  cambiar: (p: Partial<Habilidad>) => void;
  quitar: () => void;
  subir?: () => void;
  bajar?: () => void;
}) {
  const conocidas = blanda ? HABILIDADES_BLANDAS : TODAS_TECNICAS;
  const [otra, setOtra] = useState(false);
  const escribir = otra || (h.nombre !== "" && !conocidas.includes(h.nombre));
  return (
    <div className={`campo ${e.habilidad}`} data-blanda={blanda}>
      <div className={e.habilidadNombre}>
        {escribir ? (
          <Aparece key="escribir">
            <div className={e.conBoton}>
              <input
                aria-label="Habilidad"
                placeholder="Escribe la habilidad"
                value={h.nombre}
                onChange={(ev) => cambiar({ nombre: ev.target.value })}
                autoFocus={otra}
              />
              <button type="button" title="Elegir de la lista" onClick={() => (setOtra(false), cambiar({ nombre: "" }))}>
                ☰
              </button>
            </div>
          </Aparece>
        ) : (
          <Aparece key="lista">
            <select
              aria-label="Habilidad"
              value={h.nombre}
              onChange={(ev) =>
                ev.target.value === OTRA ? (setOtra(true), cambiar({ nombre: "" })) : cambiar({ nombre: ev.target.value })
              }
            >
              <option value="">Elige una habilidad…</option>
              {blanda
                ? HABILIDADES_BLANDAS.map((x) => <option key={x}>{x}</option>)
                : Object.entries(HABILIDADES_TECNICAS).map(([grupo, xs]) => (
                    <optgroup key={grupo} label={grupo}>
                      {xs.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </optgroup>
                  ))}
              <option value={OTRA}>Otra (escribir)…</option>
            </select>
          </Aparece>
        )}
        {!blanda && (
          <select aria-label="Nivel" value={h.nivel} onChange={(ev) => cambiar({ nivel: ev.target.value })}>
            <option value="">Sin nivel</option>
            {NIVELES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        )}
        <div className={e.herramientas}>
          <button type="button" onClick={subir} disabled={!subir} aria-label="Subir">
            ↑
          </button>
          <button type="button" onClick={bajar} disabled={!bajar} aria-label="Bajar">
            ↓
          </button>
          <button type="button" onClick={quitar} aria-label="Quitar" className={e.quitar}>
            ✕
          </button>
        </div>
      </div>
      {!blanda && (
        <input
          aria-label="Detalle"
          placeholder="Herramientas o detalle: FastAPI, pandas, Pytest…"
          value={h.detalle}
          onChange={(ev) => cambiar({ detalle: ev.target.value })}
        />
      )}
    </div>
  );
}
