"use client";
// «Mis datos»: formulario por pasos para cargar los datos del CV. Cada cambio se guarda solo en
// la cuenta, junto con el paso, así se puede dejar en cualquier momento y seguir después donde
// quedó. También se puede rellenar desde un CV en Word (.docx).
import Link from "next/link";
import { useRef, useState } from "react";
import { Logo } from "@/components/logo";
import {
  EditorDatos,
  EditorEducacion,
  EditorExperiencia,
  EditorHabilidades,
  EditorPerfil,
  EditorPublicaciones,
  TextoGuardado,
  useAutoguardado,
  type Editor,
} from "./editores-cv";
import { importarDocx } from "@/lib/cv/importar-docx";
import { silenciarEntradas } from "./animacion";
import type { DatosCV } from "@/lib/cv/tipos";
import { salir } from "@/app/acciones";
import e from "./constructor-cv.module.css";

type Paso = { titulo: string; bajada: string; Editor?: (p: Editor) => React.ReactNode; hecho: (cv: DatosCV) => boolean };

const PASOS: Paso[] = [
  { titulo: "Empezar", bajada: "Rellena tus datos desde tu CV en Word o escríbelos tú.", hecho: () => true },
  {
    titulo: "Datos personales",
    bajada: "Cómo te llamas y cómo pueden contactarte.",
    Editor: EditorDatos,
    hecho: (cv) => !!(cv.nombres && cv.apellidos && (cv.correo || cv.telefono)),
  },
  { titulo: "Perfil", bajada: "Un resumen corto de quién eres profesionalmente.", Editor: EditorPerfil, hecho: (cv) => !!cv.perfil.trim() },
  { titulo: "Educación", bajada: "Tus estudios, del más reciente al más antiguo.", Editor: EditorEducacion, hecho: (cv) => cv.educacion.length > 0 },
  {
    titulo: "Habilidades",
    bajada: "Una habilidad por fila. Elige de la lista o escribe la tuya.",
    Editor: EditorHabilidades,
    hecho: (cv) => cv.habilidades.some((g) => g.items.length > 0),
  },
  { titulo: "Experiencia", bajada: "Trabajos, prácticas y voluntariados.", Editor: EditorExperiencia, hecho: (cv) => cv.experiencia.length > 0 },
  { titulo: "Publicaciones", bajada: "Opcional: artículos, papers o investigaciones.", Editor: EditorPublicaciones, hecho: (cv) => cv.publicaciones.length > 0 },
  { titulo: "Listo", bajada: "Tus datos están guardados. Ya puedes armar tu CV.", hecho: () => true },
];
const ULTIMO = PASOS.length - 1;

const tieneDatos = (cv: DatosCV) =>
  !!(cv.perfil || cv.correo || cv.educacion.length || cv.experiencia.length || cv.habilidades.length || cv.publicaciones.length);

