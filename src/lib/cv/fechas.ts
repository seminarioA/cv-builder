// Textos de fechas y ubicaciones tal como salen en el CV.
// Experiencia: «Marzo 2025 – Agosto 2025 (6 meses)» o «Enero 2026 – Actualidad».
// Educación: «2022 - Presente» o «2018 - 2022».

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// "2025-03" → { año: 2025, mes: 3 }
export function partes(ym: string): { año: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const mes = Number(m[2]);
  return mes >= 1 && mes <= 12 ? { año: Number(m[1]), mes } : null;
}

function mesAño(ym: string): string {
  const p = partes(ym);
  return p ? `${MESES[p.mes - 1]} ${p.año}` : "";
}

// Meses contados de forma inclusiva: marzo a agosto son 6 meses.
export function duracion(inicio: string, fin: string): string {
  const a = partes(inicio);
  const b = partes(fin);
  if (!a || !b) return "";
  const total = (b.año - a.año) * 12 + (b.mes - a.mes) + 1;
  if (total < 1) return "";
  const años = Math.floor(total / 12);
  const meses = total % 12;
  const tA = años === 1 ? "1 año" : `${años} años`;
  const tM = meses === 1 ? "1 mes" : `${meses} meses`;
  return años && meses ? `${tA} y ${tM}` : años ? tA : tM;
}

export function fechasExperiencia(x: { inicio: string; fin: string; actual: boolean; mostrarDuracion: boolean }): string {
  const ini = mesAño(x.inicio);
  if (!ini) return "";
  if (x.actual) return `${ini} – Actualidad`;
  const fin = mesAño(x.fin);
  if (!fin) return ini;
  const d = x.mostrarDuracion ? duracion(x.inicio, x.fin) : "";
  return `${ini} – ${fin}${d ? ` (${d})` : ""}`;
}

export function fechasEducacion(x: { inicio: string; fin: string; actual: boolean }): string {
  if (!x.inicio) return "";
  if (x.actual) return `${x.inicio} - Presente`;
  return x.fin ? `${x.inicio} - ${x.fin}` : x.inicio;
}

// «ProEducate (RUC: 20614177641)» → empresa y RUC por separado.
export function leerEmpresa(s: string): { empresa: string; ruc: string } {
  const m = /^(.*?)\s*\(\s*RUC\s*:?\s*([\d-]+)\s*\)\s*$/i.exec(s.trim());
  return m ? { empresa: m[1].trim(), ruc: m[2] } : { empresa: s.trim(), ruc: "" };
}

// «ProEducate (RUC: 20614177641)», o solo el nombre si no hay RUC.
export function empresaConRuc(x: { empresa: string; ruc: string }): string {
  const ruc = x.ruc.trim();
  return ruc ? `${x.empresa.trim()} (RUC: ${ruc})` : x.empresa.trim();
}

export function ubicacion(x: { ciudad: string; pais: string; modalidad?: string }): string {
  const lugar = [x.ciudad.trim(), x.pais.trim()].filter(Boolean).join(", ");
  if (!x.modalidad) return lugar;
  return lugar ? `${lugar} (${x.modalidad})` : x.modalidad;
}
