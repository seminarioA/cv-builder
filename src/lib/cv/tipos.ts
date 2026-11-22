// Datos de un CV (el perfil de una persona). Las plantillas solo deciden cómo se ven;
// todas leen esta misma forma.
import { MODALIDADES, type Modalidad } from "./lugares.ts";
import { leerHabilidad, NIVELES, type Habilidad } from "./habilidades.ts";
import { leerEmpresa } from "./fechas.ts";

export type Educacion = {
  id: string;
  institucion: string;
  titulo: string;
  ciudad: string;
  pais: string;
  inicio: string; // año, "2022"
  fin: string; // año, "" si no hay
  actual: boolean; // «Presente»
};

export type GrupoHabilidades = { id: string; titulo: string; items: Habilidad[] };

export type Experiencia = {
  id: string;
  empresa: string;
  ruc: string; // opcional; en el CV sale «Empresa (RUC: …)»
  cargo: string;
  ciudad: string;
  pais: string;
  modalidad: Modalidad;
  inicio: string; // "2025-03"
  fin: string; // "2025-08", "" si no hay
  actual: boolean; // «Actualidad»
  mostrarDuracion: boolean; // «(6 meses)»
  logros: string[];
};

export type Publicacion = { id: string; titulo: string; enlace: string };

export type Titulos = {
  perfil: string;
  educacion: string;
  habilidades: string;
  experiencia: string;
  publicaciones: string;
};

export type DatosCV = {
  nombre: string;
  enlaceNombre: string; // p. ej. LinkedIn; el nombre del documento enlaza aquí
  correo: string;
  telefono: string;
  perfil: string;
  educacion: Educacion[];
  habilidades: GrupoHabilidades[];
  experiencia: Experiencia[];
  publicaciones: Publicacion[];
  titulos: Titulos;
};

export const TITULOS_POR_DEFECTO: Titulos = {
  perfil: "Perfil Profesional",
  educacion: "Educación",
  habilidades: "Habilidades",
  experiencia: "Experiencia",
  publicaciones: "Publicaciones",
};

export function nuevoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const CV_VACIO: DatosCV = {
  nombre: "",
  enlaceNombre: "",
  correo: "",
  telefono: "",
  perfil: "",
  educacion: [],
  habilidades: [],
  experiencia: [],
  publicaciones: [],
  titulos: TITULOS_POR_DEFECTO,
};

export const nuevaEducacion = (): Educacion => ({
  id: nuevoId(),
  institucion: "",
  titulo: "",
  ciudad: "",
  pais: "Perú",
  inicio: "",
  fin: "",
  actual: false,
});

export const nuevaExperiencia = (): Experiencia => ({
  id: nuevoId(),
  empresa: "",
  ruc: "",
  cargo: "",
  ciudad: "",
  pais: "Perú",
  modalidad: "",
  inicio: "",
  fin: "",
  actual: false,
  mostrarDuracion: true,
  logros: [],
});

// Lo guardado puede venir de una versión anterior: completa lo que falte.
export function normalizarCV(x: unknown): DatosCV {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const si = (v: unknown, defecto = false) => (typeof v === "boolean" ? v : defecto);
  const lista = <T,>(v: unknown, f: (e: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.filter((e) => e && typeof e === "object").map((e) => f(e as Record<string, unknown>)) : [];
  const textos = (v: unknown) => (Array.isArray(v) ? v.map(texto) : []);
  const año = (v: unknown) => (/^\d{4}$/.test(texto(v)) ? texto(v) : "");
  const mes = (v: unknown) => (/^\d{4}-\d{2}$/.test(texto(v)) ? texto(v) : "");
  const modalidad = (v: unknown): Modalidad => ((MODALIDADES as readonly string[]).includes(texto(v)) ? (texto(v) as Modalidad) : "");
  const titulos = (o.titulos && typeof o.titulos === "object" ? o.titulos : {}) as Record<string, unknown>;
  return {
    nombre: texto(o.nombre),
    enlaceNombre: texto(o.enlaceNombre),
    correo: texto(o.correo),
    telefono: texto(o.telefono),
    perfil: texto(o.perfil),
    educacion: lista(o.educacion, (e) => ({
      id: texto(e.id) || nuevoId(),
      institucion: texto(e.institucion),
      titulo: texto(e.titulo),
      ciudad: texto(e.ciudad),
      pais: texto(e.pais),
      inicio: año(e.inicio),
      fin: año(e.fin),
      actual: si(e.actual),
    })),
    habilidades: lista(o.habilidades, (e) => ({
      id: texto(e.id) || nuevoId(),
      titulo: texto(e.titulo),
      items: Array.isArray(e.items)
        ? e.items.map((h): Habilidad => {
            if (typeof h === "string") return leerHabilidad(h, nuevoId());
            const r = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
            const nivel = texto(r.nivel);
            return {
              id: texto(r.id) || nuevoId(),
              nombre: texto(r.nombre),
              nivel: (NIVELES as readonly string[]).includes(nivel) ? nivel : "",
              detalle: texto(r.detalle),
            };
          })
        : [],
    })),
    experiencia: lista(o.experiencia, (e) => ({
      id: texto(e.id) || nuevoId(),
      // Datos de antes de que el RUC tuviera su campo: «Empresa (RUC: …)» se separa.
      ...(texto(e.ruc) ? { empresa: texto(e.empresa), ruc: texto(e.ruc) } : leerEmpresa(texto(e.empresa))),
      cargo: texto(e.cargo),
      ciudad: texto(e.ciudad),
      pais: texto(e.pais),
      modalidad: modalidad(e.modalidad),
      inicio: mes(e.inicio),
      fin: mes(e.fin),
      actual: si(e.actual),
      mostrarDuracion: si(e.mostrarDuracion, true),
      logros: textos(e.logros),
    })),
    publicaciones: lista(o.publicaciones, (e) => ({ id: texto(e.id) || nuevoId(), titulo: texto(e.titulo), enlace: texto(e.enlace) })),
    titulos: {
      perfil: texto(titulos.perfil) || TITULOS_POR_DEFECTO.perfil,
      educacion: texto(titulos.educacion) || TITULOS_POR_DEFECTO.educacion,
      habilidades: texto(titulos.habilidades) || TITULOS_POR_DEFECTO.habilidades,
      experiencia: texto(titulos.experiencia) || TITULOS_POR_DEFECTO.experiencia,
      publicaciones: texto(titulos.publicaciones) || TITULOS_POR_DEFECTO.publicaciones,
    },
  };
}