export function FormularioPasos({
  cuenta,
  datos,
  pasoGuardado,
}: {
  cuenta: { nombre: string; correo: string };
  datos: DatosCV;
  pasoGuardado: number;
}) {
  const [cv, setCv] = useState(datos);
  const [paso, setPaso] = useState(Math.min(pasoGuardado, ULTIMO));
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  // Hacia dónde fue el último cambio de paso: el contenido entra desde ese lado.
  const [direccion, setDireccion] = useState<"adelante" | "atras" | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const estado = useAutoguardado(cv, { paso });

  const set = <K extends keyof DatosCV>(k: K, v: DatosCV[K]) => setCv((c) => ({ ...c, [k]: v }));
  const ir = (n: number) => {
    const destino = Math.max(0, Math.min(ULTIMO, n));
    if (destino === paso) return;
    silenciarEntradas();
    setDireccion(destino > paso ? "adelante" : "atras");
    setPaso(destino);
    setAviso(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => titulo.current?.focus());
  };

  async function importar(f: File) {
    if (tieneDatos(cv) && !confirm("Esto reemplaza los datos que ya cargaste por los de tu Word. ¿Continuar?")) return;
    setLeyendo(true);
    setAviso(null);
    try {
      const nuevos = await importarDocx(new Uint8Array(await f.arrayBuffer()));
      if (!nuevos.nombres && !nuevos.experiencia.length && !nuevos.educacion.length) throw new Error();
      setCv(nuevos);
      ir(1);
      setAviso({ tipo: "ok", texto: `Se rellenaron tus datos desde «${f.name}». Revísalos paso a paso; lo que falte, lo completas aquí.` });
    } catch {
      setAviso({ tipo: "error", texto: "No se pudo leer ese archivo. Sube un CV en Word (.docx)." });
    } finally {
      setLeyendo(false);
    }
  }

  const actual = PASOS[paso];
  return (
    <div className={e.asistente}>
      <header className={e.barra}>
        <Link href="/" className={e.marca}>
          <Logo tamano={24} />
          <span>CV Builder</span>
        </Link>
        <div className={e.acciones}>
          <TextoGuardado estado={estado} />
          <form action={salir}>
            <button type="submit" className="boton-texto">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className={e.asistenteCuerpo}>
        <nav aria-label="Pasos" className={e.pasos}>
          <ol>
            {PASOS.map((x, i) => (
              <li key={x.titulo}>
                <button
                  type="button"
                  onClick={() => ir(i)}
                  aria-current={i === paso ? "step" : undefined}
                  data-hecho={i > 0 && i < ULTIMO && x.hecho(cv)}
                >
                  <span className={e.numeroPaso}>{i + 1}</span>
                  {x.titulo}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className={e.tarjetaPaso} aria-labelledby="titulo-paso">
          <div key={paso} className={`${e.contenidoTarjeta} ${direccion === "adelante" ? e.pasoAdelante : direccion === "atras" ? e.pasoAtras : ""}`}>
          <p className={e.contadorPaso}>
            Paso {paso + 1} de {PASOS.length}
          </p>
          <h1 id="titulo-paso" ref={titulo} tabIndex={-1}>
            {paso === 0 ? `Hola, ${cuenta.nombre.split(" ")[0]}` : actual.titulo}
          </h1>
          <p className={e.bajadaPaso}>{actual.bajada}</p>
          {aviso && (
            <p className={aviso.tipo === "ok" ? e.exito : e.error} role="status">
              {aviso.texto}
            </p>
          )}

          {paso === 0 && (
            <div className={e.opcionesInicio}>
              <button type="button" className={e.opcion} onClick={() => archivo.current?.click()} disabled={leyendo}>
                <strong>{leyendo ? "Leyendo tu Word…" : "Rellenar desde mi CV en Word"}</strong>
                <span>Sube tu .docx y llenamos los campos por ti. Luego los revisas.</span>
              </button>
              <button type="button" className={e.opcion} onClick={() => ir(1)}>
                <strong>{tieneDatos(cv) ? "Revisar mis datos" : "Escribirlos yo"}</strong>
                <span>Paso a paso. Puedes salir cuando quieras: se guarda solo y sigues después donde quedaste.</span>
              </button>
              <input
                ref={archivo}
                type="file"
                hidden
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  ev.target.value = "";
                  if (f) importar(f);
                }}
              />
            </div>
          )}

          {actual.Editor && (
            <div className={e.contenidoPaso}>
              <actual.Editor cv={cv} set={set} />
            </div>
          )}

          {paso === ULTIMO && (
            <div className={e.opcionesInicio}>
              <Link href="/" className="boton">
                Ver y descargar mi CV
              </Link>
            </div>
          )}

          <div className={e.navPaso}>
            {paso > 0 && (
              <button type="button" className="boton boton--secundario" onClick={() => ir(paso - 1)}>
                Anterior
              </button>
            )}
            {paso > 0 && paso < ULTIMO && (
              <button type="button" className="boton" onClick={() => ir(paso + 1)}>
                {paso === ULTIMO - 1 ? "Terminar" : "Siguiente"}
              </button>
            )}
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
