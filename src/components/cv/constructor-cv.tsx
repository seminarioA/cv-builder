"use client";
// CV builder: los datos de la cuenta a la izquierda (editables, se guardan solos) y la vista
// previa de la plantilla a la derecha. Los datos son los mismos de «Mis datos».
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { VistaHarvard } from "./harvard";
import {
  EditorDatos,
  EditorEducacion,
  EditorExperiencia,
  EditorHabilidades,
  EditorPerfil,
  EditorPublicaciones,
  EditorTitulos,
  TextoGuardado,
  useAutoguardado,
} from "./editores-cv";
import { armarDocx, nombreArchivo, PLANTILLAS, plantilla, type IdPlantilla } from "@/lib/cv/plantillas";
import type { DatosCV } from "@/lib/cv/tipos";
import { salir } from "@/app/acciones";
import e from "./constructor-cv.module.css";

const ANCHO_PAGINA = (612 * 4) / 3; // px

function Seccion({ titulo, abierta, children }: { titulo: string; abierta?: boolean; children: ReactNode }) {
  return (
    <details className={e.seccion} open={abierta}>
      <summary>{titulo}</summary>
      <div className={e.contenidoSeccion}>{children}</div>
    </details>
  );
}

export function ConstructorCV({
  cuenta,
  datos,
  plantillaInicial,
}: {
  cuenta: { nombre: string; correo: string };
  datos: DatosCV;
  plantillaInicial: string;
}) {
  const [cv, setCv] = useState<DatosCV>(datos);
  const [idPlantilla, setIdPlantilla] = useState<IdPlantilla>(plantilla(plantillaInicial).id);
  const [vista, setVista] = useState<"datos" | "vista">("datos");
  const [escala, setEscala] = useState(0.6);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const marco = useRef<HTMLDivElement>(null);
  const estado = useAutoguardado(cv, { plantilla: idPlantilla });

  useEffect(() => {
    const nodo = marco.current;
    if (!nodo) return;
    const ajustar = () => setEscala(Math.max(0.3, Math.min(1.25, (nodo.clientWidth - 48) / ANCHO_PAGINA)));
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(nodo);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof DatosCV>(k: K, v: DatosCV[K]) => setCv((c) => ({ ...c, [k]: v }));
  const p = plantilla(idPlantilla);
  const editor = { cv, set };

  async function descargarWord() {
    setOcupado(true);
    setAviso("");
    try {
      const r = await fetch(p.base);
      if (!r.ok) throw new Error();
      const docx = await armarDocx(new Uint8Array(await r.arrayBuffer()), p, cv);
      const url = URL.createObjectURL(
        new Blob([docx as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo(cv, "docx");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setAviso("No se pudo generar el archivo de Word. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  function descargarPdf() {
    // El nombre del PDF que propone el navegador sale del título de la página.
    const antes = document.title;
    document.title = nombreArchivo(cv, "pdf").replace(/\.pdf$/, "");
    window.print();
    document.title = antes;
  }

  return (
    <div className={e.app} data-vista={vista}>
      <header className={e.barra}>
        <Link href="/" className={e.marca} aria-label="CV Builder">
          <Logo tamano={24} />
          <span>CV Builder</span>
        </Link>
        <div className={e.pestanas} role="tablist" aria-label="Mostrar">
          <button type="button" role="tab" aria-selected={vista === "datos"} onClick={() => setVista("datos")}>
            Datos
          </button>
          <button type="button" role="tab" aria-selected={vista === "vista"} onClick={() => setVista("vista")}>
            Vista previa
          </button>
        </div>
        <div className={e.acciones}>
          <button type="button" className="boton boton--secundario boton--chico" onClick={descargarPdf}>
            PDF
          </button>
          <button type="button" className="boton boton--chico" onClick={descargarWord} disabled={ocupado}>
            {ocupado ? "Generando…" : "Word (.docx)"}
          </button>
        </div>
      </header>

      <aside className={e.lateral} aria-label="Datos del CV">
        <div className={e.perfiles}>
          <div className={e.cuenta}>
            <div>
              <strong>{cuenta.nombre}</strong>
              <span>{cuenta.correo}</span>
            </div>
            <form action={salir}>
              <button type="submit" className="boton-texto">
                Salir
              </button>
            </form>
          </div>
          <Link href="/mis-datos" className="boton boton--secundario boton--chico">
            Editar mis datos paso a paso
          </Link>
          <TextoGuardado estado={estado} />
          {aviso && (
            <p className={e.error} role="alert">
              {aviso}
            </p>
          )}
        </div>

        <Seccion titulo="Plantilla" abierta>
          <div className={e.plantillas}>
            {PLANTILLAS.map((x) => (
              <label key={x.id} className={e.plantilla} data-activa={x.id === idPlantilla}>
                <input type="radio" name="plantilla" checked={x.id === idPlantilla} onChange={() => setIdPlantilla(x.id)} />
                <strong>{x.nombre}</strong>
                <span>{x.descripcion}</span>
              </label>
            ))}
          </div>
        </Seccion>
        <Seccion titulo="Datos personales">
          <EditorDatos {...editor} />
        </Seccion>
        <Seccion titulo={cv.titulos.perfil || "Perfil"}>
          <EditorPerfil {...editor} />
        </Seccion>
        <Seccion titulo={cv.titulos.educacion || "Educación"}>
          <EditorEducacion {...editor} />
        </Seccion>
        <Seccion titulo={cv.titulos.habilidades || "Habilidades"}>
          <EditorHabilidades {...editor} />
        </Seccion>
        <Seccion titulo={cv.titulos.experiencia || "Experiencia"}>
          <EditorExperiencia {...editor} />
        </Seccion>
        <Seccion titulo={cv.titulos.publicaciones || "Publicaciones"}>
          <EditorPublicaciones {...editor} />
        </Seccion>
        <Seccion titulo="Títulos de las secciones">
          <EditorTitulos {...editor} />
        </Seccion>
      </aside>

      <main className={e.vista} ref={marco} aria-label="Vista previa del CV">
        <div className={e.paginas}>{p.id === "harvard" && <VistaHarvard cv={cv} escala={escala} />}</div>
      </main>
    </div>
  );
}
